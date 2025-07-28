import React, { useState, useEffect, useRef } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  BookOpen, Share2, FileText, Mic, MicOff, Pencil, Trash2, Flame
} from 'lucide-react';
import { db } from '../firebase';
import {
  addDoc, collection, getDocs, query, where, Timestamp, doc, updateDoc, deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Editor } from '@tinymce/tinymce-react';
import axios from 'axios';

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [editingId, setEditingId] = useState(null);
  const [streak, setStreak] = useState(0);
  const [search, setSearch] = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGeneratedPrompt, setAiGeneratedPrompt] = useState('');
  const [weeklySummary, setWeeklySummary] = useState('');

  useEffect(() => {
    if (user) fetchEntries();
    const savedDraft = localStorage.getItem('journalDraft');
    if (savedDraft) setNewEntry(savedDraft);
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem('journalDraft', newEntry);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [newEntry]);

  const fetchEntries = async () => {
    const q = query(collection(db, 'journalEntries'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEntries(data);
    calculateStreak(data);
    fetchWeeklySummary(data);
  };

  const calculateStreak = (data) => {
    const dates = new Set(data.map(e => new Date(e.createdAt.toDate()).toDateString()));
    let currentStreak = 0;
    let today = new Date();

    while (dates.has(today.toDateString())) {
      currentStreak++;
      today.setDate(today.getDate() - 1);
    }
    setStreak(currentStreak);
  };

  const fetchWeeklySummary = async (entries) => {
    const recent = entries.filter(e => {
      const daysAgo = (Date.now() - e.createdAt.toDate()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }).map(e => e.text).join('\n');

    if (!recent) return;

    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/journal-summary`, {
        entries: recent
      });
      setWeeklySummary(res.data.text || '');
    } catch (err) {
      console.error('Summary error:', err);
    }
  };

  const saveEntry = async () => {
    if (!newEntry.trim()) return;

    const entryData = {
      userId: user.uid,
      text: newEntry,
      mood,
      tags,
      createdAt: Timestamp.now()
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
    fetchEntries();
  };

  const deleteEntry = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      await deleteDoc(doc(db, 'journalEntries', id));
      fetchEntries();
    }
  };

  const handleVoiceInput = () => {
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
      setNewEntry(prev => prev + ' ' + transcript);
    };

    recognition.onend = () => {
      setRecording(false);
    };

    recognition.start();
    setRecording(true);
  };

  const startEditing = (entry) => {
    setEditingId(entry.id);
    setNewEntry(entry.text);
    setMood(entry.mood || '');
    setTags(entry.tags || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addTag = async () => {
    if (!tagInput.trim()) return;
    const cleaned = tagInput.trim().toLowerCase();
    if (!tags.includes(cleaned)) setTags([...tags, cleaned]);
    setTagInput('');
  };

  const filterEntries = entries.filter(entry => {
    const textMatch = entry.text.toLowerCase().includes(search.toLowerCase());
    const moodMatch = filterMood ? entry.mood === filterMood : true;
    const tagMatch = filterTag ? (entry.tags || []).includes(filterTag.toLowerCase()) : true;
    return textMatch && moodMatch && tagMatch;
  });

  const fetchAISuggestion = async () => {
    try {
      const res = await axios.post(`${process.env.REACT_APP_API_URL}/api/journal-prompt`, {
        prompt: `Give me a meaningful daily reflection prompt related to: ${aiPrompt}`,
      });
      setAiGeneratedPrompt(res.data.text || '');
    } catch (err) {
      console.error('AI error:', err);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-12">
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

        <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 space-y-4 shadow">
          <Editor
            apiKey={process.env.REACT_APP_TINYMCE_API_KEY}
            value={newEntry}
            init={{
              height: 200,
              menubar: false,
              plugins: 'lists link emoticons',
              toolbar: 'undo redo | bold italic | bullist numlist | emoticons',
            }}
            onEditorChange={setNewEntry}
          />

          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
            >
              <option value="">Select Mood</option>
              {["😊 Happy", "😢 Sad", "😐 Neutral", "😠 Frustrated", "😌 Calm"].map((tag, i) => (
                <option key={i} value={tag}>{tag}</option>
              ))}
            </select>

            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add tag..."
              className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && addTag()}
            />
            <button
              onClick={addTag}
              className="bg-[#1B5E57] text-white px-2 py-1 rounded text-xs hover:bg-[#164e48]"
            >
              Add Tag
            </button>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((t, i) => (
                  <span key={i} className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <button
              onClick={handleVoiceInput}
              className="text-sm text-[#1B5E57] flex items-center gap-1"
            >
              {recording ? <MicOff size={16} /> : <Mic size={16} />} {recording ? 'Stop' : 'Voice'}
            </button>

            <button
              onClick={saveEntry}
              className="ml-auto bg-[#1B5E57] text-white px-4 py-2 rounded hover:bg-[#164e48] transition text-sm"
            >
              {editingId ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>

          {aiGeneratedPrompt && (
            <div className="bg-[#F4F7F4] border border-[#D5E3D1] rounded-xl p-4 mt-4 shadow-sm">
              <h4 className="text-[#1B5E57] font-semibold mb-2">✨ Suggested Prompt</h4>
              <p className="text-[#3E3E3E] text-sm italic">"{aiGeneratedPrompt}"</p>
              <button
                onClick={() => setNewEntry(aiGeneratedPrompt)}
                className="mt-2 text-sm text-[#1B5E57] underline hover:text-[#164e48]"
              >
                Use this prompt
              </button>
            </div>
          )}
        </div>

        <div className="bg-[#F9FAF8] border border-[#D5E3D1] p-4 rounded-xl flex gap-2 items-center">
          <input
            placeholder="Ask AI for a journaling prompt..."
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
        
        {weeklySummary && (
        <div className="bg-[#F4F7F4] border border-[#D5E3D1] rounded-xl p-4 shadow-sm space-y-4">
          <div>
            <h4 className="text-[#1B5E57] font-semibold mb-2">🧠 Weekly Insight</h4>
            <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{weeklySummary}</p>
          </div>
          <div>
            <h4 className="text-[#1B5E57] font-semibold mb-2">📊 Weekly Journal Summary</h4>
            <p className="text-sm text-[#3E3E3E] whitespace-pre-wrap">{weeklySummary}</p>
          </div>
        </div>
          )}

        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
          />
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
            placeholder="Filter by tag..."
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="border border-[#D5E3D1] rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#3E3E3E]">My Entries</h2>
          {filterEntries.length === 0 ? (
            <p className="text-sm text-[#9AAE8C]">No journal entries yet.</p>
          ) : (
            filterEntries.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map(entry => (
              <div
                key={entry.id}
                className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-600">{new Date(entry.createdAt.toDate()).toLocaleString()}</p>
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
                </div>
                <div
                  className="text-[#3E3E3E] text-sm"
                  dangerouslySetInnerHTML={{ __html: entry.text }}
                />
                {entry.mood && (
                  <p className="mt-2 text-xs text-[#1B5E57] font-medium">Mood: {entry.mood}</p>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {entry.tags.map((t, i) => (
                      <span key={i} className="bg-[#D5E3D1] text-[#1B5E57] text-xs px-2 py-1 rounded-full">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-12">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-4 flex items-center gap-2">
            <Share2 className="text-[#1B5E57]" size={20} /> Export or Share
          </h3>
          <div className="bg-white/80 border border-[#D5E3D1] rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <p className="text-[#3E3E3E]">Export all journal entries as a secure PDF or .txt file.</p>
            <button className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg flex items-center gap-2 text-sm hover:scale-105 transition">
              <FileText size={16} /> Export
            </button>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}





