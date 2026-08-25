"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";

interface User {
  user_id: string;
  role: "admin" | "marketer";
  email?: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/user/auth/me");
      if (response.data?.data) {
        setUser({
          user_id: response.data.data.user_id,
          role: response.data.data.role,
          email: response.data.data.email || response.data.data.user?.email,
          name: response.data.data.user?.name,
        });
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/api/user/auth/login", { email, password });
    if (res.data) {
      if (res.data.access_token && typeof window !== "undefined") {
        localStorage.setItem("marketing-token", res.data.access_token);
      }
      await fetchSession();
    }
    return res.data;
  };

  const logout = async () => {
    try {
      await api.get("/api/user/auth/logout");
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("marketing-token");
      }
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser: fetchSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
