import React, { useState, useEffect, useRef } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  BookOpen, Smile, Filter, Share2, FileText, Mic, MicOff, Pencil
} from 'lucide-react';
import { db } from '../firebase';
import {
  addDoc, collection, getDocs, query, where, Timestamp, doc, updateDoc
} from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [newEntry, setNewEntry] = useState('');
  const [mood, setMood] = useState('');
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (user) fetchEntries();
  }, [user]);

  const fetchEntries = async () => {
    const q = query(collection(db, 'journalEntries'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEntries(data);
  };

  const saveEntry = async () => {
    if (!newEntry.trim()) return;

    if (editingId) {
      const entryRef = doc(db, 'journalEntries', editingId);
      await updateDoc(entryRef, {
        text: newEntry,
        mood,
      });
      setEditingId(null);
    } else {
      await addDoc(collection(db, 'journalEntries'), {
        userId: user.uid,
        text: newEntry,
        mood,
        createdAt: Timestamp.now()
      });
    }

    setNewEntry('');
    setMood('');
    fetchEntries();
  };

  const handleVoiceInput = async () => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-12">
        {/* Header */}
        <div className="flex items-center gap-3">
          <BookOpen size={28} className="text-[#1B5E57]" />
          <h1 className="text-3xl font-semibold text-[#3E3E3E]">Journal</h1>
        </div>

        <p className="text-[#9AAE8C]">
          Capture your thoughts, emotions, and daily reflections through guided or free-form journaling.
        </p>

        {/* Entry Form */}
        <div className="bg-white border border-[#D5E3D1] rounded-xl p-6 space-y-4 shadow">
          <textarea
            rows={6}
            placeholder="Write your thoughts here..."
            value={newEntry}
            onChange={(e) => setNewEntry(e.target.value)}
            className="w-full border border-[#D5E3D1] rounded-lg p-3 text-sm"
          />

          <div className="flex gap-2 items-center">
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
        </div>

        {/* Entry Timeline */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-[#3E3E3E]">My Entries</h2>
          {entries.length === 0 ? (
            <p className="text-sm text-[#9AAE8C]">No journal entries yet.</p>
          ) : (
            entries.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds).map(entry => (
              <div
                key={entry.id}
                className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm text-gray-600">{new Date(entry.createdAt.toDate()).toLocaleString()}</p>
                  <button
                    onClick={() => startEditing(entry)}
                    className="text-xs text-[#1B5E57] flex items-center gap-1 hover:underline"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </div>
                <p className="text-[#3E3E3E] text-sm whitespace-pre-line">{entry.text}</p>
                {entry.mood && (
                  <p className="mt-2 text-xs text-[#1B5E57] font-medium">Mood: {entry.mood}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Export Section Placeholder */}
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

