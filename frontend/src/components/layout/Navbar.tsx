"use client";

import React from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { UserCheck, Shield, Sun, Moon } from "lucide-react";

export const Navbar: React.FC = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-40 transition-colors">
      <div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Admin Operations Dashboard</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Real-time Analytics, Redis Caching & Bot Protection</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? (
            <>
              <Moon className="w-4 h-4 text-slate-700" />
              <span className="hidden sm:inline">Dark Theme</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Theme</span>
            </>
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700">
            {user.role === "admin" ? (
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{user.role}</span>
          </div>
        )}
      </div>
    </header>
  );
};
