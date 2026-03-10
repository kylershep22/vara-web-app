// src/components/fuelRecovery/BreathworkSection.jsx

import React, { useState, useEffect } from 'react';
import { Wind, Play, Pause, Clock } from 'lucide-react';

const BreathworkSection = ({ userId }) => {
  const [activeExercise, setActiveExercise] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [phase, setPhase] = useState('inhale'); // 'inhale' | 'hold1' | 'exhale' | 'hold2'
  const [countdown, setCountdown] = useState(4);

  const breathworkExercises = [
    {
      id: 'box-breathing',
      title: 'Box Breathing (4-4-4-4)',
      description: 'A calming breathing pattern to reduce anxiety and center yourself. Used by Navy SEALs for stress management.',
      pattern: { inhale: 4, hold1: 4, exhale: 4, hold2: 4 },
      benefits: ['Reduces anxiety', 'Improves focus', 'Lowers heart rate', 'Calms nervous system'],
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'energizing',
      title: '4-7-8 Breathing',
      description: 'A natural tranquilizer for the nervous system. Helps you fall asleep faster and manage stress.',
      pattern: { inhale: 4, hold1: 7, exhale: 8, hold2: 0 },
      benefits: ['Promotes sleep', 'Reduces stress', 'Calms mind', 'Lowers blood pressure'],
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'coherent',
      title: 'Coherent Breathing (5-5)',
      description: 'Simple and powerful breathing at 5 breaths per minute. Optimizes heart rate variability.',
      pattern: { inhale: 5, hold1: 0, exhale: 5, hold2: 0 },
      benefits: ['Improves HRV', 'Balances emotions', 'Increases resilience', 'Enhances clarity'],
      color: 'from-evergreen-teal to-evergreen-teal'
    },
    {
      id: 'wim-hof',
      title: 'Energizing Breath',
      description: 'Quick energizing breathwork to boost alertness and energy levels.',
      pattern: { inhale: 2, hold1: 0, exhale: 1, hold2: 0 },
      benefits: ['Increases energy', 'Boosts alertness', 'Improves mood', 'Enhances focus'],
      color: 'from-orange-500 to-red-500'
    }
  ];

  useEffect(() => {
    if (!isActive || !activeExercise) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev > 1) return prev - 1;

        // Move to next phase
        const pattern = activeExercise.pattern;

        if (phase === 'inhale' && pattern.hold1 > 0) {
          setPhase('hold1');
          return pattern.hold1;
        } else if ((phase === 'inhale' && pattern.hold1 === 0) || phase === 'hold1') {
          setPhase('exhale');
          return pattern.exhale;
        } else if (phase === 'exhale' && pattern.hold2 > 0) {
          setPhase('hold2');
          return pattern.hold2;
        } else {
          setPhase('inhale');
          return pattern.inhale;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, activeExercise, phase]);

  const startExercise = (exercise) => {
    setActiveExercise(exercise);
    setPhase('inhale');
    setCountdown(exercise.pattern.inhale);
    setIsActive(true);
  };

  const toggleExercise = () => {
    setIsActive(!isActive);
  };

  const stopExercise = () => {
    setIsActive(false);
    setActiveExercise(null);
    setPhase('inhale');
    setCountdown(0);
  };

  const getPhaseText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe In';
      case 'hold1': return 'Hold';
      case 'exhale': return 'Breathe Out';
      case 'hold2': return 'Hold';
      default: return '';
    }
  };

  const getPhaseColor = () => {
    switch (phase) {
      case 'inhale': return 'from-blue-400 to-cyan-400';
      case 'hold1': return 'from-purple-400 to-pink-400';
      case 'exhale': return 'from-evergreen-teal to-evergreen-teal';
      case 'hold2': return 'from-orange-400 to-yellow-400';
      default: return 'from-silver-sage to-muted-sage-gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-dew-sage-light to-dew-sage-light border border-silver-sage rounded-lg p-4">
        <h3 className="font-semibold text-soft-charcoal mb-2">The Power of Breathwork</h3>
        <p className="text-sm text-muted-sage-gray mb-2">
          Breathwork is one of the most powerful tools for managing stress, improving focus, and regulating your nervous system. Just a few minutes of intentional breathing can shift your state.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-sage-gray">
          <div>
            <span className="font-semibold">Calm Down:</span> Box Breathing, 4-7-8
          </div>
          <div>
            <span className="font-semibold">Get Energized:</span> Energizing Breath
          </div>
          <div>
            <span className="font-semibold">Find Balance:</span> Coherent Breathing
          </div>
        </div>
      </div>

      {/* Active Exercise Display */}
      {activeExercise && (
        <div className={`bg-gradient-to-br ${activeExercise.color} rounded-xl shadow-lg p-8 text-white`}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{activeExercise.title}</h2>
            <p className="text-white/90 text-sm">{activeExercise.description}</p>
          </div>

          {/* Breathing Circle Animation */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className={`relative w-64 h-64 rounded-full bg-gradient-to-br ${getPhaseColor()} flex items-center justify-center shadow-2xl transition-all duration-1000 ${
              isActive ? (phase === 'inhale' ? 'scale-110' : phase === 'exhale' ? 'scale-90' : 'scale-100') : 'scale-100'
            }`}>
              <div className="text-center">
                <div className="text-6xl font-bold mb-2">{countdown}</div>
                <div className="text-xl font-semibold uppercase tracking-wide">{getPhaseText()}</div>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleExercise}
              className="px-8 py-3 bg-white text-soft-charcoal rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
            >
              {isActive ? (
                <>
                  <Pause size={20} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={20} />
                  {activeExercise === null ? 'Start' : 'Resume'}
                </>
              )}
            </button>
            <button
              onClick={stopExercise}
              className="px-8 py-3 bg-white/20 text-white rounded-lg font-semibold hover:bg-white/30 transition"
            >
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Exercise Library */}
      <div>
        <h3 className="text-lg font-semibold text-soft-charcoal mb-4">
          {activeExercise ? 'Other Techniques' : 'Choose a Breathwork Technique'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {breathworkExercises.map(exercise => (
            <div
              key={exercise.id}
              className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
                activeExercise?.id === exercise.id ? 'border-evergreen-teal shadow-md' : 'border-divider'
              }`}
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${exercise.color} p-6 rounded-t-xl`}>
                <div className="flex items-start justify-between mb-3">
                  <Wind className="text-white" size={24} />
                  <span className="text-white/90 text-sm">
                    {exercise.pattern.inhale}-{exercise.pattern.hold1 || 0}-{exercise.pattern.exhale}{exercise.pattern.hold2 > 0 ? `-${exercise.pattern.hold2}` : ''}
                  </span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{exercise.title}</h3>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-muted-sage-gray text-sm mb-3">{exercise.description}</p>

                {/* Benefits */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-soft-charcoal mb-1">Benefits:</p>
                  <div className="flex flex-wrap gap-1">
                    {exercise.benefits.map((benefit, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full bg-dew-sage-light text-muted-sage-gray"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={() => startExercise(exercise)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    activeExercise?.id === exercise.id
                      ? 'bg-dew-sage-light text-muted-sage-gray'
                      : 'bg-evergreen-teal hover:opacity-90 text-white'
                  }`}
                >
                  <Play size={20} />
                  {activeExercise?.id === exercise.id ? 'Currently Active' : 'Start Exercise'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Breathwork Practice</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Find a quiet, comfortable space</li>
          <li>• Sit or lie down with good posture</li>
          <li>• Breathe through your nose (unless instructed otherwise)</li>
          <li>• Practice for at least 5 minutes for best results</li>
          <li>• Use breathwork before bed, during stress, or to start your day</li>
          <li>• Combine with meditation or focus sessions for deeper effects</li>
        </ul>
      </div>
    </div>
  );
};

export default BreathworkSection;
