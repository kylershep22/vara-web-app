// src/components/dashboard/WeekRecap.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Sparkles, Save, Edit3, X, Plus, Trash2, Lightbulb } from 'lucide-react';

const WeekRecap = ({ userId, currentWeekRange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [existingRecap, setExistingRecap] = useState(null);

  const [formData, setFormData] = useState({
    momentsOfJoy: ['', '', '', ''],
    mindBodyFuel: ['', '', ''],
    friendsConnected: ['', ''],
    biggestWin: '',
    obstacles: '',
    boundaries: ''
  });

  useEffect(() => {
    if (userId && currentWeekRange) {
      fetchWeekRecap();
    }
  }, [userId, currentWeekRange]);

  const fetchWeekRecap = async () => {
    try {
      const recapsQuery = query(
        collection(db, 'weeklyRecaps'),
        where('userId', '==', userId),
        where('weekStart', '==', currentWeekRange.start)
      );

      const snapshot = await getDocs(recapsQuery);

      if (!snapshot.empty) {
        const recap = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setExistingRecap(recap);
        setFormData({
          momentsOfJoy: recap.momentsOfJoy || ['', '', '', ''],
          mindBodyFuel: recap.mindBodyFuel || ['', '', ''],
          friendsConnected: recap.friendsConnected || ['', ''],
          biggestWin: recap.biggestWin || '',
          obstacles: recap.obstacles || '',
          boundaries: recap.boundaries || ''
        });
      } else {
        setExistingRecap(null);
        setFormData({
          momentsOfJoy: ['', '', '', ''],
          mindBodyFuel: ['', '', ''],
          friendsConnected: ['', ''],
          biggestWin: '',
          obstacles: '',
          boundaries: ''
        });
      }
    } catch (error) {
      console.error('Error fetching week recap:', error);
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getAISuggestions = async () => {
    setIsLoadingAI(true);
    try {
      // Fetch user's recent activity (goals, habits, journal entries)
      const [goalsSnap, habitsSnap, journalSnap] = await Promise.all([
        getDocs(query(collection(db, 'goals'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'habits'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'journalEntries'), where('userId', '==', userId)))
      ]);

      const goals = goalsSnap.docs.map(d => d.data().title);
      const habits = habitsSnap.docs.map(d => ({ name: d.data().name, streak: d.data().streak }));
      const journals = journalSnap.docs
        .map(d => d.data())
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 5);

      // Call AI backend for suggestions
      const response = await fetch('http://localhost:5001/api/week-recap-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekData: {
            goals,
            habits,
            recentJournals: journals.map(j => j.content).slice(0, 3)
          },
          currentRecap: formData
        })
      });

      if (response.ok) {
        const suggestions = await response.json();

        // Auto-fill suggestions
        if (suggestions.momentsOfJoy) {
          setFormData(prev => ({
            ...prev,
            momentsOfJoy: suggestions.momentsOfJoy
          }));
        }
        if (suggestions.mindBodyFuel) {
          setFormData(prev => ({
            ...prev,
            mindBodyFuel: suggestions.mindBodyFuel
          }));
        }
      } else {
        console.warn('AI suggestions unavailable');
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleSave = async () => {
    // Validation
    const hasContent =
      formData.momentsOfJoy.some(m => m.trim()) ||
      formData.mindBodyFuel.some(m => m.trim()) ||
      formData.friendsConnected.some(f => f.trim()) ||
      formData.biggestWin.trim() ||
      formData.obstacles.trim() ||
      formData.boundaries.trim();

    if (!hasContent) {
      alert('Please fill out at least one field before saving.');
      return;
    }

    setIsSaving(true);
    try {
      const recapData = {
        userId,
        weekStart: currentWeekRange.start,
        weekEnd: currentWeekRange.end,
        momentsOfJoy: formData.momentsOfJoy.filter(m => m.trim()),
        mindBodyFuel: formData.mindBodyFuel.filter(m => m.trim()),
        friendsConnected: formData.friendsConnected.filter(f => f.trim()),
        biggestWin: formData.biggestWin,
        obstacles: formData.obstacles,
        boundaries: formData.boundaries,
        updatedAt: serverTimestamp()
      };

      if (existingRecap) {
        // Update existing
        await updateDoc(doc(db, 'weeklyRecaps', existingRecap.id), recapData);
      } else {
        // Create new
        recapData.createdAt = serverTimestamp();
        const docRef = await addDoc(collection(db, 'weeklyRecaps'), recapData);
        setExistingRecap({ id: docRef.id, ...recapData });
      }

      setIsEditing(false);
      alert('Week recap saved successfully! 🎉');
    } catch (error) {
      console.error('Error saving week recap:', error);
      alert('Failed to save recap. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (existingRecap) {
      setFormData({
        momentsOfJoy: existingRecap.momentsOfJoy || ['', '', '', ''],
        mindBodyFuel: existingRecap.mindBodyFuel || ['', '', ''],
        friendsConnected: existingRecap.friendsConnected || ['', ''],
        biggestWin: existingRecap.biggestWin || '',
        obstacles: existingRecap.obstacles || '',
        boundaries: existingRecap.boundaries || ''
      });
    } else {
      setFormData({
        momentsOfJoy: ['', '', '', ''],
        mindBodyFuel: ['', '', ''],
        friendsConnected: ['', ''],
        biggestWin: '',
        obstacles: '',
        boundaries: ''
      });
    }
    setIsEditing(false);
  };

  // Check if recap is empty
  const isEmpty = !existingRecap && !isEditing;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Week Recap ({currentWeekRange?.start} → {currentWeekRange?.end})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Reflect on your week using the 4-3-2-1 framework
          </p>
        </div>

        {!isEditing && !isEmpty && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <Edit3 size={16} />
            Edit
          </button>
        )}
      </div>

      {/* Empty State */}
      {isEmpty && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
          <Sparkles className="mx-auto mb-3 text-purple-400" size={48} />
          <p className="font-medium text-gray-700 mb-2">No recap for this week yet</p>
          <p className="text-sm text-gray-500 mb-4">
            Take a moment to reflect on your week
          </p>
          <button
            onClick={() => setIsEditing(true)}
            className="px-6 py-2 rounded-lg bg-[#1B5E57] text-white hover:bg-[#174C46] transition-colors font-medium"
          >
            Start Week Recap
          </button>
        </div>
      )}

      {/* Form (Editing Mode) */}
      {isEditing && (
        <div className="space-y-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 p-6 rounded-xl border border-purple-100">
          {/* AI Suggestions Button */}
          <div className="flex justify-end">
            <button
              onClick={getAISuggestions}
              disabled={isLoadingAI}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-sm font-medium disabled:opacity-50"
            >
              <Lightbulb size={16} />
              {isLoadingAI ? 'Loading...' : 'Get AI Suggestions'}
            </button>
          </div>

          {/* 4 Moments of Joy */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              ✨ 4 Moments of Joy
            </label>
            <div className="space-y-2">
              {formData.momentsOfJoy.map((moment, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={moment}
                  onChange={(e) => handleArrayChange('momentsOfJoy', idx, e.target.value)}
                  placeholder={`Moment ${idx + 1}...`}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* 3 Ways Fueled Mind/Body */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              💪 3 Ways You Fueled Your Mind or Body
            </label>
            <div className="space-y-2">
              {formData.mindBodyFuel.map((fuel, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={fuel}
                  onChange={(e) => handleArrayChange('mindBodyFuel', idx, e.target.value)}
                  placeholder={`Way ${idx + 1}...`}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* 2 Friends Connected */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              👥 2 Friends You Connected With
            </label>
            <div className="space-y-2">
              {formData.friendsConnected.map((friend, idx) => (
                <input
                  key={idx}
                  type="text"
                  value={friend}
                  onChange={(e) => handleArrayChange('friendsConnected', idx, e.target.value)}
                  placeholder={`Friend ${idx + 1}...`}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          {/* 1 Biggest Win */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              🏆 1 Biggest Win from the Week
            </label>
            <textarea
              value={formData.biggestWin}
              onChange={(e) => handleFieldChange('biggestWin', e.target.value)}
              placeholder="What's your biggest accomplishment this week?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Obstacles */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              🛡️ Obstacles You Faced
            </label>
            <textarea
              value={formData.obstacles}
              onChange={(e) => handleFieldChange('obstacles', e.target.value)}
              placeholder="What challenges did you encounter?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Boundaries for Next Week */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              🎯 Boundaries for Next Week
            </label>
            <textarea
              value={formData.boundaries}
              onChange={(e) => handleFieldChange('boundaries', e.target.value)}
              placeholder="What boundaries will you set to support your goals?"
              rows={3}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#1B5E57] text-white hover:bg-[#174C46] transition-colors font-medium disabled:opacity-50"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save Recap'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* View Mode (Saved Recap) */}
      {!isEditing && existingRecap && (
        <div className="space-y-4">
          {/* Moments of Joy */}
          {existingRecap.momentsOfJoy?.length > 0 && (
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                ✨ Moments of Joy
              </h4>
              <ul className="space-y-1">
                {existingRecap.momentsOfJoy.map((moment, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">• {moment}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Mind/Body Fuel */}
          {existingRecap.mindBodyFuel?.length > 0 && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                💪 Mind & Body Fuel
              </h4>
              <ul className="space-y-1">
                {existingRecap.mindBodyFuel.map((fuel, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">• {fuel}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Friends Connected */}
          {existingRecap.friendsConnected?.length > 0 && (
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                👥 Friends Connected
              </h4>
              <ul className="space-y-1">
                {existingRecap.friendsConnected.map((friend, idx) => (
                  <li key={idx} className="text-gray-700 text-sm">• {friend}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Biggest Win */}
          {existingRecap.biggestWin && (
            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                🏆 Biggest Win
              </h4>
              <p className="text-gray-700 text-sm">{existingRecap.biggestWin}</p>
            </div>
          )}

          {/* Obstacles */}
          {existingRecap.obstacles && (
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                🛡️ Obstacles
              </h4>
              <p className="text-gray-700 text-sm">{existingRecap.obstacles}</p>
            </div>
          )}

          {/* Boundaries */}
          {existingRecap.boundaries && (
            <div className="p-4 rounded-lg bg-indigo-50 border border-indigo-100">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                🎯 Boundaries for Next Week
              </h4>
              <p className="text-gray-700 text-sm">{existingRecap.boundaries}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeekRecap;
