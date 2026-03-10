// src/components/focus/BinauraBeatsLibrary.jsx

import React, { useState, useEffect } from 'react';
import { Play, Pause, Heart, Clock, Waves } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { db } from '../../firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const BinauraBeatsLibrary = ({ userId }) => {
  const { track, isPlaying, playTrack, togglePlay } = useAudioPlayer();
  const [selectedWaveType, setSelectedWaveType] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Binaural Beats Catalog
  const binauralBeats = [
    {
      id: 'alpha-focus-30',
      title: 'Alpha Waves - Deep Focus',
      waveType: 'alpha',
      frequency: '10 Hz',
      duration: 30,
      description: 'Perfect for relaxed concentration and creative work',
      audioUrl: 'https://example.com/alpha-focus-30min.mp3', // Replace with actual URLs
      benefits: ['Enhanced focus', 'Reduced stress', 'Creative flow']
    },
    {
      id: 'beta-concentration-25',
      title: 'Beta Waves - Active Concentration',
      waveType: 'beta',
      frequency: '20 Hz',
      duration: 25,
      description: 'Ideal for analytical tasks and problem-solving',
      audioUrl: 'https://example.com/beta-concentration-25min.mp3',
      benefits: ['Sharp focus', 'Mental alertness', 'Quick thinking']
    },
    {
      id: 'theta-creativity-60',
      title: 'Theta Waves - Creative Flow',
      waveType: 'theta',
      frequency: '6 Hz',
      duration: 60,
      description: 'Best for brainstorming and innovative thinking',
      audioUrl: 'https://example.com/theta-creativity-60min.mp3',
      benefits: ['Creative insights', 'Deep relaxation', 'Intuitive thinking']
    },
    {
      id: 'alpha-meditation-15',
      title: 'Alpha Waves - Light Meditation',
      waveType: 'alpha',
      frequency: '8 Hz',
      duration: 15,
      description: 'Short session for quick mental reset',
      audioUrl: 'https://example.com/alpha-meditation-15min.mp3',
      benefits: ['Mental clarity', 'Stress relief', 'Calm focus']
    },
    {
      id: 'beta-study-45',
      title: 'Beta Waves - Study Session',
      waveType: 'beta',
      frequency: '18 Hz',
      duration: 45,
      description: 'Perfect for learning and information retention',
      audioUrl: 'https://example.com/beta-study-45min.mp3',
      benefits: ['Better memory', 'Sustained attention', 'Learning efficiency']
    },
    {
      id: 'theta-deep-work-90',
      title: 'Theta Waves - Deep Work',
      waveType: 'theta',
      frequency: '5 Hz',
      duration: 90,
      description: 'Extended session for complex projects',
      audioUrl: 'https://example.com/theta-deep-work-90min.mp3',
      benefits: ['Flow state', 'Deep concentration', 'Creative breakthroughs']
    }
  ];

  useEffect(() => {
    if (userId) {
      fetchFavorites();
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

  const toggleFavorite = async (audioId) => {
    if (!userId) return;

    try {
      if (favorites.includes(audioId)) {
        // Remove favorite
        const favQuery = query(
          collection(db, 'audioFavorites'),
          where('userId', '==', userId),
          where('audioId', '==', audioId)
        );
        const snapshot = await getDocs(favQuery);
        snapshot.docs.forEach(doc => deleteDoc(doc.ref));
        setFavorites(prev => prev.filter(id => id !== audioId));
      } else {
        // Add favorite
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

  const handlePlayTrack = async (beat) => {
    playTrack(beat.title, beat.audioUrl);

    // Log listen to Firestore
    if (userId) {
      try {
        await addDoc(collection(db, 'audioListens'), {
          userId,
          audioId: beat.id,
          duration: beat.duration * 60, // Convert to seconds
          listenedAt: serverTimestamp()
        });
      } catch (error) {
        console.error('Error logging audio listen:', error);
      }
    }
  };

  // Filter tracks
  const filteredBeats = binauralBeats.filter(beat => {
    const matchesWaveType = selectedWaveType === 'all' || beat.waveType === selectedWaveType;
    const matchesDuration =
      selectedDuration === 'all' ||
      (selectedDuration === 'short' && beat.duration <= 20) ||
      (selectedDuration === 'medium' && beat.duration > 20 && beat.duration <= 45) ||
      (selectedDuration === 'long' && beat.duration > 45);

    return matchesWaveType && matchesDuration;
  });

  const getWaveTypeColor = (waveType) => {
    switch (waveType) {
      case 'alpha':
        return 'from-blue-500 to-cyan-500';
      case 'beta':
        return 'from-purple-500 to-pink-500';
      case 'theta':
        return 'from-evergreen-teal to-evergreen-teal';
      default:
        return 'from-muted-sage-gray to-soft-charcoal';
    }
  };

  const getWaveTypeIcon = (waveType) => {
    return <Waves className="text-white" size={24} />;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">🧠 What are Binaural Beats?</h3>
        <p className="text-sm text-blue-700 mb-2">
          Binaural beats are an auditory illusion created when two slightly different frequencies are played in each ear.
          Your brain perceives a third tone—the difference between the two—which can influence brainwave patterns.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-blue-600">
          <div>
            <span className="font-semibold">Alpha (8-14 Hz):</span> Relaxed focus, creativity
          </div>
          <div>
            <span className="font-semibold">Beta (14-30 Hz):</span> Active concentration, alertness
          </div>
          <div>
            <span className="font-semibold">Theta (4-8 Hz):</span> Deep relaxation, flow state
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Wave Type Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-soft-charcoal mb-2">Wave Type</label>
          <div className="flex gap-2 flex-wrap">
            {['all', 'alpha', 'beta', 'theta'].map(type => (
              <button
                key={type}
                onClick={() => setSelectedWaveType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                  selectedWaveType === type
                    ? 'bg-evergreen-teal text-white shadow-sm'
                    : 'bg-dew-sage-light text-soft-charcoal hover:bg-silver-sage/30'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Duration Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-soft-charcoal mb-2">Duration</label>
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all', label: 'All' },
              { value: 'short', label: '≤ 20 min' },
              { value: 'medium', label: '20-45 min' },
              { value: 'long', label: '45+ min' }
            ].map(option => (
              <button
                key={option.value}
                onClick={() => setSelectedDuration(option.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedDuration === option.value
                    ? 'bg-evergreen-teal text-white shadow-sm'
                    : 'bg-dew-sage-light text-soft-charcoal hover:bg-silver-sage/30'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Track Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredBeats.map(beat => {
          const isFavorite = favorites.includes(beat.id);
          const isCurrentTrack = track?.title === beat.title;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;

          return (
            <div
              key={beat.id}
              className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
                isCurrentTrack ? 'border-evergreen-teal shadow-md' : 'border-divider'
              }`}
            >
              {/* Card Header with Gradient */}
              <div className={`bg-gradient-to-r ${getWaveTypeColor(beat.waveType)} p-6 rounded-t-xl`}>
                <div className="flex items-start justify-between mb-3">
                  {getWaveTypeIcon(beat.waveType)}
                  <button
                    onClick={() => toggleFavorite(beat.id)}
                    className="text-white hover:scale-110 transition-transform"
                  >
                    <Heart
                      size={20}
                      fill={isFavorite ? 'currentColor' : 'none'}
                      className={isFavorite ? 'text-red-300' : ''}
                    />
                  </button>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{beat.title}</h3>
                <div className="flex items-center gap-3 text-white/90 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock size={14} />
                    {beat.duration} min
                  </span>
                  <span>{beat.frequency}</span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-muted-sage-gray text-sm mb-3">{beat.description}</p>

                {/* Benefits */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-soft-charcoal mb-1">Benefits:</p>
                  <div className="flex flex-wrap gap-1">
                    {beat.benefits.map((benefit, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full bg-dew-sage-light text-muted-sage-gray"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Play Button */}
                <button
                  onClick={() => {
                    if (isCurrentTrack) {
                      togglePlay();
                    } else {
                      handlePlayTrack(beat);
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    isCurrentlyPlaying
                      ? 'bg-orange-500 hover:bg-orange-600 text-white'
                      : 'bg-evergreen-teal hover:opacity-90 text-white'
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

      {/* Empty State */}
      {filteredBeats.length === 0 && (
        <div className="text-center py-12 bg-dew-sage-light rounded-lg border-2 border-dashed border-divider">
          <Waves className="mx-auto mb-3 text-muted-sage-gray/60" size={48} />
          <p className="font-medium text-soft-charcoal mb-1">No tracks match your filters</p>
          <p className="text-sm text-muted-sage-gray">Try adjusting your wave type or duration filters</p>
        </div>
      )}

      {/* Usage Tips */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">💡 Tips for Best Results</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Use headphones for the full binaural effect</li>
          <li>• Start with shorter sessions (15-30 min) and build up</li>
          <li>• Play during Pomodoro sessions for enhanced focus</li>
          <li>• Match wave type to your task: Alpha for creativity, Beta for analysis, Theta for flow</li>
          <li>• Combine with deep breathing for deeper relaxation</li>
        </ul>
      </div>

      {/* Disclaimer */}
      <div className="text-xs text-muted-sage-gray text-center">
        <p>
          Note: Binaural beats are not medical treatment. If you have epilepsy or other neurological conditions,
          consult a healthcare provider before use.
        </p>
      </div>
    </div>
  );
};

export default BinauraBeatsLibrary;
