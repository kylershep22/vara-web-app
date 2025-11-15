// src/components/resilience/MindfulnessExercises.jsx

import React, { useState, useEffect } from 'react';
import { Sparkles, Play, Pause, Clock, CheckCircle } from 'lucide-react';

const MindfulnessExercises = ({ userId }) => {
  const [activeExercise, setActiveExercise] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const exercises = [
    {
      id: 'body-scan',
      title: '5-Minute Body Scan',
      duration: 5,
      description: 'A quick body scan to release tension and increase body awareness',
      color: 'from-blue-500 to-cyan-500',
      steps: [
        { instruction: 'Close your eyes and take 3 deep breaths', duration: 30 },
        { instruction: 'Notice sensations in your feet and toes', duration: 40 },
        { instruction: 'Scan up through your legs, releasing any tension', duration: 50 },
        { instruction: 'Bring awareness to your stomach and chest', duration: 40 },
        { instruction: 'Notice your shoulders, arms, and hands', duration: 40 },
        { instruction: 'Scan your neck, jaw, and facial muscles', duration: 40 },
        { instruction: 'Take 3 final deep breaths and slowly open your eyes', duration: 40 }
      ]
    },
    {
      id: 'mindful-breathing',
      title: '3-Minute Breathing Space',
      duration: 3,
      description: 'A quick reset for stressful moments',
      color: 'from-green-500 to-emerald-500',
      steps: [
        { instruction: 'Acknowledge: Notice what you\'re thinking and feeling right now', duration: 60 },
        { instruction: 'Gather: Focus all attention on the breath for 6 slow cycles', duration: 60 },
        { instruction: 'Expand: Broaden awareness to your whole body and surroundings', duration: 60 }
      ]
    },
    {
      id: 'loving-kindness',
      title: 'Loving-Kindness Meditation',
      duration: 7,
      description: 'Cultivate compassion for yourself and others',
      color: 'from-pink-500 to-rose-500',
      steps: [
        { instruction: 'Sit comfortably and take 3 deep breaths', duration: 30 },
        { instruction: 'Silently repeat: "May I be happy, may I be healthy, may I be safe, may I be at peace"', duration: 90 },
        { instruction: 'Think of someone you love. Wish them the same: "May you be happy, may you be healthy..."', duration: 90 },
        { instruction: 'Think of a neutral person. Extend the same wishes to them', duration: 90 },
        { instruction: 'Think of someone difficult. Try to wish them well', duration: 60 },
        { instruction: 'Extend these wishes to all beings everywhere', duration: 60 }
      ]
    },
    {
      id: 'five-senses',
      title: '5-4-3-2-1 Grounding',
      duration: 5,
      description: 'Use your senses to anchor yourself in the present moment',
      color: 'from-purple-500 to-indigo-500',
      steps: [
        { instruction: 'Take a deep breath and notice 5 things you can see', duration: 60 },
        { instruction: 'Notice 4 things you can touch or feel', duration: 60 },
        { instruction: 'Notice 3 things you can hear', duration: 60 },
        { instruction: 'Notice 2 things you can smell (or like the smell of)', duration: 60 },
        { instruction: 'Notice 1 thing you can taste', duration: 60 }
      ]
    }
  ];

  useEffect(() => {
    if (!isPlaying || !activeExercise) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev > 1) return prev - 1;

        // Move to next step
        if (currentStep < activeExercise.steps.length - 1) {
          setCurrentStep(prev => prev + 1);
          return activeExercise.steps[currentStep + 1].duration;
        } else {
          // Exercise complete
          setIsPlaying(false);
          return 0;
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, activeExercise, currentStep]);

  const startExercise = (exercise) => {
    setActiveExercise(exercise);
    setCurrentStep(0);
    setTimeRemaining(exercise.steps[0].duration);
    setIsPlaying(true);
  };

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const stopExercise = () => {
    setActiveExercise(null);
    setIsPlaying(false);
    setCurrentStep(0);
    setTimeRemaining(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Sparkles className="text-purple-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-purple-900 mb-2">Mindfulness Practices</h2>
            <p className="text-purple-700 mb-2">
              Mindfulness strengthens your ability to stay present, reduces rumination, and improves emotional regulation.
              Even just 3-5 minutes daily can reshape your brain over time.
            </p>
            <p className="text-sm text-purple-600">
              Choose a guided exercise below and follow along. Find a quiet space and give yourself permission to pause.
            </p>
          </div>
        </div>
      </div>

      {/* Active Exercise Player */}
      {activeExercise && (
        <div className={`bg-gradient-to-br ${activeExercise.color} rounded-xl shadow-lg p-8 text-white`}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">{activeExercise.title}</h2>
            <div className="text-white/90 text-sm">{activeExercise.description}</div>
          </div>

          {/* Progress Indicator */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span>Step {currentStep + 1} of {activeExercise.steps.length}</span>
              <span>{formatTime(timeRemaining)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2">
              <div
                className="bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / activeExercise.steps.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Current Instruction */}
          <div className="bg-white/10 rounded-lg p-6 mb-6 min-h-[120px] flex items-center justify-center">
            <p className="text-xl text-center leading-relaxed">
              {activeExercise.steps[currentStep].instruction}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={togglePlayPause}
              className="px-8 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:shadow-lg transition flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <Pause size={20} />
                  Pause
                </>
              ) : (
                <>
                  <Play size={20} />
                  {currentStep === 0 && timeRemaining === activeExercise.steps[0].duration ? 'Start' : 'Resume'}
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {activeExercise ? 'Other Exercises' : 'Choose an Exercise'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exercises.map(exercise => (
            <div
              key={exercise.id}
              className={`bg-white rounded-xl border-2 transition-all hover:shadow-lg ${
                activeExercise?.id === exercise.id ? 'border-[#1B5E57] shadow-md' : 'border-gray-200'
              }`}
            >
              {/* Card Header */}
              <div className={`bg-gradient-to-r ${exercise.color} p-6 rounded-t-xl`}>
                <div className="flex items-start justify-between mb-3">
                  <Sparkles className="text-white" size={24} />
                  <div className="flex items-center gap-1 text-white/90 text-sm">
                    <Clock size={14} />
                    {exercise.duration} min
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">{exercise.title}</h3>
              </div>

              {/* Card Body */}
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4">{exercise.description}</p>

                {/* Steps Preview */}
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Steps:</p>
                  <div className="space-y-1">
                    {exercise.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                        <CheckCircle size={12} className="text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{step.instruction}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Start Button */}
                <button
                  onClick={() => startExercise(exercise)}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-all ${
                    activeExercise?.id === exercise.id
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-[#1B5E57] hover:bg-[#174C46] text-white'
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
        <h3 className="font-semibold text-amber-900 mb-2">Tips for Mindfulness Practice</h3>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Start small: Even 3 minutes daily is powerful</li>
          <li>• Find a quiet space where you won't be disturbed</li>
          <li>• It's okay if your mind wanders—gently bring it back</li>
          <li>• Practice at the same time each day to build a habit</li>
          <li>• Try different exercises to find what resonates</li>
          <li>• Combine with breathwork or meditation for deeper practice</li>
        </ul>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-6">
        <h3 className="font-semibold text-indigo-900 mb-3">Science-Backed Benefits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-700">
          <div>
            <h4 className="font-semibold mb-1">Mental Benefits</h4>
            <ul className="space-y-1">
              <li>• Reduces anxiety and depression</li>
              <li>• Improves focus and attention</li>
              <li>• Enhances emotional regulation</li>
              <li>• Decreases rumination</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Physical Benefits</h4>
            <ul className="space-y-1">
              <li>• Lowers blood pressure</li>
              <li>• Reduces chronic pain</li>
              <li>• Improves sleep quality</li>
              <li>• Strengthens immune function</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MindfulnessExercises;
