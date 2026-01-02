import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("auth");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Only set token if not pending payment
        if (!parsed.paymentPending) {
          setToken(parsed.token);
        }
        setUser(parsed.user);
        setCompany(parsed.company);
      } catch (e) {
        localStorage.removeItem("auth");
      }
    }
    setLoading(false);
  }, []);

  const signup = async (companyName, companyDocument, username, email, password, name, plan) => {
    try {
      setError(null);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyDocument,
          username,
          email,
          password,
          name,
          plan,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle duplicate scenarios specially
        if (data.type === "DUPLICATE_PAID") {
          const error = new Error("DUPLICATE_PAID: " + (data.error || "Company already exists"));
          throw error;
        } else if (data.type === "DUPLICATE_PENDING") {
          const error = new Error("DUPLICATE_PENDING: " + (data.error || "Company exists with pending payment"));
          error.companyId = data.companyId;
          throw error;
        }
        throw new Error(data.error || "Signup failed");
      }

      setToken(data.token);
      setUser(data.user);
      setCompany(data.company);
      localStorage.setItem("auth", JSON.stringify({ ...data, plan }));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (username, password) => {
    try {
      setError(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Login failed");
      }

      const data = await res.json();
      
      // If payment is pending, don't set token but save company info
      if (data.paymentPending) {
        setUser(data.user);
        setCompany(data.company);
        // Store pending payment info
        localStorage.setItem("auth", JSON.stringify({
          user: data.user,
          company: data.company,
          token: null,
          paymentPending: true
        }));
        return data;
      }
      
      setToken(data.token);
      setUser(data.user);
      setCompany(data.company);
      localStorage.setItem("auth", JSON.stringify(data));
      
      // Invalidate queries to refresh data after login
      try {
        const { queryClient } = await import("@/lib/queryClient");
        queryClient.invalidateQueries();
      } catch (e) {
        // Ignore
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    // Immediate state update for fast UI feedback
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.clear();
    sessionStorage.clear();

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }

    // Secondary cleanup tasks (don't block the redirect)
    try {
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.clear();
    } catch (e) {
      // Ignore
    }
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    const authData = localStorage.getItem("auth");
    if (authData) {
      const current = JSON.parse(authData);
      localStorage.setItem("auth", JSON.stringify({ ...current, user: newUserData }));
    }
  };

  // Check if payment is pending from localStorage
  const paymentPending = typeof window !== 'undefined' ? localStorage.getItem("auth") ? JSON.parse(localStorage.getItem("auth"))?.paymentPending : false : false;

  return (
    <AuthContext.Provider
      value={{
        user: user ? {
          ...user,
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : (user.permissions || {})
        } : null,
        company,
        token,
        loading,
        error,
        signup,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token || paymentPending,
        paymentPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
