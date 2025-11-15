// src/components/fuelRecovery/SleepSection.jsx

import React, { useState, useEffect } from 'react';
import { Moon, Play, Pause, Heart, Clock, TrendingUp, Calendar, Plus, Trash2 } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';

const SleepSection = ({ userId }) => {
  const { track, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const [activeSubTab, setActiveSubTab] = useState('sounds'); // 'sounds' | 'routine' | 'tracker'
  const [favorites, setFavorites] = useState([]);
  const [sleepLogs, setSleepLogs] = useState([]);
  const [bedtimeRoutine, setBedtimeRoutine] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [logForm, setLogForm] = useState({
    hoursSlept: 7,
    quality: 'good',
    notes: ''
  });

  // Sleep Sounds Library (using actual Firebase Storage URLs from Sleep.jsx)
  const sleepSounds = [
    {
      id: 'rain-sounds',
      title: 'Gentle Rain',
      description: 'Soft rain sounds to help you drift into deep sleep',
      duration: '60 min',
      type: 'Nature Sounds',
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.appspot.com/o/audio%2Frain-sounds.mp3?alt=media'
    },
    {
      id: 'ocean-waves',
      title: 'Ocean Waves',
      description: 'Calming ocean waves for peaceful rest',
      duration: '60 min',
      type: 'Nature Sounds',
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.appspot.com/o/audio%2Focean-waves.mp3?alt=media'
    },
    {
      id: 'forest-night',
      title: 'Forest at Night',
      description: 'Peaceful forest sounds under the stars',
      duration: '60 min',
      type: 'Nature Sounds',
      audioUrl: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.appspot.com/o/audio%2Fforest-night.mp3?alt=media'
    }
  ];

  // Bedtime routine activity library
  const routineActivities = [
    { name: 'Dim the lights', duration: 5, icon: 'Moon' },
    { name: 'Set phone to Do Not Disturb', duration: 2, icon: 'Moon' },
    { name: 'Meditation or breathwork', duration: 10, icon: 'Moon' },
    { name: 'Journal gratitude', duration: 10, icon: 'Moon' },
    { name: 'Read a book', duration: 20, icon: 'Moon' },
    { name: 'Gentle stretching', duration: 10, icon: 'Moon' },
    { name: 'Herbal tea', duration: 5, icon: 'Moon' },
    { name: 'Listen to sleep sounds', duration: 30, icon: 'Moon' },
    { name: 'Cool room temperature', duration: 2, icon: 'Moon' },
    { name: 'Eye mask and earplugs', duration: 2, icon: 'Moon' }
  ];

  useEffect(() => {
    if (userId) {
      fetchFavorites();
      fetchSleepLogs();
      fetchBedtimeRoutine();
    }
  }, [userId]);

  const fetchFavorites = async () => {
    try {
      const favoritesQuery = query(
        collection(db, 'audioFavorites'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(favoritesQuery);
      const favList = snapshot.docs.map(doc => doc.data().audioId);
      setFavorites(favList);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const fetchSleepLogs = async () => {
    try {
      const logsQuery = query(
        collection(db, 'sleepLogs'),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(7)
      );
      const snapshot = await getDocs(logsQuery);
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSleepLogs(logs);
    } catch (error) {
      console.error('Error fetching sleep logs:', error);
    }
  };

  const fetchBedtimeRoutine = async () => {
    try {
      const routineQuery = query(
        collection(db, 'bedtimeRoutines'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(routineQuery);
      if (!snapshot.empty) {
        const routineDoc = snapshot.docs[0];
        setBedtimeRoutine(routineDoc.data().activities || []);
      }
    } catch (error) {
      console.error('Error fetching bedtime routine:', error);
    }
  };

  const toggleFavorite = async (audioId) => {
    if (!userId) return;

    try {
      if (favorites.includes(audioId)) {
        const favQuery = query(
          collection(db, 'audioFavorites'),
          where('userId', '==', userId),
          where('audioId', '==', audioId)
        );
        const snapshot = await getDocs(favQuery);
        snapshot.docs.forEach(doc => deleteDoc(doc.ref));
        setFavorites(prev => prev.filter(id => id !== audioId));
      } else {
        await addDoc(collection(db, 'audioFavorites'), {
          userId,
          audioId,
          createdAt: serverTimestamp()
        });
        setFavorites(prev => [...prev, audioId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handlePlayTrack = async (sound) => {
    playTrack(sound.title, sound.audioUrl);

    if (userId) {
      try {
        await addDoc(collection(db, 'audioListens'), {
          userId,
          audioId: sound.id,
          duration: 3600, // 60 minutes in seconds
          listenedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error logging audio listen:', error);
      }
    }
  };

  const addToRoutine = (activity) => {
    setBedtimeRoutine(prev => [...prev, { ...activity, id: Date.now() }]);
  };

  const removeFromRoutine = (activityId) => {
    setBedtimeRoutine(prev => prev.filter(a => a.id !== activityId));
  };

  const saveRoutine = async () => {
    if (!userId) return;

    try {
      // Delete existing routine
      const existingQuery = query(
        collection(db, 'bedtimeRoutines'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(existingQuery);
      snapshot.docs.forEach(doc => deleteDoc(doc.ref));

      // Create new routine
      await addDoc(collection(db, 'bedtimeRoutines'), {
        userId,
        activities: bedtimeRoutine,
        createdAt: serverTimestamp()
      });

      alert('Bedtime routine saved!');
    } catch (error) {
      console.error('Error saving routine:', error);
    }
  };

  const logSleep = async () => {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'sleepLogs'), {
        userId,
        hoursSlept: logForm.hoursSlept,
        quality: logForm.quality,
        notes: logForm.notes,
        date: serverTimestamp()
      });

      setShowLogForm(false);
      setLogForm({ hoursSlept: 7, quality: 'good', notes: '' });
      fetchSleepLogs();
    } catch (error) {
      console.error('Error logging sleep:', error);
    }
  };

  const calculateSleepStats = () => {
    if (sleepLogs.length === 0) return { avgHours: 0, avgQuality: 'N/A' };

    const totalHours = sleepLogs.reduce((sum, log) => sum + log.hoursSlept, 0);
    const avgHours = (totalHours / sleepLogs.length).toFixed(1);

    const qualityCounts = { excellent: 0, good: 0, fair: 0, poor: 0 };
    sleepLogs.forEach(log => qualityCounts[log.quality]++);
    const avgQuality = Object.entries(qualityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { avgHours, avgQuality };
  };

  const stats = calculateSleepStats();

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveSubTab('sounds')}
          className={`px-4 py-2 font-medium transition-all border-b-2 ${
            activeSubTab === 'sounds'
              ? 'border-[#1B5E57] text-[#1B5E57]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Sleep Sounds
        </button>
        <button
          onClick={() => setActiveSubTab('routine')}
          className={`px-4 py-2 font-medium transition-all border-b-2 ${
            activeSubTab === 'routine'
              ? 'border-[#1B5E57] text-[#1B5E57]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Bedtime Routine
        </button>
        <button
          onClick={() => setActiveSubTab('tracker')}
          className={`px-4 py-2 font-medium transition-all border-b-2 ${
            activeSubTab === 'tracker'
              ? 'border-[#1B5E57] text-[#1B5E57]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Sleep Tracker
        </button>
      </div>

      {/* Sleep Sounds Tab */}
      {activeSubTab === 'sounds' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-semibold text-indigo-900 mb-2">Quality Sleep is Brain Health</h3>
            <p className="text-sm text-indigo-700">
              Sleep consolidates memories, clears brain toxins, and builds cognitive reserve. Aim for 7-9 hours of quality sleep each night for optimal brain performance.
            </p>
          </div>

          {/* Sleep Sounds Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sleepSounds.map(sound => {
              const isFavorite = favorites.includes(sound.id);
              const isCurrentTrack = track?.title === sound.title;
              const isCurrentlyPlaying = isCurrentTrack && isPlaying;

              return (
                <div
                  key={sound.id}
                  className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
                    isCurrentTrack ? 'border-[#1B5E57] shadow-md' : 'border-gray-200'
                  }`}
                >
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-6 rounded-t-xl">
                    <div className="flex items-start justify-between mb-3">
                      <Moon className="text-white" size={24} />
                      <button
                        onClick={() => toggleFavorite(sound.id)}
                        className="text-white hover:scale-110 transition-transform"
                      >
                        <Heart
                          size={20}
                          fill={isFavorite ? 'currentColor' : 'none'}
                          className={isFavorite ? 'text-red-300' : ''}
                        />
                      </button>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">{sound.title}</h3>
                    <div className="flex items-center gap-3 text-white/90 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        {sound.duration}
                      </span>
                      <span>{sound.type}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-gray-600 text-sm mb-4">{sound.description}</p>

                    <button
                      onClick={() => {
                        if (isCurrentTrack) {
                          togglePlay();
                        } else {
                          handlePlayTrack(sound);
                        }
                      }}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                        isCurrentlyPlaying
                          ? 'bg-orange-500 hover:bg-orange-600 text-white'
                          : 'bg-[#1B5E57] hover:bg-[#174C46] text-white'
                      }`}
                    >
                      {isCurrentlyPlaying ? (
                        <>
                          <Pause size={20} />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          {isCurrentTrack ? 'Resume' : 'Play'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bedtime Routine Tab */}
      {activeSubTab === 'routine' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900 mb-2">Build Your Bedtime Routine</h3>
            <p className="text-sm text-purple-700">
              A consistent bedtime routine signals to your brain that it's time to wind down. Create your ideal routine below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activity Library */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Activity Library</h3>
              <div className="space-y-2">
                {routineActivities.map((activity, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-500">{activity.duration} min</div>
                    </div>
                    <button
                      onClick={() => addToRoutine(activity)}
                      className="p-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#174C46] transition"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Your Routine */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Your Bedtime Routine</h3>
                {bedtimeRoutine.length > 0 && (
                  <button
                    onClick={saveRoutine}
                    className="px-4 py-2 bg-[#1B5E57] text-white text-sm rounded-lg hover:bg-[#174C46] transition"
                  >
                    Save Routine
                  </button>
                )}
              </div>

              {bedtimeRoutine.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Moon className="mx-auto mb-3 text-gray-300" size={48} />
                  <p className="font-medium text-gray-700 mb-1">No activities yet</p>
                  <p className="text-sm text-gray-500">Add activities from the library</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bedtimeRoutine.map((activity, idx) => (
                    <div
                      key={activity.id}
                      className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900">
                          {idx + 1}. {activity.name}
                        </div>
                        <div className="text-sm text-gray-500">{activity.duration} min</div>
                      </div>
                      <button
                        onClick={() => removeFromRoutine(activity.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <div className="text-sm font-semibold text-indigo-900">
                      Total Duration: {bedtimeRoutine.reduce((sum, a) => sum + a.duration, 0)} minutes
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sleep Tracker Tab */}
      {activeSubTab === 'tracker' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="text-blue-600" size={20} />
                <span className="text-xs font-medium text-blue-700 uppercase">Avg Hours</span>
              </div>
              <div className="text-2xl font-bold text-blue-900">{stats.avgHours}h</div>
              <div className="text-xs text-blue-600 mt-1">Last 7 days</div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Moon className="text-purple-600" size={20} />
                <span className="text-xs font-medium text-purple-700 uppercase">Avg Quality</span>
              </div>
              <div className="text-2xl font-bold text-purple-900 capitalize">{stats.avgQuality}</div>
              <div className="text-xs text-purple-600 mt-1">Last 7 days</div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="text-green-600" size={20} />
                <span className="text-xs font-medium text-green-700 uppercase">Logs</span>
              </div>
              <div className="text-2xl font-bold text-green-900">{sleepLogs.length}</div>
              <div className="text-xs text-green-600 mt-1">Last 7 days</div>
            </div>
          </div>

          {/* Log Form */}
          <div>
            <button
              onClick={() => setShowLogForm(!showLogForm)}
              className="mb-4 px-4 py-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#174C46] transition flex items-center gap-2"
            >
              <Plus size={16} />
              Log Last Night's Sleep
            </button>

            {showLogForm && (
              <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-4">Log Sleep</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hours Slept: {logForm.hoursSlept}h
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="12"
                      step="0.5"
                      value={logForm.hoursSlept}
                      onChange={(e) => setLogForm({ ...logForm, hoursSlept: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['poor', 'fair', 'good', 'excellent'].map(quality => (
                        <button
                          key={quality}
                          onClick={() => setLogForm({ ...logForm, quality })}
                          className={`px-4 py-2 rounded-lg font-medium capitalize transition ${
                            logForm.quality === quality
                              ? 'bg-[#1B5E57] text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {quality}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                    <textarea
                      value={logForm.notes}
                      onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
                      placeholder="What affected your sleep? Dreams, interruptions, etc."
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={logSleep}
                      className="px-4 py-2 bg-[#1B5E57] text-white rounded-lg hover:bg-[#174C46] transition"
                    >
                      Save Log
                    </button>
                    <button
                      onClick={() => setShowLogForm(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sleep Log History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Sleep Logs</h3>
            {sleepLogs.length > 0 ? (
              <div className="space-y-2">
                {sleepLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-[#1B5E57]/30 hover:shadow-sm transition bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Moon className="text-indigo-600" size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {log.hoursSlept}h sleep - {log.quality} quality
                        </div>
                        <div className="text-sm text-gray-500">
                          {log.date?.toDate ? log.date.toDate().toLocaleDateString() : 'Recently'}
                          {log.notes && (
                            <span className="ml-2 text-gray-400">• {log.notes}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <Moon className="mx-auto mb-3 text-gray-300" size={48} />
                <p className="font-medium text-gray-700 mb-1">No sleep logs yet</p>
                <p className="text-sm text-gray-500">Start tracking your sleep to see trends</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SleepSection;
