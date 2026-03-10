// src/pages/Profile/EditProfile.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../../components/layout/SidebarLayout";
import { Camera, Edit3, X, AlertCircle, Plus } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  limit,
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

const defaultProfile = {
  displayName: "",
  bio: "",
  // legacy fields (kept for backwards-compat/UI display elsewhere)
  interests: [],
  goals: [],
  // new normalized, query-friendly fields:
  interestsSlugs: [], // e.g., ["yoga","running"]
  focusSlugs: [], // e.g., ["sleep","stress"]
  location: "",
  privacy: "public", // "public" | "connections" | "private"
  searchable: true,
  avatarUrl: "",
  bannerUrl: "",
  keywords: [],
};

const avatarFor = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User"
  )}&background=10b981&color=fff`;

export default function EditProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const [profile, setProfile] = useState(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user?.uid) return;
      setLoading(true);
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setProfile((p) => ({
            ...p,
            ...defaultProfile,
            ...data,
            // ensure arrays exist
            interests: data.interests || [],
            goals: data.goals || [],
            interestsSlugs: data.interestsSlugs || [],
            focusSlugs: data.focusSlugs || [],
            displayName: data.displayName || user.displayName || "",
          }));
        } else {
          setProfile((p) => ({
            ...p,
            displayName: user.displayName || "",
          }));
        }
      } catch (e) {
        console.error("Failed to load profile", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.uid, user?.displayName]);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    try {
      const storage = getStorage();
      const ref = storageRef(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(ref, file);
      const url = await getDownloadURL(ref);
      setProfile((p) => ({ ...p, avatarUrl: url }));
    } catch (err) {
      console.error("❌ Avatar upload failed:", err);
      alert("Failed to upload avatar. Please try again.");
    }
  };

  // Simple keyword index from name + tag slugs (kept small and lowercased)
  const computeKeywords = (name = "", interestSlugs = [], focusSlugs = []) => {
    const tokens = `${name} ${interestSlugs.join(" ")} ${focusSlugs.join(" ")}`
      .toLowerCase()
      .split(/[\s,]+/);
    const unique = Array.from(new Set(tokens.filter(Boolean)));
    return unique.slice(0, 40);
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!user?.uid) return;

    setSaving(true);
    try {
      const ref = doc(db, "users", user.uid);
      const payload = {
        ...profile,
        displayNameLower: (profile.displayName || "").toLowerCase(),
        keywords: computeKeywords(
          profile.displayName,
          profile.interestsSlugs || [],
          profile.focusSlugs || []
        ),
        updatedAt: serverTimestamp(),
      };

      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, payload);
      } else {
        await setDoc(ref, { ...defaultProfile, ...payload, createdAt: serverTimestamp() });
      }

      // ✅ Go to the *unified* viewer, not the old ProfilePage
      navigate(`/u/${user.uid}`, { replace: true });
    } catch (err) {
      console.error("❌ Error saving profile:", err);
      alert("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-[60vh] flex items-center justify-center text-soft-charcoal">
          Loading…
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="min-h-screen bg-mist-white">
        <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">
          {/* Header */}
          <div className="flex items-center gap-3 mb-vara-lg">
            <Edit3 className="w-5 h-5 text-evergreen-teal" />
            <h1 className="text-vara-xl font-semibold text-soft-charcoal">
              Edit Profile
            </h1>
          </div>

          {/* Card */}
          <form
            onSubmit={handleSave}
            className="bg-white rounded-vara-lg p-vara-lg shadow-vara-sm border border-divider space-y-6"
          >
            {/* Avatar uploader */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={profile.avatarUrl || avatarFor(profile.displayName)}
                  alt="Avatar"
                  className="w-24 h-24 rounded-vara-lg object-cover border-2 border-divider bg-white"
                />
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="absolute -bottom-2 -right-2 bg-evergreen-teal p-2 rounded-vara-md text-white hover:brightness-110 shadow"
                  title="Upload new avatar"
                >
                  <Camera size={16} />
                </button>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="text-vara-sm text-soft-charcoal">
                <p className="font-medium">Your photo</p>
                <p className="text-muted-sage-gray">
                  PNG or JPG up to ~5MB. Square images look best.
                </p>
              </div>
            </div>

            {/* Basic info */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Display Name
              </label>
              <input
                value={profile.displayName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, displayName: e.target.value }))
                }
                required
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                placeholder="How should we show your name?"
              />
            </div>

            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Bio
              </label>
              <textarea
                value={profile.bio}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, bio: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                placeholder="Share your wellness journey…"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                  Location (optional)
                </label>
                <input
                  value={profile.location}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, location: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                  placeholder="City, Country"
                />
              </div>

              <div>
                <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                  Privacy
                </label>
                <select
                  value={profile.privacy}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, privacy: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
                >
                  <option value="public">Public 🌐</option>
                  <option value="connections">Connections 👥</option>
                  <option value="private">Private 🔒</option>
                </select>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="searchable"
                    type="checkbox"
                    checked={!!profile.searchable}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, searchable: e.target.checked }))
                    }
                    className="rounded text-evergreen-teal"
                  />
                  <label htmlFor="searchable" className="text-vara-sm text-soft-charcoal">
                    Allow people to find me in search
                  </label>
                </div>
              </div>
            </div>

            {/* Interests (normalized tag picker) */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Interests
              </label>
              <InlineTagPicker
                category="interest"
                selectedSlugs={profile.interestsSlugs || []}
                onChange={(slugs) =>
                  setProfile((p) => ({ ...p, interestsSlugs: slugs }))
                }
                placeholder="Search interests (e.g., Yoga, Running, Meditation)…"
                max={12}
              />
            </div>

            {/* Focus Areas (normalized tag picker) */}
            <div>
              <label className="block text-vara-sm font-medium text-soft-charcoal mb-1">
                Focus Areas
              </label>
              <InlineTagPicker
                category="focus"
                selectedSlugs={profile.focusSlugs || []}
                onChange={(slugs) =>
                  setProfile((p) => ({ ...p, focusSlugs: slugs }))
                }
                placeholder="Search focus areas (e.g., Sleep, Stress, Anxiety)…"
                max={6}
              />
            </div>

            <div className="flex items-start gap-2 text-vara-xs text-muted-sage-gray">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <p>
                Tip: we index your name + selected tags so people can discover
                you faster. You can change this anytime.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-divider">
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="px-4 py-2 rounded-vara-md bg-dew-sage-light text-soft-charcoal hover:bg-dew-sage"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-vara-md bg-evergreen-teal text-white hover:opacity-90 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}

/**
 * InlineTagPicker
 * - Loads from Firestore collection `tags` where:
 *   { slug, label, category: "interest" | "focus", synonyms?: [], emoji?: "🧘", active?: true }
 */
function InlineTagPicker({
  category,
  selectedSlugs = [],
  onChange,
  placeholder = "Search…",
  max = 12,
}) {
  const [allTags, setAllTags] = useState([]);
  const [qStr, setQStr] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        // Minimal query: filter by category only; no 'active' filter and no orderBy.
        const q1 = query(
          collection(db, "tags"),
          where("category", "==", category),
          limit(200)
        );
        const snap = await getDocs(q1);
        if (!mounted) return;
        const tags = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t) => t.active !== false) // hide only if explicitly false
          .sort((a, b) =>
            (a.label || a.slug || "").localeCompare(b.label || b.slug || "")
          );
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
        const slg = (t.slug || "").toLowerCase();
        const syn = (t.synonyms || []).map((x) => (x || "").toLowerCase());
        return lbl.includes(s) || slg.includes(s) || syn.some((x) => x.includes(s));
      })
      .slice(0, 24);
  }, [qStr, allTags]);

  const add = (slug) => {
    if (selectedSlugs.includes(slug) || selectedSlugs.length >= max) return;
    onChange([...selectedSlugs, slug]);
    setQStr("");
  };

  const remove = (slug) => {
    onChange(selectedSlugs.filter((s) => s !== slug));
  };

  const labelFor = (slug) =>
    allTags.find((t) => t.slug === slug)?.label || slug;
  const emojiFor = (slug) =>
    allTags.find((t) => t.slug === slug)?.emoji || "";

  return (
    <div>
      {/* Selected chips */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedSlugs.map((slug) => (
          <span
            key={slug}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal-light text-evergreen-teal text-vara-xs"
          >
            <span>
              {emojiFor(slug)} {labelFor(slug)}
            </span>
            <button
              type="button"
              onClick={() => remove(slug)}
              className="hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {selectedSlugs.length === 0 && (
          <span className="text-vara-xs text-muted-sage-gray">
            No {category === "focus" ? "focus areas" : "interests"} selected yet.
          </span>
        )}
      </div>

      {/* Search input + results */}
      <div className="relative">
        <input
          value={qStr}
          onChange={(e) => setQStr(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-divider rounded-vara-md focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
        />
        {qStr && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-divider rounded-vara-lg shadow-vara-sm max-h-64 overflow-auto">
            {loading && (
              <div className="p-3 text-vara-sm text-muted-sage-gray">Loading…</div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="p-3 text-vara-sm text-muted-sage-gray">No matches.</div>
            )}
            {!loading &&
              filtered.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => add(t.slug)}
                  className="w-full text-left px-3 py-2 hover:bg-mist-white flex items-center gap-2"
                >
                  <span className="text-lg">{t.emoji || "🏷️"}</span>
                  <span className="text-vara-sm text-soft-charcoal">{t.label}</span>
                  {selectedSlugs.includes(t.slug) ? (
                    <span className="ml-auto text-vara-xs text-evergreen-teal">
                      Added
                    </span>
                  ) : (
                    <Plus className="w-4 h-4 ml-auto text-evergreen-teal" />
                  )}
                </button>
              ))}
          </div>
        )}
      </div>

      <div className="mt-1 text-[11px] text-muted-sage-gray">
        {selectedSlugs.length}/{max} selected
      </div>
    </div>
  );
}

