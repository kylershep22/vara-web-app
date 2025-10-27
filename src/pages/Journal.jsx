import React, { useState, useEffect, useRef, useMemo } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  BookOpen, Share2, FileText, Mic, MicOff, Pencil, Trash2, Flame, HelpCircle, Sparkles
} from 'lucide-react';
import { db } from '../firebase';
import {
  addDoc, collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc, orderBy, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Editor } from '@tinymce/tinymce-react';
import axios from 'axios';

export default function Journal() {
  const { user } = useAuth();

  // Tabs: "journal" | "reflections"
  const [activeTab, setActiveTab] = useState('journal');

  // Data
  const [entries, setEntries] = useState([]);          // journalEntries (rich text)
  const [reflections, setReflections] = useState([]);  // journal_entries (now rich text as well)

  // Journal editor state
  const [newEntry, setNewEntry] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [editingId, setEditingId] = useState(null);

  // Reflections composer state (now parity with Journal)
  const [refHtml, setRefHtml] = useState('');
  const [refMood, setRefMood] = useState('');
  const [refTags, setRefTags] = useState([]);
  const [refTagInput, setRefTagInput] = useState('');
  const [refPeriod, setRefPeriod] = useState(() => (new Date().getHours() >= 16 ? 'pm' : 'am'));
  const todayStr = yyyymmdd(new Date());

  // Other UI / analytics
  const [streak, setStreak] = useState(0);
  const [search, setSearch] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState('');

  // Split weekly outputs (journal vs reflections)
  const [journalWeeklyInsight, setJournalWeeklyInsight] = useState('');
  const [journalWeeklySummary, setJournalWeeklySummary] = useState('');
  const [reflectionWeeklyInsight, setReflectionWeeklyInsight] = useState('');
  const [reflectionWeeklySummary, setReflectionWeeklySummary] = useState('');

  useEffect(() => {
    if (user) {
      fetchAllContent();
      const savedDraft = localStorage.getItem('journalDraft');
      if (savedDraft) setNewEntry(savedDraft);
      const savedRefDraft = localStorage.getItem('reflectionDraft');
      if (savedRefDraft) setRefHtml(savedRefDraft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('journalDraft', newEntry);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [newEntry]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('reflectionDraft', refHtml);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [refHtml]);

  const fetchAllContent = async () => {
    if (!user?.uid) return;

    const [journals, refl] = await Promise.all([
      fetchJournalEntries(user.uid),
      fetchReflections(user.uid)
    ]);

    setEntries(journals);
    setReflections(refl);

    const combined = [...journals, ...refl];
    calculateStreak(combined);
    fetchWeeklyBundles(journals, refl);
  };

  // Your existing journals (rich text)
  const fetchJournalEntries = async (uid) => {
    const q = query(
      collection(db, 'journalEntries'),
      where('userId', '==', uid)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        entryType: data.entryType || 'freeform',
        createdAt: data.createdAt || Timestamp.now(),
        isHtml: true
      };
    });
  };

  // Reflections (now rich text + mood + tags) saved in "journal_entries"
  const fetchReflections = async (uid) => {
    try {
      const q = query(
        collection(db, 'journal_entries'),
        where('userId', '==', uid),
        where('entryType', '==', 'reflection')
        // NOTE: no orderBy here to avoid a composite index requirement
      );
      const snapshot = await getDocs(q);
      const rows = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          entryType: 'reflection',
          createdAt: data.createdAt || Timestamp.now(),
          isHtml: true
        };
      });

      // Sort newest first on the client
      rows.sort((a, b) => {
        const at = safeToDate(a.createdAt).getTime();
        const bt = safeToDate(b.createdAt).getTime();
        return bt - at;
      });

      return rows;
    } catch (e) {
      console.error('fetchReflections error:', e);
      return [];
    }
  };

  const calculateStreak = (allEntries) => {
    const dateStrings = new Set(
      allEntries
        .filter(e => e?.createdAt)
        .map(e => {
          try {
            return new Date(e.createdAt.toDate()).toDateString();
          } catch {
            return new Date().toDateString();
          }
        })
    );
    let currentStreak = 0;
    const cursor = new Date();
    while (dateStrings.has(cursor.toDateString())) {
      currentStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    setStreak(currentStreak);
  };

  // Build and request weekly bundles—Journal-only and Reflection-only, with guardrails.
  const fetchWeeklyBundles = async (journalOnly, reflectionOnly) => {
    const last7 = (arr) =>
      arr
        .filter(e => (Date.now() - safeToDate(e.createdAt).getTime()) / 86400000 <= 7)
        .map(e => (e.isHtml ? stripHtml(e.text || '') : (e.text || '')))
        .filter(Boolean);

    const journal7 = last7(journalOnly);
    const refl7 = last7(reflectionOnly);

    try {
      const url = `${process.env.REACT_APP_API_URL}/api/journal-summary`;

      // Journal Insights
      if (journal7.length) {
        const resInsight = await axios.post(url, {
          entries: journal7.join('\n'),
          type: 'journal',
          guardrails: true,
          instruction: [
            'Summarize only what is present in the texts.',
            'Do not invent details.',
            'Prefer short bullets (max 5).',
            'Highlight recurring themes and mood patterns.'
          ].join(' ')
        });
        setJournalWeeklyInsight(resInsight?.data?.text || '');
      } else {
        setJournalWeeklyInsight('');
      }

      // Journal Summary (brief narrative)
      if (journal7.length) {
        const resSummary = await axios.post(url, {
          entries: journal7.join('\n'),
          type: 'journal',
          guardrails: true,
          instruction: [
            'Write a 3–5 sentence factual recap.',
            'Reference only observed details.',
            'One gentle, actionable suggestion at the end.'
          ].join(' ')
        });
        setJournalWeeklySummary(resSummary?.data?.text || '');
      } else {
        setJournalWeeklySummary('');
      }

      // Reflection Insights
      if (refl7.length) {
        const resRInsight = await axios.post(url, {
          entries: refl7.join('\n'),
          type: 'reflection',
          guardrails: true,
          instruction: [
            'Extract micro-patterns from brief AM/PM notes.',
            'Bullet points, max 4.',
            'If AM/PM appears, compare them concisely.'
          ].join(' ')
        });
        setReflectionWeeklyInsight(resRInsight?.data?.text || '');
      } else {
        setReflectionWeeklyInsight('');
      }

      // Reflection Summary
      if (refl7.length) {
        const resRSummary = await axios.post(url, {
          entries: refl7.join('\n'),
          type: 'reflection',
          guardrails: true,
          instruction: [
            'Write 2–4 concise sentences.',
            'Focus on daily tone shifts and quick wins.',
            'Close with one simple suggestion for the next week.'
          ].join(' ')
        });
        setReflectionWeeklySummary(resRSummary?.data?.text || '');
      } else {
        setReflectionWeeklySummary('');
      }
    } catch (err) {
      console.error('Weekly summary error:', err);
    }
  };

  // ------- Journal save / edit -------
  const saveEntry = async () => {
    if (!newEntry.trim()) return;

    const entryData = {
      userId: user.uid,
      text: newEntry,
      mood,
      tags,
      createdAt: Timestamp.now(),
      entryType: 'freeform'
    };

    if (editingId) {
      const entryRef = doc(db, 'journalEntries', editingId);
      await updateDoc(entryRef, entryData);
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'journalEntries'), entryData);
    }

    setNewEntry('');
    setMood('');
    setTags([]);
    localStorage.removeItem('journalDraft');
    setAiGeneratedPrompt('');
    fetchAllContent();
  };

  const deleteEntry = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteDoc(doc(db, 'journalEntries', id));
      fetchAllContent();
    }
  };

  const startEditing = (entry) => {
    setEditingId(entry.id);
    setNewEntry(entry.text);
    setMood(entry.mood || '');
    setTags(entry.tags || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ------- Speech to text (shared handler toggled by a flag) -------
  const handleVoiceInput = (target) => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech Recognition not supported in your browser');
      return;
    }

    if (recording && recognitionRef.current) {
      recognitionRef.current.stop();
      setRecording(false);
      return;
    }

    const recognition = new window.webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      if (target === 'journal') {
        setNewEntry(prev => prev + (prev ? ' ' : '') + transcript);
      } else {
        setRefHtml(prev => prev + (prev ? ' ' : '') + escapeHtml(transcript));
      }
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
    setRecording(true);
  };

  // ------- Tags -------
  const addTag = () => {
    if (!tagInput.trim()) return;
    const cleaned = tagInput.trim().toLowerCase();
    if (!tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };
  const removeTag = (t) => setTags(tags.filter(x => x !== t));

  const addRefTag = () => {
    if (!refTagInput.trim()) return;
    const cleaned = refTagInput.trim().toLowerCase();
    if (!refTags.includes(cleaned)) {
      setRefTags([...refTags, cleaned]);
    }
    setRefTagInput('');
  };
  const removeRefTag = (t) => setRefTags(refTags.filter(x => x !== t));

  // ------- Reflections save (rich) -------
  const saveReflection = async () => {
    if (!user?.uid || !stripHtml(refHtml).trim()) return;
    try {
      const refDoc = await addDoc(collection(db, 'journal_entries'), {
        userId: user.uid,
        entryType: 'reflection',
        text: refHtml,           // store HTML (TinyMCE)
        tags: refTags,
        mood: refMood,
        period: refPeriod,       // 'am' | 'pm'
        yyyymmdd: todayStr,
        createdAt: Timestamp.now()
      });
      console.log('Saved reflection id:', refDoc.id);

      // reset composer
      setRefHtml('');
      setRefMood('');
      setRefTags([]);

      // refresh lists
      fetchAllContent();
    } catch (e) {
      console.error('fetchReflections error:', e);
      return [];
    }
  };

  // ------- Filters / visible list -------
  const combinedEntries = useMemo(() => {
    const merged = [...entries, ...reflections];
    return merged.sort((a, b) => {
      const at = safeToDate(a.createdAt).getTime();
      const bt = safeToDate(b.createdAt).getTime();
      return bt - at;
    });
  }, [entries, reflections]);

  const filterFn = (entry) => {
    const text = entry.isHtml ? stripHtml(entry.text || '') : (entry.text || '');
    const textMatch = text.toLowerCase().includes(search.toLowerCase());
    const moodMatch = filterMood ? (entry.mood === filterMood) : true;
    const tagMatch = filterTag
      ? ((entry.tags || []).map(t => (t || '').toLowerCase()).includes(filterTag.toLowerCase()))
      : true;
    return textMatch && moodMatch && tagMatch;
  };

  const visibleEntries = useMemo(() => {
    const base = activeTab === 'reflections' ? reflections : combinedEntries;
    return base.filter(filterFn);
  }, [activeTab, reflections, combinedEntries, search, filterMood, filterTag]);

  // ------- AI prompt helper -------
  const fetchAISuggestion = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/journal-prompt`, {
        prompt: `Give a concise, meaningful daily ${activeTab === 'reflections' ? 'reflection' : 'journal'} prompt related to: ${aiPrompt}. Avoid filler; be specific to the topic.`
      });
      setAiGeneratedPrompt(res.data.text || '');
    } catch (err) {
      console.error('AI error:', err);
    }
  };

  const MOODS = ["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"];

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-12">
        {/* Header + streak */}
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
          <div className="flex items-center gap-3">
            <BookOpen size={28} className="text-[#1B5E57]" />
            <h1 className="text-3xl font-semibold text-[#3E3E3E]">Journal</h1>
          </div>
          <div className="flex items-center gap-2 text-[#9AAE8C] text-sm">
            <Flame size={18} className="text-[#1B5E57]" />
            Daily Streak: <strong>{streak} days</strong>
          </div>
        </div>

        {/* Tabs */}
        <div className="inline-flex rounded-xl border border-[#D5E3D1] overflow-hidden">
          {[
            { key: 'journal', label: 'Journal' },
            { key: 'reflections', label: 'Reflections' }
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key ? 'bg-[#1B5E57] text-white' : 'text-[#3E3E3E] hover:bg-[#D5E3D1]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Modern helper: "Which should I use?" */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <HelpCircle className="text-[#1B5E57]" size={18} />
              <h3 className="text-sm font-semibold text-[#1B5E57] uppercase tracking-wide">Journal</h3>
            </div>
            <ul className="text-sm text-[#3E3E3E] space-y-2">
              <li>• Longer-form thoughts with <strong>rich text</strong>, <strong>mood</strong>, and <strong>tags</strong>.</li>
              <li>• Use for deeper processing, stories, and key moments.</li>
              <li>• Great for patterns over time and searching by tag.</li>
            </ul>
          </div>
          <div className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="text-[#1B5E57]" size={18} />
              <h3 className="text-sm font-semibold text-[#1B5E57] uppercase tracking-wide">Reflections</h3>
            </div>
            <ul className="text-sm text-[#3E3E3E] space-y-2">
              <li>• <strong>AM/PM</strong> quick notes with rich text, mood, and tags.</li>
              <li>• Capture intentions (AM) and wins/gratitude (PM).</li>
              <li>• Perfect for daily cadence and fast check-ins.</li>
            </ul>
          </div>
        </div>

        {/* JOURNAL TAB */}
        {activeTab === 'journal' && (
          <>
            <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 space-y-4 shadow">
              <Editor
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={newEntry}
                init={{
                  height: 220,
                  menubar: false,
                  plugins: 'lists link emoticons',
                  toolbar: 'undo redo | bold italic underline | bullist numlist | link emoticons',
                }}
                onEditorChange={setNewEntry}
              />

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  aria-label="Mood"
                  className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                >
                  <option value="">Select Mood</option>
                  {["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"].map((tag, i) => (
                    <option key={i} value={tag}>{tag}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Add tag…"
                    className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addTag()}
                  />
                  <button
                    onClick={addTag}
                    className="bg-[#1B5E57] text-white px-3 py-2 rounded text-xs hover:bg-[#164e48]"
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => removeTag(t)}
                        className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full"
                        title="Remove tag"
                      >
                        #{t} ✕
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleVoiceInput('journal')}
                  className="text-sm text-[#1B5E57] flex items-center gap-1 ml-auto"
                  title={recording ? 'Stop recording' : 'Dictate with your voice'}
                >
                  {recording ? <MicOff size={16} /> : <Mic size={16} />} {recording ? 'Stop' : 'Voice'}
                </button>

                <button
                  onClick={saveEntry}
                  className="bg-[#1B5E57] text-white px-4 py-2 rounded hover:bg-[#164e48] transition text-sm"
                >
                  {editingId ? 'Update Entry' : 'Save Entry'}
                </button>
              </div>

              {aiGeneratedPrompt && (
                <div className="bg-[#F4F7F4] border border-[#D5E3D1] rounded-xl p-4 mt-2 shadow-sm">
                  <h4 className="text-[#1B5E57] font-semibold mb-2">✨ Suggested Prompt</h4>
                  <p className="text-[#3E3E3E] text-sm italic">"{aiGeneratedPrompt}"</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewEntry(aiGeneratedPrompt)}
                      className="mt-2 text-sm text-[#1B5E57] underline hover:text-[#164e48]"
                    >
                      Use in editor
                    </button>
                    <button
                      onClick={() => setAiGeneratedPrompt('')}
                      className="mt-2 text-sm text-[#1B5E57] underline hover:text-[#164e48]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Prompt helper (shared) */}
            <div className="bg-[#F9FAF8] border border-[#D5E3D1] p-4 rounded-xl flex gap-2 items-center">
              <input
                placeholder="Ask AI for a journaling prompt…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 border border-[#D5E3D1] rounded p-2 text-sm"
              />
              <button
                onClick={fetchAISuggestion}
                className="text-sm px-4 py-2 bg-[#B8CDBA] text-[#1B5E57] rounded hover:bg-[#9AAE8C]"
              >
                Get Prompt
              </button>
            </div>
          </>
        )}

        {/* REFLECTIONS TAB */}
        {activeTab === 'reflections' && (
          <>
            {/* Quick-add reflection (now rich + parity controls) */}
            <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 space-y-3 shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Add a quick {refPeriod.toUpperCase()} note for <span className="font-medium">{prettyDate(todayStr)}</span>.
                </p>
                <div className="inline-flex items-center rounded-lg border border-[#D5E3D1] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setRefPeriod('am')}
                    className={`px-3 py-1 text-xs font-medium transition ${refPeriod === 'am' ? 'bg-[#1B5E57] text-white' : 'text-[#3E3E3E] hover:bg-[#D5E3D1]'}`}
                  >
                    Morning
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefPeriod('pm')}
                    className={`px-3 py-1 text-xs font-medium transition ${refPeriod === 'pm' ? 'bg-[#1B5E57] text-white' : 'text-[#3E3E3E] hover:bg-[#D5E3D1]'}`}
                  >
                    Evening
                  </button>
                </div>
              </div>

              <Editor
                apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
                value={refHtml}
                init={{
                  height: 160,
                  menubar: false,
                  plugins: 'lists link emoticons',
                  toolbar: 'undo redo | bold italic underline | bullist numlist | link emoticons',
                }}
                onEditorChange={setRefHtml}
              />

              <div className="flex flex-wrap gap-2 items-center">
                <select
                  aria-label="Mood"
                  className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                  value={refMood}
                  onChange={(e) => setRefMood(e.target.value)}
                >
                  <option value="">Select Mood</option>
                  {["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"].map((tag, i) => (
                    <option key={i} value={tag}>{tag}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={refTagInput}
                    onChange={(e) => setRefTagInput(e.target.value)}
                    placeholder="Add tag…"
                    className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && addRefTag()}
                  />
                  <button
                    onClick={addRefTag}
                    className="bg-[#1B5E57] text-white px-3 py-2 rounded text-xs hover:bg-[#164e48]"
                  >
                    Add
                  </button>
                </div>

                {refTags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {refTags.map((t, i) => (
                      <button
                        type="button"
                        key={i}
                        onClick={() => removeRefTag(t)}
                        className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full"
                        title="Remove tag"
                      >
                        #{t} ✕
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => handleVoiceInput('reflection')}
                  className="text-sm text-[#1B5E57] flex items-center gap-1 ml-auto"
                  title={recording ? 'Stop recording' : 'Dictate with your voice'}
                >
                  {recording ? <MicOff size={16} /> : <Mic size={16} />} {recording ? 'Stop' : 'Voice'}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRefHtml('')}
                    className="px-3 py-2 border border-[#D5E3D1] rounded-lg text-sm text-[#3E3E3E] hover:bg-[#F3F6F2] transition"
                  >
                    Clear
                  </button>
                  <button
                    onClick={saveReflection}
                    disabled={!user || !stripHtml(refHtml).trim()}
                    className={`px-4 py-2 rounded-lg text-sm transition ${
                      !user || !stripHtml(refHtml).trim()
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-[#1B5E57] text-white hover:bg-[#164e48]'
                    }`}
                  >
                    Save Reflection
                  </button>
                </div>
              </div>
              {!user && <p className="text-xs text-gray-500">Sign in to save reflections.</p>}
            </div>

            {/* Prompt helper (shared wording) */}
            <div className="bg-[#F9FAF8] border border-[#D5E3D1] p-4 rounded-xl flex gap-2 items-center">
              <input
                placeholder="Ask AI for a reflection prompt…"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="flex-1 border border-[#D5E3D1] rounded p-2 text-sm"
              />
              <button
                onClick={fetchAISuggestion}
                className="text-sm px-4 py-2 bg-[#B8CDBA] text-[#1B5E57] rounded hover:bg-[#9AAE8C]"
              >
                Get Prompt
              </button>
            </div>
          </>
        )}

        {/* Weekly insights & summaries (split) */}
        <section className="grid lg:grid-cols-2 gap-6">
          {/* Journal panel */}
          <div className="bg-[#F4F7F4] border border-[#D5E3D1] rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="text-[#1B5E57] font-semibold text-sm uppercase tracking-wide">🧠 Journal — Weekly Insights</h3>
            {journalWeeklyInsight ? (
              <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{journalWeeklyInsight}</p>
            ) : (
              <EmptyWeeklyPlaceholder type="journal" />
            )}

            <h4 className="text-[#1B5E57] font-semibold mt-2">📊 Journal — Weekly Summary</h4>
            {journalWeeklySummary ? (
              <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{journalWeeklySummary}</p>
            ) : (
              <EmptyWeeklyPlaceholder type="journal" summary />
            )}
          </div>

          {/* Reflections panel */}
          <div className="bg-[#F4F7F4] border border-[#D5E3D1] rounded-xl p-4 shadow-sm space-y-4">
            <h3 className="text-[#1B5E57] font-semibold text-sm uppercase tracking-wide">✨ Reflections — Weekly Insights</h3>
            {reflectionWeeklyInsight ? (
              <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{reflectionWeeklyInsight}</p>
            ) : (
              <EmptyWeeklyPlaceholder type="reflections" />
            )}

            <h4 className="text-[#1B5E57] font-semibold mt-2">📈 Reflections — Weekly Summary</h4>
            {reflectionWeeklySummary ? (
              <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{reflectionWeeklySummary}</p>
            ) : (
              <EmptyWeeklyPlaceholder type="reflections" summary />
            )}
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'reflections' ? 'reflections' : 'entries'}…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
          />

          {/* Mood + tag filters now available on both tabs */}
          <select
            className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
            value={filterMood}
            onChange={(e) => setFilterMood(e.target.value)}
          >
            <option value="">All Moods</option>
            {["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"].map((tag, i) => (
              <option key={i} value={tag}>{tag}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Filter by tag…"
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
          />

          {(filterMood || filterTag) && (
            <button
              type="button"
              onClick={() => { setFilterMood(''); setFilterTag(''); }}
              className="text-xs underline text-[#1B5E57]"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[#3E3E3E]">
              {activeTab === 'reflections' ? 'My Reflections' : 'My Entries'}
            </h2>
          </div>

          {visibleEntries.length === 0 ? (
            <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 text-sm text-[#9AAE8C]">
              {activeTab === 'reflections'
                ? (
                  <div>
                    <p className="mb-2">No reflections yet. Start with a quick AM intention or PM win.</p>
                    <button
                      onClick={() => setActiveTab('reflections')}
                      className="px-3 py-2 bg-[#1B5E57] text-white rounded text-xs"
                    >
                      Add first reflection
                    </button>
                  </div>
                )
                : (
                  <div>
                    <p className="mb-2">No journal entries yet. Capture a thought to begin your streak.</p>
                    <button
                      onClick={() => setActiveTab('journal')}
                      className="px-3 py-2 bg-[#1B5E57] text-white rounded text-xs"
                    >
                      Write your first entry
                    </button>
                  </div>
                )}
            </div>
          ) : (
            visibleEntries.map(entry => (
              <div
                key={entry.id}
                className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-600">
                    {toReadable(entry.createdAt)}
                    {entry.entryType === 'reflection' && (
                      <span className="ml-2 text-xs text-[#1B5E57] border border-[#B8CDBA] rounded px-2 py-0.5">
                        Reflection {entry.period ? `(${entry.period.toUpperCase()})` : ''}
                      </span>
                    )}
                  </p>

                  {/* Edit/delete for journal entries only (adjust if you want to edit reflections later) */}
                  {entry.entryType !== 'reflection' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditing(entry)}
                        className="text-xs text-[#1B5E57] flex items-center gap-1 hover:underline"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="text-xs text-red-500 flex items-center gap-1 hover:underline"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>

                {entry.isHtml ? (
                  <div
                    className="text-[#3E3E3E] text-sm"
                    dangerouslySetInnerHTML={{ __html: entry.text }}
                  />
                ) : (
                  <p className="text-[#3E3E3E] text-sm whitespace-pre-wrap">{entry.text}</p>
                )}

                {(entry.mood || (entry.tags && entry.tags.length > 0)) && (
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {entry.mood && (
                      <span
                        onClick={() => setFilterMood(entry.mood)}
                        className="text-xs text-[#1B5E57] font-medium cursor-pointer underline underline-offset-2"
                        title="Filter by this mood"
                      >
                        Mood: {entry.mood}
                      </span>
                    )}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {entry.tags.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => setFilterTag((t || '').toLowerCase())}
                            className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full"
                            title="Filter by this tag"
                          >
                            #{t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Export */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4 flex items-center gap-2">
            <Share2 className="text-[#1B5E57]" size={20} /> Export or Share
          </h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <p className="text-[#3E3E3E]">Export all entries and reflections as a secure PDF or .txt file.</p>
            <button className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg flex items-center gap-2 text-sm hover:scale-105 transition">
              <FileText size={16} /> Export
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

/* ---------------- helpers ---------------- */

function toReadable(ts) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return new Date().toLocaleString();
  }
}

function safeToDate(ts) {
  try {
    return ts?.toDate ? ts.toDate() : new Date(ts);
  } catch {
    return new Date();
  }
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html || '';
  return tmp.textContent || tmp.innerText || '';
}

function escapeHtml(s = '') {
  const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return s.replace(/[&<>"']/g, m => map[m]);
}

function yyyymmdd(d = new Date()) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prettyDate(yyyymmdd) {
  const [y, m, d] = yyyymmdd.split('-').map(n => parseInt(n, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Placeholder card used when no weekly items are available */
function EmptyWeeklyPlaceholder({ type, summary = false }) {
  const title = summary ? 'Summary coming soon' : 'Insights coming soon';
  const blurb =
    type === 'journal'
      ? 'Write at least one journal entry this week to unlock personalized analysis.'
      : 'Add an AM or PM reflection to see tailored insights.';
  return (
    <div className="border border-dashed border-[#D5E3D1] rounded-lg p-3 bg-white/50">
      <p className="text-sm text-[#9AAE8C]">
        <strong>{title}.</strong> {blurb}
      </p>
    </div>
  );
}









