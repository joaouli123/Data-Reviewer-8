import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if payment is pending from state and localStorage
  const [isPaymentPending, setIsPaymentPending] = useState(() => {
    if (typeof window === 'undefined') return false;
    const auth = localStorage.getItem("auth");
    if (!auth) return false;
    try {
      return JSON.parse(auth).paymentPending || false;
    } catch (e) {
      return false;
    }
  });

  // Load from localStorage on mount
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem("auth");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (!parsed.paymentPending) {
            setToken(parsed.token || (token ? token : null)); // Mantém token se já existir
            setIsPaymentPending(false);
          } else {
            setIsPaymentPending(true);
          }
          setUser(parsed.user);
          setCompany(parsed.company);
        } catch (e) {
          localStorage.removeItem("auth");
        }
      }
    };

    handleStorageChange();
    window.addEventListener('storage', handleStorageChange);
    setLoading(false);

    return () => window.removeEventListener('storage', handleStorageChange);
  }, [token]);

  const signup = async (companyName, companyDocument, username, email, password, name, plan, addressData = {}) => {
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
          ...addressData
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

      // If signup is successful, we set the state but mark as payment pending
      setUser(data.user);
      setCompany(data.company);
      setIsPaymentPending(true);
      // We don't set the token yet to prevent dashboard access
      
      localStorage.setItem("auth", JSON.stringify({ 
        user: data.user, 
        company: data.company, 
        token: null, // Ensure token is null until payment
        paymentPending: true,
        plan 
      }));
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
        setIsPaymentPending(true);
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
      setIsPaymentPending(false);
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
    // Clear storage first
    localStorage.removeItem("auth");
    sessionStorage.clear();
    
    // Clear queryClient cache
    try {
      const { queryClient } = await import("@/lib/queryClient");
      queryClient.clear();
    } catch (e) {
      // Ignore
    }

    // Clear state to trigger re-renders - React will handle navigation
    setToken(null);
    setUser(null);
    setCompany(null);
    setIsPaymentPending(false);
  };

  const updateUser = (newUserData) => {
    setUser(prev => {
      const updated = prev ? { ...prev, ...newUserData } : newUserData;
      return updated;
    });
    
    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const current = JSON.parse(authData);
        // Preserve token and other critical info
        localStorage.setItem("auth", JSON.stringify({ 
          ...current, 
          user: {
            ...current.user,
            ...newUserData
          }
        }));
      } catch (e) {
        console.error("Error updating localStorage auth:", e);
      }
    }
  };

  // Remove the old constant that wasn't reactive
  // const paymentPending = ...

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
        isAuthenticated: !!token || isPaymentPending,
        paymentPending: isPaymentPending,
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
