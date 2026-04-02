// src/components/layout/SidebarLayout.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardCheck,
  ListChecks,
  RotateCcw,
  Users,
  UserSearch,
  Trophy,
  UsersRound,
  MessageCircle,
  Leaf,
  BarChart3,
  BookOpen,
  Wind,
  Moon,
  Timer,
  Dumbbell,
  GraduationCap,
  Brain,
  Settings as SettingsIcon,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Shield,
} from "lucide-react";
import NotificationBell from "../notifications/NotificationBell";
import VaraLogo from "../../assets/logo/vara-logo.png";
import AIChatWidget from "../ai/AIChatWidget";
import Footer from "./Footer";
import { useAdmin } from "../../hooks/useAdmin";

// Navigation structure matching mobile's 4-tab architecture
const navSections = [
  {
    id: "home",
    label: "Home",
    items: [
      { path: "/dashboard", label: "Home", icon: LayoutDashboard },
    ],
  },
  {
    id: "rhythms",
    label: "Rhythms",
    items: [
      { path: "/rhythms", label: "Habits", icon: ListChecks },
      { path: "/rhythms?tab=routines", label: "Routines", icon: RotateCcw },
    ],
  },
  {
    id: "community",
    label: "Community",
    items: [
      { path: "/community", label: "Feed", icon: Users },
      { path: "/community/people", label: "People", icon: UserSearch },
      { path: "/community/challenges", label: "Challenges", icon: Trophy },
      { path: "/community/groups", label: "Groups", icon: UsersRound },
      { path: "/community/messages", label: "Messages", icon: MessageCircle },
    ],
  },
  {
    id: "wellness",
    label: "Wellness",
    items: [
      { path: "/insights", label: "Insights", icon: BarChart3 },
      { path: "/journal", label: "Journal", icon: BookOpen },
      { path: "/library/breathwork", label: "Breathwork", icon: Wind },
      { path: "/library/sleep", label: "Sleep", icon: Moon },
      { path: "/focus", label: "Focus", icon: Timer },
      { path: "/library/movement", label: "Movement", icon: Dumbbell },
      { path: "/masterclass", label: "Masterclass", icon: GraduationCap },
      { path: "/brain-health", label: "Brain Health", icon: Brain },
      { path: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export default function SidebarLayout({ children }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useAdmin();

  const bottomItems = [
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const isActive = (pathname, itemPath) => {
    // Strip query strings for comparison
    const cleanPath = itemPath.split("?")[0];
    if (itemPath === "/community") return pathname === "/community";
    if (itemPath === "/community/people") return pathname === "/community/people";
    if (itemPath === "/community/challenges") return pathname.startsWith("/community/challenges");
    if (itemPath === "/community/groups") return pathname.startsWith("/community/groups") || pathname.startsWith("/group/");
    if (itemPath === "/community/messages") return pathname.startsWith("/community/messages") || pathname.startsWith("/messages");
    // Rhythms tabs: match based on query param
    if (itemPath === "/rhythms") return pathname === "/rhythms" && !location.search.includes("tab=routines");
    if (itemPath === "/rhythms?tab=routines") return pathname === "/rhythms" && location.search.includes("tab=routines");
    return pathname === cleanPath || pathname.startsWith(cleanPath + "/");
  };

  const NavLink = ({ item }) => {
    const Icon = item.icon;
    const active = isActive(location.pathname, item.path);
    return (
      <li>
        <Link
          to={item.path}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-vara-lg transition-all duration-200 ${
            active
              ? "bg-teal-light text-evergreen-teal font-semibold"
              : "text-soft-charcoal hover:bg-dew-sage-light hover:text-evergreen-teal"
          }`}
          aria-current={active ? "page" : undefined}
        >
          <Icon size={20} className="flex-shrink-0" />
          {!collapsed && (
            <span className="text-vara-sm truncate">{item.label}</span>
          )}
        </Link>
      </li>
    );
  };

  const sidebarContent = (
    <>
      {/* Logo Header */}
      <div className="p-vara-base border-b border-divider">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={VaraLogo}
              alt="Vara Logo"
              className="h-10 w-10 rounded-vara-lg object-cover flex-shrink-0"
            />
            {!collapsed && (
              <div>
                <h1 className="text-vara-lg font-semibold text-soft-charcoal">Vara</h1>
                <p className="text-vara-xs text-muted-sage-gray">Brain Health</p>
              </div>
            )}
          </div>
          {!collapsed && <NotificationBell />}
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navSections.map((section) => (
          <div key={section.id} className="mb-vara-base">
            {!collapsed && (
              <h2 className="px-3 mb-vara-xs text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wide">
                {section.label}
              </h2>
            )}
            {collapsed && <div className="border-b border-divider mb-2 mx-2" />}
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.path} item={item} />
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Bottom Items */}
      <div className="border-t border-divider px-3 py-3">
        <ul className="space-y-0.5">
          {bottomItems.map((item) => (
            <NavLink key={item.path} item={item} />
          ))}
        </ul>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-divider hidden lg:block">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-vara-md hover:bg-dew-sage-light transition-colors text-muted-sage-gray"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-mist-white">
      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-divider h-header flex items-center px-vara-base justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-vara-md hover:bg-dew-sage-light text-soft-charcoal"
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <img
            src={VaraLogo}
            alt="Vara"
            className="h-8 w-8 rounded-vara-md object-cover"
          />
          <span className="text-vara-base font-semibold text-soft-charcoal">Vara</span>
        </div>
        <NotificationBell />
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-overlay"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-white flex flex-col shadow-vara-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-vara-base border-b border-divider">
              <div className="flex items-center gap-3">
                <img
                  src={VaraLogo}
                  alt="Vara Logo"
                  className="h-10 w-10 rounded-vara-lg object-cover"
                />
                <div>
                  <h1 className="text-vara-lg font-semibold text-soft-charcoal">Vara</h1>
                  <p className="text-vara-xs text-muted-sage-gray">Brain Health</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {navSections.map((section) => (
                <div key={section.id} className="mb-vara-base">
                  <h2 className="px-3 mb-vara-xs text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wide">
                    {section.label}
                  </h2>
                  <ul className="space-y-0.5">
                    {section.items.map((item) => (
                      <NavLink key={item.path} item={item} />
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
            <div className="border-t border-divider px-3 py-3">
              <ul className="space-y-0.5">
                {bottomItems.map((item) => (
                  <NavLink key={item.path} item={item} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-divider transition-all duration-300 ease-in-out flex-shrink-0 ${
          collapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col lg:pt-0 pt-header">
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </main>

      {/* Global AI chat widget */}
      <AIChatWidget />
    </div>
  );
}
