import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

const MAX_INLINE_IMAGE_SIZE = 2000;

const sanitizeUser = (user) => {
  if (!user) return user;
  const sanitized = { ...user };
  if (typeof sanitized.avatar === 'string' && sanitized.avatar.startsWith('data:image')) {
    if (sanitized.avatar.length > MAX_INLINE_IMAGE_SIZE) {
      delete sanitized.avatar;
    }
  }
  return sanitized;
};

const sanitizeAuthPayload = (payload) => {
  if (!payload) return payload;
  return {
    ...payload,
    user: sanitizeUser(payload.user),
  };
};

const buildMinimalAuth = (payload) => ({
  user: payload?.user
    ? {
        id: payload.user.id,
        username: payload.user.username,
        email: payload.user.email,
        name: payload.user.name,
        role: payload.user.role,
        permissions: payload.user.permissions,
        companyId: payload.user.companyId,
      }
    : null,
  company: payload?.company
    ? {
        id: payload.company.id,
        name: payload.company.name,
        paymentStatus: payload.company.paymentStatus,
        subscriptionStatus: payload.company.subscriptionStatus,
        subscriptionPlan: payload.company.subscriptionPlan,
      }
    : null,
  token: payload?.token || null,
  paymentPending: !!payload?.paymentPending,
  plan: payload?.plan,
});

const safeSetAuth = (payload) => {
  const sanitized = sanitizeAuthPayload(payload);
  try {
    localStorage.setItem("auth", JSON.stringify(sanitized));
    return;
  } catch (err) {
    try {
      const minimal = buildMinimalAuth(sanitized);
      localStorage.removeItem("auth");
      localStorage.setItem("auth", JSON.stringify(minimal));
      return;
    } catch (error) {
      try {
        const minimal = buildMinimalAuth(sanitized);
        sessionStorage.setItem("auth", JSON.stringify(minimal));
      } catch (e) {
        // Ignore
      }
    }
  }
};

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
      const stored = localStorage.getItem("auth") || sessionStorage.getItem("auth");
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
          error.plan = data.plan;
          throw error;
        }
        throw new Error(data.error || "Signup failed");
      }

      // If signup is successful, we set the state but mark as payment pending
      setUser(data.user);
      setCompany(data.company);
      setIsPaymentPending(true);
      // We don't set the token yet to prevent dashboard access
      
      safeSetAuth({
        user: data.user,
        company: data.company,
        token: null, // Ensure token is null until payment
        paymentPending: true,
        plan,
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const login = async (username, password) => {
    try {
      setError(null);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = null;
      const text = await res.text();
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: "Resposta inválida do servidor" };
      }

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      if (!data) {
        throw new Error("Resposta inválida do servidor");
      }
      
      // If payment is pending, don't set token but save company info
      if (data.paymentPending) {
        setUser(data.user);
        setCompany(data.company);
        setIsPaymentPending(true);
        // Store pending payment info
        safeSetAuth({
          user: data.user,
          company: data.company,
          token: null,
          paymentPending: true,
        });
        return data;
      }
      
      setToken(data.token);
      setUser(data.user);
      setCompany(data.company);
      setIsPaymentPending(false);
      safeSetAuth(data);
      
      // Invalidate queries to refresh data after login
      try {
        const { queryClient } = await import("@/lib/queryClient");
        queryClient.invalidateQueries();
      } catch (e) {
        // Ignore
      }
      
      return data;
    } catch (err) {
      const message = err.name === 'AbortError' ? 'Tempo esgotado ao conectar ao servidor' : err.message;
      setError(message);
      throw new Error(message);
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
        const sanitizedUser = { ...current.user, ...newUserData };
        if (sanitizedUser?.avatar && typeof sanitizedUser.avatar === 'string' && sanitizedUser.avatar.startsWith('data:image')) {
          if (sanitizedUser.avatar.length > 2000) {
            delete sanitizedUser.avatar;
          }
        }
        // Preserve token and other critical info
        safeSetAuth({
          ...current,
          user: sanitizedUser,
        });
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
