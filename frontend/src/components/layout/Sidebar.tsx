"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, Users, ShieldAlert, LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, role: ["admin", "marketer"] },
    { label: "Link Manager", href: "/links", icon: Link2, role: ["admin"] },
    { label: "User Manager", href: "/users", icon: Users, role: ["admin"] },
  ];

  const filteredNavItems = navItems.filter((item) =>
    user?.role ? item.role.includes(user.role) : false
  );

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col min-h-screen border-r border-slate-800">
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2 bg-blue-600 rounded-lg text-white font-bold">
          <Link2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-wide text-sm">Marketing Platform</h1>
          <p className="text-xs text-slate-500 font-mono">v1.0.0 · Redis & Mongo</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {filteredNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {user && (
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.email || "Logged In"}</p>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                {user.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
};
