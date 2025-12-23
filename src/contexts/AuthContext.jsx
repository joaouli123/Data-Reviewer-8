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
        setToken(parsed.token);
        setUser(parsed.user);
        setCompany(parsed.company);
      } catch (e) {
        localStorage.removeItem("auth");
      }
    }
    setLoading(false);
  }, []);

  const signup = async (companyName, companyDocument, username, email, password, name) => {
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
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Signup failed");
      }

      const data = await res.json();
      setToken(data.token);
      setUser(data.user);
      setCompany(data.company);
      localStorage.setItem("auth", JSON.stringify(data));
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
      setToken(data.token);
      setUser(data.user);
      setCompany(data.company);
      localStorage.setItem("auth", JSON.stringify(data));
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const logout = async () => {
    // Importar queryClient aqui para evitar circular dependency
    const { queryClient } = await import("@/lib/queryClient");
    
    // Limpar todo o cache do React Query
    queryClient.clear();
    
    // Remover dados locais
    setToken(null);
    setUser(null);
    setCompany(null);
    localStorage.removeItem("auth");
  };

  const updateUser = (newUserData) => {
    setUser(newUserData);
    const authData = localStorage.getItem("auth");
    if (authData) {
      const current = JSON.parse(authData);
      localStorage.setItem("auth", JSON.stringify({ ...current, user: newUserData }));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        company,
        token,
        loading,
        error,
        signup,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token,
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
