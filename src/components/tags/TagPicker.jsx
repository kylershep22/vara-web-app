// src/components/tags/TagPicker.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";

/**
 * TagPicker
 * A normalized tag selector with chips + autosuggest backed by Firestore.
 *
 * Firestore shape (collection: "tags"):
 * {
 *   slug: "yoga",
 *   label: "Yoga",
 *   category: "interest" | "focus",
 *   synonyms: ["hatha", "vinyasa"],
 *   emoji: "🧘",
 *   active: true
 * }
 *
 * Props:
 * - category: "interest" | "focus"           (required)
 * - selectedSlugs: string[]                   (required, can be [])
 * - onChange: (slugs: string[]) => void       (required)
 * - placeholder?: string
 * - max?: number                              (default 12)
 * - disabled?: boolean
 * - className?: string                        (wrapper class)
 */
export default function TagPicker({
  category,
  selectedSlugs = [],
  onChange,
  placeholder = "Search…",
  max = 12,
  disabled = false,
  className = "",
}) {
  const [allTags, setAllTags] = useState([]);
  const [qStr, setQStr] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Load tags once per category
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const q1 = query(
          collection(db, "tags"),
          where("category", "==", category),
          where("active", "==", true),
          orderBy("label"),
          limit(500)
        );
        const snap = await getDocs(q1);
        if (!mounted) return;
        const tags = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setAllTags(tags);
      } catch (e) {
        console.error("Tag load failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [category]);

  const filtered = useMemo(() => {
    const s = qStr.trim().toLowerCase();
    if (!s) return allTags.slice(0, 24);
    return allTags
      .filter((t) => {
        const lbl = (t.label || "").toLowerCase();
        const sym = (t.synonyms || []).map((x) => (x || "").toLowerCase());
        return lbl.includes(s) || sym.some((m) => m.includes(s));
      })
      .slice(0, 24);
  }, [qStr, allTags]);

  const labelFor = (slug) =>
    allTags.find((t) => t.slug === slug)?.label || slug;

  const emojiFor = (slug) =>
    allTags.find((t) => t.slug === slug)?.emoji || "";

  const add = (slug) => {
    if (disabled) return;
    if (!slug) return;
    if (selectedSlugs.includes(slug)) return;
    if (selectedSlugs.length >= max) return;
    onChange([...selectedSlugs, slug]);
    setQStr("");
    setActiveIdx(-1);
    // keep list open for rapid selection if user keeps typing
    inputRef.current?.focus();
  };

  const remove = (slug) => {
    if (disabled) return;
    onChange(selectedSlugs.filter((s) => s !== slug));
    inputRef.current?.focus();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      setActiveIdx(0);
      return;
    }
    if (!open) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => {
        const next = i + 1;
        return next >= filtered.length ? 0 : next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => {
        const prev = i - 1;
        return prev < 0 ? Math.max(filtered.length - 1, 0) : prev;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIdx]) add(filtered[activeIdx].slug);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target) &&
        inputRef.current &&
        !inputRef.current.contains(e.target)
      ) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedSlugs.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs"
          >
            <span>
              {emojiFor(slug)} {labelFor(slug)}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={() => remove(slug)}
                className="hover:text-red-600"
                aria-label={`Remove ${labelFor(slug)}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}
        {selectedSlugs.length === 0 && (
          <span className="text-xs text-gray-500">
            No {category === "focus" ? "focus areas" : "interests"} selected yet.
          </span>
        )}
      </div>

      {/* Input */}
      <div className="relative">
        <input
          ref={inputRef}
          value={qStr}
          onChange={(e) => {
            setQStr(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="tagpicker-listbox"
          className={`w-full px-3 py-2 border border-[#D5E3D1] rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
            disabled ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
        />

        {/* Dropdown */}
        {open && (
          <div
            ref={listRef}
            id="tagpicker-listbox"
            role="listbox"
            className="absolute z-10 mt-1 w-full bg-white border border-[#D5E3D1] rounded-xl shadow-sm max-h-64 overflow-auto"
          >
            {loading && (
              <div className="p-3 text-sm text-gray-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </div>
            )}

            {!loading && filtered.length === 0 && (
              <div className="p-3 text-sm text-gray-500">No matches.</div>
            )}

            {!loading &&
              filtered.map((t, idx) => {
                const isSelected = selectedSlugs.includes(t.slug);
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={t.slug}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(-1)}
                    onClick={() => add(t.slug)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 ${
                      isActive ? "bg-[#F3F4EF]" : "hover:bg-[#F3F4EF]"
                    }`}
                  >
                    <span className="text-lg">{t.emoji || "🏷️"}</span>
                    <span className="text-sm text-[#3E3E3E]">{t.label}</span>
                    {isSelected ? (
                      <span className="ml-auto text-xs text-emerald-700">Added</span>
                    ) : (
                      <Plus className="w-4 h-4 ml-auto text-[#1B5E57]" />
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>

      <div className="mt-1 text-[11px] text-gray-500">
        {selectedSlugs.length}/{max} selected
      </div>
    </div>
  );
}
