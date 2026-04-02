// src/pages/Wellness.jsx
// Wellness Hub — mirrors mobile MoreMenuScreen (4th tab).
// Personalized tools hub with profile hero, brain health strip, tools grid, and account links.

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../components/layout/SidebarLayout';
import { useAuth } from '../context/AuthContext';
import {
  BarChart3,
  BookOpen,
  Wind,
  Moon,
  Timer,
  Dumbbell,
  GraduationCap,
  Brain,
  Settings,
  HelpCircle,
  ChevronRight,
  Pencil,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    label: 'Insights',
    to: '/insights',
    icon: BarChart3,
    subtitle: 'Your wellness analytics',
  },
  {
    label: 'Journal',
    to: '/journal',
    icon: BookOpen,
    subtitle: 'Reflect with AI-guided prompts',
  },
  {
    label: 'Breathwork',
    to: '/library/breathwork',
    icon: Wind,
    subtitle: 'Guided breathing exercises',
  },
  {
    label: 'Sleep',
    to: '/library/sleep',
    icon: Moon,
    subtitle: 'Rest & recovery tools',
  },
  {
    label: 'Focus',
    to: '/focus',
    icon: Timer,
    subtitle: 'Set a focused window for deep work',
  },
  {
    label: 'Movement',
    to: '/library/movement',
    icon: Dumbbell,
    subtitle: 'Exercise & mobility routines',
  },
  {
    label: 'Masterclass',
    to: '/masterclass',
    icon: GraduationCap,
    subtitle: 'Expert wellness education',
  },
  {
    label: 'Brain Health',
    to: '/brain-health',
    icon: Brain,
    subtitle: 'Track your cognitive wellness',
  },
];

const ACCOUNT_ITEMS = [
  {
    label: 'Settings',
    to: '/settings',
    icon: Settings,
  },
  {
    label: 'Help & Support',
    to: null,
    icon: HelpCircle,
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function ToolCard({ label, to, icon: Icon, subtitle }) {
  return (
    <Link
      to={to}
      className="bg-white rounded-vara-lg border border-divider p-vara-base hover:shadow-vara-md transition flex flex-col gap-vara-sm"
    >
      <div className="flex items-center justify-between">
        <div className="bg-dew-sage/40 w-10 h-10 rounded-full flex items-center justify-center shrink-0">
          <Icon size={18} className="text-evergreen-teal" />
        </div>
        <ChevronRight size={16} className="text-muted-sage-gray" />
      </div>
      <div>
        <p className="text-vara-sm font-semibold text-soft-charcoal">{label}</p>
        <p className="text-vara-xs text-muted-sage-gray leading-snug">{subtitle}</p>
      </div>
    </Link>
  );
}

function AccountRow({ label, to, icon: Icon, isLast }) {
  const inner = (
    <div
      className={`flex items-center gap-vara-base py-vara-base px-vara-base ${
        !isLast ? 'border-b border-divider' : ''
      }`}
    >
      <div className="bg-dew-sage/40 w-9 h-9 rounded-full flex items-center justify-center shrink-0">
        <Icon size={16} className="text-evergreen-teal" />
      </div>
      <span className="flex-1 text-vara-sm font-medium text-soft-charcoal">{label}</span>
      <ChevronRight size={16} className="text-muted-sage-gray" />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block hover:bg-dew-sage/20 transition">
        {inner}
      </Link>
    );
  }

  // Placeholder with no destination yet
  return (
    <button className="w-full text-left hover:bg-dew-sage/20 transition" disabled>
      {inner}
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Wellness() {
  const { user } = useAuth();

  const displayName = user?.displayName || user?.email || 'there';
  const firstName = displayName.split(' ')[0];
  const avatarLetter = firstName.charAt(0).toUpperCase();
  const email = user?.email || '';
  const greeting = useMemo(() => getGreeting(), []);

  return (
    <SidebarLayout>
      <div className="max-w-2xl mx-auto px-vara-base py-vara-lg space-y-vara-lg">

        {/* ── Profile Hero ── */}
        <div className="flex items-center gap-vara-base">
          {/* Avatar */}
          <div className="w-avatar-lg h-avatar-lg rounded-full bg-evergreen-teal text-white flex items-center justify-center text-vara-xl font-bold shrink-0">
            {avatarLetter}
          </div>

          {/* Name + email */}
          <div className="flex-1 min-w-0">
            <p className="text-vara-lg font-semibold text-soft-charcoal truncate">
              Good {greeting}, {firstName}
            </p>
            <p className="text-vara-sm text-muted-sage-gray truncate">{email}</p>
          </div>

          {/* Edit profile button */}
          <Link
            to="/profile/edit"
            aria-label="Edit profile"
            className="w-9 h-9 rounded-full border border-divider flex items-center justify-center hover:bg-dew-sage/30 transition shrink-0"
          >
            <Pencil size={15} className="text-muted-sage-gray" />
          </Link>
        </div>

        {/* ── Brain Health Insight Strip ── */}
        <div className="bg-gradient-to-r from-dew-sage/60 to-dew-sage rounded-vara-lg px-vara-base py-vara-md flex items-center gap-vara-sm">
          <div className="w-8 h-8 rounded-full bg-evergreen-teal/20 flex items-center justify-center shrink-0">
            <Brain size={16} className="text-evergreen-teal" />
          </div>
          <p className="text-vara-sm text-soft-charcoal font-medium leading-snug">
            Stay curious. Your brain thanks you.
          </p>
        </div>

        {/* ── YOUR TOOLS ── */}
        <section>
          <p className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wider mb-vara-sm px-vara-2xs">
            Your Tools
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-vara-sm">
            {TOOLS.map((tool) => (
              <ToolCard key={tool.to} {...tool} />
            ))}
          </div>
        </section>

        {/* ── ACCOUNT ── */}
        <section>
          <p className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wider mb-vara-sm px-vara-2xs">
            Account
          </p>
          <div className="bg-white rounded-vara-lg border border-divider overflow-hidden">
            {ACCOUNT_ITEMS.map((item, idx) => (
              <AccountRow
                key={item.label}
                {...item}
                isLast={idx === ACCOUNT_ITEMS.length - 1}
              />
            ))}
          </div>
        </section>

      </div>
    </SidebarLayout>
  );
}
