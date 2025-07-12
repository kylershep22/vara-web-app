import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  Target,
  Repeat,
  Heart,
  Brain,
  Moon,
  BookOpen,
  Bot,
  User,
  Users
} from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import VaraLogo from "../../assets/logo/vara-logo.png"; // ✅ Logo import

export default function SidebarLayout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/goals", label: "Goals", icon: Target },
    { path: "/habits", label: "Habits", icon: Repeat },
    { path: "/daily", label: "Daily Wellness", icon: Heart },
    { path: "/library", label: "Wellness Library", icon: Brain },
    { path: "/sleep", label: "Sleep & Recovery", icon: Moon },
    { path: "/journal", label: "Journal", icon: BookOpen },
    { path: "/ai", label: "AI Companion", icon: Bot },
    { path: "/community", label: "Community", icon: Users },
    { path: "/profile", label: "Profile", icon: User }
  ];

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <div
        className={`bg-white border-r border-[#D5E3D1] shadow-xl transition-all duration-300 ease-in-out ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="p-6 border-b border-[#D5E3D1]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={VaraLogo}
                alt="Vara Logo"
                className="h-10 w-10 rounded-xl object-cover"
              />
              {!collapsed && (
                <div>
                  <h1 className="text-xl font-bold text-[#3E3E3E]">Vara</h1>
                  <p className="text-sm text-[#9AAE8C]">Your journey</p>
                </div>
              )}
            </div>
            {!collapsed && <NotificationBell />}
          </div>
        </div>

        <nav className="flex-1 px-4 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] text-white shadow-lg"
                        : "text-[#3E3E3E] hover:bg-[#D5E3D1] hover:text-[#1B5E57]"
                    }`}
                  >
                    <Icon size={20} />
                    {!collapsed && (
                      <span className="font-medium text-sm">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-[#D5E3D1]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-[#D5E3D1] transition-colors"
          >
            <span className="text-sm text-[#1B5E57] font-medium">
              {collapsed ? ">" : "<"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-[#F3F4EF] overflow-auto">{children}</main>
    </div>
  );
}





