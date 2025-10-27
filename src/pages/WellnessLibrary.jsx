// src/pages/WellnessLibrary.jsx (revamped)
// — Drop-in replacement for your current WellnessLibrary page —
// Highlights:
// • Hero + Featured collection
// • Global search with fuzzy filtering
// • Category chips (Breathwork, Movement, Mindset, Nutrition, Sleep)
// • Content-type filters (All, Articles, Video, Audio, Tools)
// • Sort control (Newest, Popular, Length)
// • "Continue learning" row (recent items)
// • Responsive, accessible cards with quick actions (Save/Share)
// • Minimal local state; easy to swap in Firestore later

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import {
  Library,
  Search,
  Filter,
  Sparkles,
  Clock,
  Headphones,
  PlayCircle,
  BookOpen,
  Dumbbell,
  Wind,
  Moon,
  Utensils,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

// =====================
// Mock data (swap with Firestore later)
// =====================
const MOCK_ITEMS = [
  {
    id: "bw-box-breathing",
    title: "Box Breathing (4-4-4-4)",
    summary: "A 5-minute reset to lower stress quickly.",
    category: "Breathwork",
    type: "Audio",
    minutes: 5,
    popularity: 92,
    link: "/library/breathwork/box-breathing",
  },
  {
    id: "bw-co2-tolerance",
    title: "CO₂ Tolerance Drill",
    summary: "Improve breath control and endurance.",
    category: "Breathwork",
    type: "Article",
    minutes: 6,
    popularity: 78,
    link: "/library/breathwork/co2-tolerance",
  },
  {
    id: "mv-micro-mobility",
    title: "Micro-Mobility Break (Desk)",
    summary: "7-minute mobility flow for posture and energy.",
    category: "Movement",
    type: "Video",
    minutes: 7,
    popularity: 88,
    link: "/library/movement/micro-mobility",
  },
  {
    id: "ms-reframing",
    title: "Reframing Stress with 2-Minute Audit",
    summary: "A mindset tool to turn pressure into performance.",
    category: "Mindset",
    type: "Article",
    minutes: 4,
    popularity: 84,
    link: "/library/mindset/reframing-stress",
  },
  {
    id: "nt-protein-basics",
    title: "Protein Basics: How Much, When, Why",
    summary: "A quick guide to daily protein targets.",
    category: "Nutrition",
    type: "Article",
    minutes: 8,
    popularity: 73,
    link: "/library/nutrition/protein-basics",
  },
  {
    id: "sl-sleep-winddown",
    title: "Wind-Down Routine (No Screens)",
    summary: "15-minute pre-sleep ritual for deeper rest.",
    category: "Sleep",
    type: "Tool",
    minutes: 15,
    popularity: 69,
    link: "/sleep-recovery/winddown",
  },
  {
    id: "ms-identity-habit",
    title: "Identity-Based Habits (Starter)",
    summary: "Tie habits to who you are becoming.",
    category: "Mindset",
    type: "Audio",
    minutes: 9,
    popularity: 81,
    link: "/library/mindset/identity-habits",
  },
  {
    id: "mv-hips-reset",
    title: "Hips & Lower Back Reset",
    summary: "10-minute flow for stiffness relief.",
    category: "Movement",
    type: "Video",
    minutes: 10,
    popularity: 90,
    link: "/library/movement/hips-reset",
  },
];

const CATEGORIES = [
  { key: "All", icon: Library },
  { key: "Breathwork", icon: Wind },
  { key: "Movement", icon: Dumbbell },
  { key: "Mindset", icon: BookOpen },
  { key: "Nutrition", icon: Utensils },
  { key: "Sleep", icon: Moon }, // Routes to Sleep & Recovery where applicable
];

const TYPES = ["All", "Article", "Video", "Audio", "Tool"];
const SORTS = [
  { key: "Newest", value: "newest" },
  { key: "Popular", value: "popular" },
  { key: "Length: Short → Long", value: "short" },
  { key: "Length: Long → Short", value: "long" },
];

// Small helper to format minutes
const minLabel = (m) => `${m} min`;

export default function WellnessLibrary() {
  // =====================
  // Local state
  // =====================
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeType, setActiveType] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [saved, setSaved] = useState(() => new Set()); // bookmark state (local)

  // Simulated "continue" list — in real app derive from user progress
  const continueItems = MOCK_ITEMS.filter((i) => ["bw-box-breathing", "mv-micro-mobility"].includes(i.id));

  // =====================
  // Derived list (search + filters + sort)
  // =====================
  const filtered = useMemo(() => {
    let list = [...MOCK_ITEMS];

    // Category
    if (activeCategory !== "All") {
      list = list.filter((i) => i.category === activeCategory);
    }

    // Type
    if (activeType !== "All") {
      list = list.filter((i) => i.type === activeType);
    }

    // Search (very light-weight)
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.summary.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    // Sort
    switch (sortBy) {
      case "short":
        list.sort((a, b) => a.minutes - b.minutes);
        break;
      case "long":
        list.sort((a, b) => b.minutes - a.minutes);
        break;
      case "popular":
        list.sort((a, b) => b.popularity - a.popularity);
        break;
      case "newest":
      default:
        // Without createdAt, fall back to popularity as proxy
        list.sort((a, b) => b.popularity - a.popularity);
        break;
    }

    return list;
  }, [activeCategory, activeType, query, sortBy]);

  const toggleSave = (id) => {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Library size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#2E2F2E]">Wellness Library</h1>
        </div>
        <p className="text-[#748B72] mb-6">
          Evidence-informed, bite-sized lessons you can apply today: breathwork, movement,
          mindset, nutrition, and more.
        </p>

        {/* Hero / Featured */}
        <div className="relative overflow-hidden rounded-3xl border border-[#D5E3D1] bg-gradient-to-br from-[#F6FBF7] to-white p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-[#1B5E57] text-sm font-medium bg-white border border-[#B8CDBA] px-3 py-1 rounded-full">
                <Sparkles size={16} /> Featured Pathway
              </div>
              <h2 className="text-xl md:text-2xl font-semibold text-[#2E2F2E] mt-3">
                10 Days to a Calmer Baseline
              </h2>
              <p className="text-[#5C6F5F] mt-2 max-w-2xl">
                A short, science-backed sequence mixing breathwork, micro-mobility, and mindset
                tools. Track progress and feel the difference in under two weeks.
              </p>
              <div className="mt-4 flex items-center gap-3 text-sm text-[#5C6F5F]">
                <Clock size={16} /> ~10–15 min/day
                <span className="w-1 h-1 rounded-full bg-[#B8CDBA]" />
                <TrendingUp size={16} /> Beginner → Intermediate
              </div>
              <div className="mt-5">
                <Link
                  to="/library/pathways/calm-10"
                  className="inline-flex items-center gap-2 bg-[#1B5E57] text-white px-4 py-2 rounded-xl shadow hover:bg-[#154B46] transition"
                >
                  Start Pathway <ChevronRight size={18} />
                </Link>
              </div>
            </div>
            <div className="min-w-[240px] self-start md:self-auto">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Wind, label: "Breath", stat: "+5" },
                  { icon: Dumbbell, label: "Move", stat: "+4" },
                  { icon: BookOpen, label: "Mindset", stat: "+5" },
                ].map((b, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#D5E3D1] rounded-2xl p-4 text-center"
                  >
                    <b.icon className="mx-auto text-[#1B5E57]" size={22} />
                    <div className="mt-2 text-sm font-medium text-[#2E2F2E]">{b.label}</div>
                    <div className="text-xs text-[#5C6F5F]">{b.stat} sessions</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="library-search" className="sr-only">Search library</label>
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A8E7C]" />
              <input
                id="library-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search topics, tools, or titles…"
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-[#D5E3D1] focus:outline-none focus:ring-2 focus:ring-[#B8CDBA] bg-white"
              />
            </div>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-[#7A8E7C]" />
            <select
              aria-label="Sort library"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-[#D5E3D1] rounded-xl px-3 py-2 text-sm bg-white"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.key}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {CATEGORIES.map(({ key, icon: Icon }) => {
            const active = activeCategory === key;
            return (
              <button
                key={key}
                onClick={() => setActiveCategory(key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition ${
                  active
                    ? "bg-[#1B5E57] text-white border-[#1B5E57]"
                    : "bg-white text-[#2E2F2E] border-[#D5E3D1] hover:border-[#B8CDBA]"
                }`}
              >
                <Icon size={16} /> {key}
              </button>
            );
          })}
        </div>

        {/* Type filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {TYPES.map((t) => {
            const active = activeType === t;
            return (
              <button
                key={t}
                onClick={() => setActiveType(t)}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  active
                    ? "bg-[#E8F3EA] text-[#1B5E57] border-[#B8CDBA]"
                    : "bg-white text-[#2E2F2E] border-[#D5E3D1] hover:border-[#B8CDBA]"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Continue Learning */}
        {continueItems.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#2E2F2E]">Continue learning</h2>
              <Link to="/library/saved" className="text-sm text-[#1B5E57] hover:underline">
                View all saved
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {continueItems.map((item) => (
                <ContinueCard key={item.id} item={item} onSave={() => toggleSave(item.id)} saved={saved.has(item.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Results grid */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-[#2E2F2E]">Browse {activeCategory === "All" ? "everything" : activeCategory.toLowerCase()}</h2>
          <div className="text-sm text-[#5C6F5F]">{filtered.length} item{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center border border-dashed border-[#D5E3D1] rounded-2xl py-16">
            <p className="text-[#5C6F5F]">
              No matches. Try a different search, category, or type.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <LibraryCard
                key={item.id}
                item={item}
                saved={saved.has(item.id)}
                onSave={() => toggleSave(item.id)}
              />
            ))}
          </div>
        )}

        {/* Sleep routing note */}
        <div className="mt-10 text-xs text-[#7A8E7C]">
          Sleep stories and soundscapes now live in <Link to="/sleep-recovery" className="text-[#1B5E57] underline">Sleep & Recovery</Link>.
        </div>
      </div>
    </SidebarLayout>
  );
}

// =====================
// Components
// =====================
function TypePill({ type }) {
  const map = {
    Article: { Icon: BookOpen, label: "Article" },
    Video: { Icon: PlayCircle, label: "Video" },
    Audio: { Icon: Headphones, label: "Audio" },
    Tool: { Icon: Clock, label: "Tool" },
  };
  const M = map[type] || map["Article"];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-[#F2F7F2] border border-[#D5E3D1] text-[#2E2F2E]">
      <M.Icon size={14} /> {M.label}
    </span>
  );
}

function LibraryCard({ item, onSave, saved }) {
  return (
    <div className="group bg-white border border-[#D5E3D1] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#B8CDBA] transition h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={item.link} className="block">
            <h3 className="text-base font-semibold text-[#2E2F2E] group-hover:text-[#1B5E57]">
              {item.title}
            </h3>
          </Link>
          <div className="mt-1 flex items-center gap-2 text-xs text-[#5C6F5F]">
            <TypePill type={item.type} />
            <span className="w-1 h-1 bg-[#B8CDBA] rounded-full" />
            <span>{item.category}</span>
            <span className="w-1 h-1 bg-[#B8CDBA] rounded-full" />
            <span>{minLabel(item.minutes)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onSave}
            aria-label={saved ? "Unsave" : "Save"}
            className={`p-2 rounded-lg border transition ${
              saved
                ? "bg-[#1B5E57] border-[#1B5E57] text-white"
                : "bg-white border-[#D5E3D1] text-[#2E2F2E] hover:border-[#B8CDBA]"
            }`}
          >
            {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: item.title, url: window.location.origin + item.link });
              } else {
                navigator.clipboard.writeText(window.location.origin + item.link);
                alert("Link copied to clipboard");
              }
            }}
            aria-label="Share"
            className="p-2 rounded-lg border bg-white border-[#D5E3D1] text-[#2E2F2E] hover:border-[#B8CDBA] transition"
          >
            <Share2 size={16} />
          </button>
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-[#5C6F5F] mt-3 flex-1">{item.summary}</p>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-[#5C6F5F]">Popularity: {item.popularity}</div>
        <Link
          to={item.link}
          className="inline-flex items-center gap-1.5 text-sm text-[#1B5E57] hover:underline"
        >
          Open <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}

function ContinueCard({ item, onSave, saved }) {
  return (
    <div className="bg-white border border-[#D5E3D1] rounded-2xl p-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <Link to={item.link} className="block">
          <div className="text-sm font-semibold text-[#2E2F2E] truncate">{item.title}</div>
        </Link>
        <div className="text-xs text-[#5C6F5F] mt-1 flex items-center gap-2">
          <TypePill type={item.type} />
          <span className="w-1 h-1 bg-[#B8CDBA] rounded-full" />
          <span>{item.category}</span>
          <span className="w-1 h-1 bg-[#B8CDBA] rounded-full" />
          <span>{minLabel(item.minutes)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onSave}
          aria-label={saved ? "Unsave" : "Save"}
          className={`p-2 rounded-lg border transition ${
            saved
              ? "bg-[#1B5E57] border-[#1B5E57] text-white"
              : "bg-white border-[#D5E3D1] text-[#2E2F2E] hover:border-[#B8CDBA]"
          }`}
        >
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        </button>
        <Link
          to={item.link}
          className="inline-flex items-center gap-1.5 text-sm bg-[#1B5E57] text-white px-3 py-1.5 rounded-lg hover:bg-[#154B46]"
        >
          Resume <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}




