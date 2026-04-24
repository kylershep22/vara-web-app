import React, { useState, useEffect, useMemo } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { BookOpen, Sparkles, Pencil, Trash2, Plus, Search, X } from 'lucide-react';
import { db } from '../firebase';
import {
  addDoc, collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { useAIConsent } from '../context/AIConsentContext';
import { authedPost } from '../lib/apiClient';

// 5-level mood config matching mobile
const MOODS = [
  { value: 'great',     label: 'Great',     color: 'bg-emerald-500' },
  { value: 'good',      label: 'Good',      color: 'bg-green-400' },
  { value: 'okay',      label: 'Okay',      color: 'bg-yellow-400' },
  { value: 'low',       label: 'Low',       color: 'bg-orange-400' },
  { value: 'difficult', label: 'Difficult', color: 'bg-red-400' },
];

function getMoodDotClass(value) {
  return MOODS.find(m => m.value === value)?.color || 'bg-gray-300';
}

function getMoodLabel(value) {
  return MOODS.find(m => m.value === value)?.label || value || '';
}

export default function Journal() {
  const { user } = useAuth();
  const { hasConsent, requireConsent } = useAIConsent();

  // Data
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  // Form fields (inside modal)
  const [formContent, setFormContent] = useState('');
  const [formMood, setFormMood] = useState('okay');
  const [formTags, setFormTags] = useState([]);
  const [formTagInput, setFormTagInput] = useState('');
  const [formSaving, setFormSaving] = useState(false);

  // AI prompts
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(false);

  // Weekly summary
  const [weeklySummary, setWeeklySummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Search & filter
  const [search, setSearch] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Detail view
  const [detailEntry, setDetailEntry] = useState(null);

  useEffect(() => {
    if (user) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchEntries = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'journalEntries'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt || Timestamp.now(),
      }));
      // Sort newest first on client
      rows.sort((a, b) => safeToDate(b.createdAt) - safeToDate(a.createdAt));
      setEntries(rows);
      if (hasConsent) fetchWeeklySummary(rows);
    } catch (err) {
      console.error('Journal fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch weekly summary once consent is granted mid-session
  useEffect(() => {
    if (hasConsent && entries.length > 0 && !weeklySummary && !summaryLoading) {
      fetchWeeklySummary(entries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasConsent]);

  const fetchWeeklySummary = async (allEntries) => {
    const cutoff = Date.now() - 7 * 86400000;
    const week = allEntries
      .filter(e => safeToDate(e.createdAt) >= cutoff)
      .map(e => e.content || e.text || '')
      .filter(Boolean);
    if (!week.length) {
      setWeeklySummary('');
      return;
    }
    setSummaryLoading(true);
    try {
      const res = await authedPost(`${process.env.REACT_APP_API_URL}/api/journal-summary`, {
        entries: week.join('\n'),
        type: 'journal',
        guardrails: true,
        instruction: 'Write a 3–5 sentence factual recap. Reference only observed details. One gentle, actionable suggestion at the end.'
      });
      const data = await res.json();
      setWeeklySummary(data?.text || '');
    } catch (err) {
      console.error('Weekly summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // ---- Modal helpers ----
  const openCreateModal = () => {
    setEditingEntry(null);
    setFormContent('');
    setFormMood('okay');
    setFormTags([]);
    setFormTagInput('');
    setAiSuggestions([]);
    setModalOpen(true);
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setFormContent(entry.content || entry.text || '');
    setFormMood(entry.mood || 'okay');
    setFormTags(entry.tags || []);
    setFormTagInput('');
    setAiSuggestions([]);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEntry(null);
  };

  // ---- AI Prompts ----
  const runInspireMe = async () => {
    setLoadingPrompts(true);
    try {
      const res = await authedPost(`${process.env.REACT_APP_API_URL}/api/journal-prompt`, {
        prompt: 'Give 3 concise, meaningful daily journaling prompts. Return them as a JSON array of strings, no other text.'
      });
      const data = await res.json();
      let prompts = [];
      try {
        prompts = JSON.parse(data.text || '[]');
      } catch {
        // If not valid JSON, split by newline
        prompts = (data.text || '').split('\n').map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(Boolean).slice(0, 3);
      }
      setAiSuggestions(prompts.slice(0, 3));
    } catch (err) {
      console.error('AI prompt error:', err);
    } finally {
      setLoadingPrompts(false);
    }
  };

  const handleInspireMe = () => requireConsent(runInspireMe);

  const handleSelectPrompt = (suggestion) => {
    setFormContent(prev => prev.trim() ? `${prev}\n\n${suggestion}` : suggestion);
  };

  // ---- Tags ----
  const addFormTag = () => {
    if (!formTagInput.trim()) return;
    const cleaned = formTagInput.trim().toLowerCase();
    if (!formTags.includes(cleaned)) setFormTags(prev => [...prev, cleaned]);
    setFormTagInput('');
  };

  // ---- Save / Delete ----
  const saveEntry = async () => {
    if (!formContent.trim()) return;
    setFormSaving(true);
    try {
      const payload = {
        userId: user.uid,
        content: formContent,
        mood: formMood,
        tags: formTags,
        createdAt: editingEntry ? editingEntry.createdAt : Timestamp.now(),
        updatedAt: Timestamp.now(),
        entryType: 'freeform',
      };
      if (editingEntry) {
        await updateDoc(doc(db, 'journalEntries', editingEntry.id), payload);
      } else {
        await addDoc(collection(db, 'journalEntries'), payload);
      }
      closeModal();
      fetchEntries();
    } catch (err) {
      console.error('Save entry error:', err);
    } finally {
      setFormSaving(false);
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm('Delete this journal entry?')) return;
    await deleteDoc(doc(db, 'journalEntries', id));
    if (detailEntry?.id === id) setDetailEntry(null);
    fetchEntries();
  };

  // ---- Derived data ----
  const allTags = useMemo(() => {
    const counts = {};
    entries.forEach(e => (e.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(e => {
        const text = (e.content || e.text || '').toLowerCase();
        return text.includes(q) || (e.tags || []).some(t => t.toLowerCase().includes(q));
      });
    }
    if (filterTag) {
      result = result.filter(e => (e.tags || []).includes(filterTag));
    }
    return result;
  }, [entries, search, filterTag]);

  const hasRecentEntries = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return entries.some(e => safeToDate(e.createdAt) >= cutoff);
  }, [entries]);

  const groupedEntries = useMemo(() => groupByDate(filteredEntries), [filteredEntries]);

  return (
    <SidebarLayout>
      <div className="p-vara-lg max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-vara-sm">
              <BookOpen size={24} className="text-evergreen-teal" />
              <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Journal</h1>
            </div>
            <p className="text-vara-sm text-muted-sage-gray mt-1">Reflect on your wellness journey</p>
          </div>
          <div className="flex items-center gap-vara-sm">
            <button
              onClick={() => setShowSearch(s => !s)}
              className="p-2 rounded-full text-muted-sage-gray hover:text-evergreen-teal hover:bg-dew-sage transition"
              aria-label="Toggle search"
            >
              <Search size={18} />
            </button>
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1 bg-evergreen-teal text-white px-vara-base py-2 rounded-full text-vara-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={16} /> New Entry
            </button>
          </div>
        </div>

        {/* Collapsible search */}
        {showSearch && (
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search entries..."
              className="w-full border border-divider rounded-vara-lg px-4 py-2 text-vara-sm pr-8"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-sage-gray hover:text-soft-charcoal"
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                className={`px-3 py-1 rounded-full text-vara-xs font-medium transition ${
                  filterTag === tag
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-dew-sage text-evergreen-teal hover:opacity-80'
                }`}
              >
                #{tag}
              </button>
            ))}
            {filterTag && (
              <button
                onClick={() => setFilterTag('')}
                className="px-3 py-1 rounded-full text-vara-xs text-muted-sage-gray border border-divider hover:bg-dew-sage transition"
              >
                Clear filter
              </button>
            )}
          </div>
        )}

        {/* AI Weekly Summary card */}
        {!loading && hasRecentEntries && (
          <div className="bg-mist-white border border-divider rounded-vara-lg p-vara-base shadow-vara-sm">
            <h3 className="text-vara-sm font-semibold text-evergreen-teal mb-2">Weekly Reflection</h3>
            {hasConsent === false ? (
              <>
                <p className="text-vara-sm text-muted-sage-gray">
                  Enable AI features to see a weekly reflection on your entries.
                </p>
                <button
                  type="button"
                  onClick={() => requireConsent(() => fetchWeeklySummary(entries))}
                  className="mt-3 inline-flex items-center gap-1.5 bg-evergreen-teal text-white text-vara-sm font-medium px-vara-base py-2 rounded-full hover:opacity-90 transition"
                >
                  <Sparkles size={14} /> Enable AI
                </button>
              </>
            ) : summaryLoading ? (
              <p className="text-vara-sm text-muted-sage-gray italic">Generating your weekly summary...</p>
            ) : weeklySummary ? (
              <p className="text-vara-sm text-soft-charcoal whitespace-pre-wrap">{weeklySummary}</p>
            ) : (
              <p className="text-vara-sm text-muted-sage-gray italic">Add a few entries this week to unlock your personalized summary.</p>
            )}
          </div>
        )}

        {/* Gentle encouragement card (no recent entries) */}
        {!loading && !hasRecentEntries && entries.length === 0 && (
          <div className="bg-dew-sage/40 border border-silver-sage rounded-vara-lg p-vara-lg text-center">
            <p className="text-vara-base font-medium text-evergreen-teal mb-1">Welcome to your journal</p>
            <p className="text-vara-sm text-soft-charcoal">Taking time to reflect is an act of self-care. Start with a single thought.</p>
            <button
              onClick={openCreateModal}
              className="mt-vara-base inline-flex items-center gap-1 bg-evergreen-teal text-white px-vara-base py-2 rounded-full text-vara-sm font-medium hover:opacity-90 transition"
            >
              <Plus size={15} /> Write first entry
            </button>
          </div>
        )}

        {/* Entry list grouped by date */}
        {!loading && filteredEntries.length > 0 && (
          <div className="space-y-6">
            {groupedEntries.map(({ label, items }) => (
              <div key={label}>
                <h2 className="text-vara-xs font-semibold text-muted-sage-gray uppercase tracking-wider mb-3">{label}</h2>
                <div className="space-y-3">
                  {items.map(entry => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onView={() => setDetailEntry(entry)}
                      onEdit={() => openEditModal(entry)}
                      onDelete={() => deleteEntry(entry.id)}
                      onTagClick={tag => setFilterTag(filterTag === tag ? '' : tag)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty filtered state */}
        {!loading && filteredEntries.length === 0 && entries.length > 0 && (
          <div className="bg-white border border-divider rounded-vara-lg p-vara-lg text-center text-vara-sm text-muted-sage-gray">
            No entries match your search or filter.
          </div>
        )}

        {loading && (
          <div className="text-center text-vara-sm text-muted-sage-gray py-12">Loading journal...</div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-vara-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-vara-lg space-y-4">
              <h2 className="text-vara-lg font-semibold text-evergreen-teal">
                {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
              </h2>

              {/* Mood selector */}
              <div>
                <p className="text-vara-sm text-muted-sage-gray mb-2">How are you feeling?</p>
                <div className="flex gap-2 flex-wrap">
                  {MOODS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setFormMood(m.value)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-vara-md border text-vara-sm transition ${
                        formMood === m.value
                          ? 'border-evergreen-teal bg-dew-sage text-evergreen-teal font-medium'
                          : 'border-divider text-soft-charcoal hover:bg-dew-sage/50'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${m.color}`} />
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Inspire Me button */}
              <button
                onClick={handleInspireMe}
                disabled={loadingPrompts}
                className="w-full flex items-center justify-center gap-2 border border-evergreen-teal text-evergreen-teal py-2 rounded-vara-md text-vara-sm font-medium hover:bg-dew-sage/50 transition disabled:opacity-50"
              >
                <Sparkles size={16} />
                {loadingPrompts ? 'Loading...' : 'Inspire Me'}
              </button>

              {/* AI suggestion chips */}
              {aiSuggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectPrompt(s)}
                      className="bg-dew-sage text-evergreen-teal text-vara-xs px-3 py-1.5 rounded-full border border-evergreen-teal/25 hover:opacity-80 transition text-left"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}

              {/* Content textarea */}
              <div>
                <p className="text-vara-sm text-muted-sage-gray mb-2">What's on your mind?</p>
                <textarea
                  value={formContent}
                  onChange={e => setFormContent(e.target.value)}
                  placeholder="Write your thoughts..."
                  rows={8}
                  className="w-full border border-divider rounded-vara-lg p-3 text-vara-sm text-soft-charcoal resize-none focus:outline-none focus:border-evergreen-teal"
                />
              </div>

              {/* Tags input */}
              <div>
                <p className="text-vara-sm text-muted-sage-gray mb-2">Tags (optional)</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formTagInput}
                    onChange={e => setFormTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addFormTag()}
                    placeholder="Add a tag"
                    className="flex-1 border border-divider rounded-vara-md px-3 py-2 text-vara-sm focus:outline-none focus:border-evergreen-teal"
                  />
                  <button
                    onClick={addFormTag}
                    disabled={!formTagInput.trim()}
                    className="bg-evergreen-teal text-white px-4 py-2 rounded-vara-md text-vara-sm disabled:opacity-50 hover:opacity-90 transition"
                  >
                    Add
                  </button>
                </div>
                {formTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formTags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 bg-dew-sage text-evergreen-teal text-vara-xs px-3 py-1 rounded-full">
                        #{tag}
                        <button onClick={() => setFormTags(prev => prev.filter(t => t !== tag))} className="ml-1 hover:opacity-70">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={closeModal}
                  className="flex-1 border border-divider rounded-vara-md py-2.5 text-vara-sm text-soft-charcoal hover:bg-dew-sage/50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEntry}
                  disabled={formSaving || !formContent.trim()}
                  className="flex-1 bg-evergreen-teal text-white rounded-vara-md py-2.5 text-vara-sm font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {formSaving ? 'Saving...' : editingEntry ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailEntry && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDetailEntry(null)}>
          <div className="bg-white rounded-vara-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-vara-lg space-y-4">
              <div className="flex items-center justify-between border-b border-divider pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${getMoodDotClass(detailEntry.mood)}`} />
                  <span className="text-vara-sm text-muted-sage-gray">{getMoodLabel(detailEntry.mood)}</span>
                </div>
                <div className="text-right">
                  <p className="text-vara-sm font-medium text-evergreen-teal">{formatDate(detailEntry.createdAt)}</p>
                  <p className="text-vara-xs text-muted-sage-gray">{formatTime(detailEntry.createdAt)}</p>
                </div>
              </div>

              <p className="text-soft-charcoal text-vara-sm whitespace-pre-wrap leading-relaxed">
                {detailEntry.content || detailEntry.text || ''}
              </p>

              {(detailEntry.tags || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {detailEntry.tags.map(tag => (
                    <span key={tag} className="bg-dew-sage text-evergreen-teal text-vara-xs px-3 py-1 rounded-full">#{tag}</span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setDetailEntry(null); openEditModal(detailEntry); }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-divider rounded-vara-md py-2.5 text-vara-sm text-soft-charcoal hover:bg-dew-sage/50 transition"
                >
                  <Pencil size={14} /> Edit
                </button>
                <button
                  onClick={() => deleteEntry(detailEntry.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-divider rounded-vara-md py-2.5 text-vara-sm text-red-500 hover:bg-red-50 transition"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              <button
                onClick={() => setDetailEntry(null)}
                className="w-full bg-evergreen-teal text-white rounded-vara-md py-2.5 text-vara-sm font-medium hover:opacity-90 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

/* ---- Sub-components ---- */

function EntryCard({ entry, onView, onEdit, onDelete, onTagClick }) {
  const preview = (entry.content || entry.text || '').slice(0, 160);
  const hasMore = (entry.content || entry.text || '').length > 160;

  return (
    <div
      className="bg-white border border-divider rounded-vara-lg p-vara-base shadow-vara-sm cursor-pointer hover:border-evergreen-teal/40 transition"
      onClick={onView}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          {entry.mood && (
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getMoodDotClass(entry.mood)}`} />
          )}
          <span className="text-vara-xs text-muted-sage-gray">{formatDate(entry.createdAt)}, {formatTime(entry.createdAt)}</span>
        </div>
        <div className="flex gap-2 ml-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={onEdit}
            className="text-vara-xs text-evergreen-teal flex items-center gap-0.5 hover:underline"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={onDelete}
            className="text-vara-xs text-red-400 flex items-center gap-0.5 hover:underline"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <p className="text-soft-charcoal text-vara-sm whitespace-pre-wrap leading-relaxed">
        {preview}{hasMore && <span className="text-muted-sage-gray">…</span>}
      </p>

      {(entry.tags || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2" onClick={e => e.stopPropagation()}>
          {entry.tags.map(tag => (
            <button
              key={tag}
              onClick={() => onTagClick(tag)}
              className="bg-dew-sage text-evergreen-teal text-vara-xs px-2 py-0.5 rounded-full hover:opacity-80"
            >
              #{tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---- Helpers ---- */

function safeToDate(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return isNaN(d.getTime()) ? new Date() : d;
  } catch {
    return new Date();
  }
}

function formatDate(ts) {
  return safeToDate(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts) {
  return safeToDate(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getDateGroup(ts) {
  const now = new Date();
  const d = safeToDate(ts);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const entryDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today - entryDay) / 86400000);

  if (entryDay.getTime() === today.getTime()) return 'Today';
  if (entryDay.getTime() === yesterday.getTime()) return 'Yesterday';
  if (diffDays <= 6) return 'This Week';
  if (diffDays <= 13) return 'Last Week';
  return d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function groupByDate(entries) {
  const groups = {};
  const order = [];
  entries.forEach(entry => {
    const label = getDateGroup(entry.createdAt);
    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(entry);
  });
  return order.map(label => ({ label, items: groups[label] }));
}
