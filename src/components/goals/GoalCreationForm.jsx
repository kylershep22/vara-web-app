import React, { useState } from 'react';
import { Sparkles, CheckCircle, Plus } from 'lucide-react';
import AddHabitForm from '../habits/AddHabitForm';

const focusOptions = [
  'Mental Wellness',
  'Physical Health',
  'Nutrition',
  'Sleep & Recovery',
  'Mindset',
  'Community',
  'Spiritual',
  'Productivity'
];

const targetTypes = ['Duration', 'Frequency', 'Streak', 'Milestone'];
const measurements = ['Minutes', 'Days', 'Sessions', 'Repetitions'];
const timeframes = ['2 Weeks', '1 Month', '3 Months', 'Ongoing'];

export default function GoalCreationForm({ onSave, userId, userHabits, onNewHabitCreated, onCancel }) {
  const [step, setStep] = useState(1);
  const [showHabitModal, setShowHabitModal] = useState(false);

  const [goalData, setGoalData] = useState({
    focus: '',
    customFocus: '',
    goalText: '',
    targetType: '',
    measurement: '',
    frequency: '',
    timeframe: '',
    habitIds: [],
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleChange = (key, value) => {
    setGoalData(prev => ({ ...prev, [key]: value }));
  };

  const handleAddHabitId = (habitId) => {
    if (!goalData.habitIds.includes(habitId)) {
      setGoalData(prev => ({
        ...prev,
        habitIds: [...prev.habitIds, habitId],
      }));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Choose a Focus Area</h2>
            <select
              className="w-full mb-4 p-2 border border-gray-300 rounded"
              value={goalData.focus}
              onChange={e => handleChange('focus', e.target.value)}>
              <option value="">Select...</option>
              {focusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
              <option value="custom">Other...</option>
            </select>
            {goalData.focus === 'custom' && (
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Enter your custom focus area"
                value={goalData.customFocus}
                onChange={e => handleChange('customFocus', e.target.value)}
              />
            )}
          </div>
        );
      case 2:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Define Your Goal</h2>
            <textarea
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="e.g. Meditate daily to reduce stress"
              value={goalData.goalText}
              onChange={e => handleChange('goalText', e.target.value)}
            />
          </div>
        );
      case 3:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Set a Target</h2>
            <select
              className="w-full mb-2 p-2 border border-gray-300 rounded"
              value={goalData.targetType}
              onChange={e => handleChange('targetType', e.target.value)}>
              <option value="">Target Type</option>
              {targetTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              className="w-full mb-2 p-2 border border-gray-300 rounded"
              value={goalData.measurement}
              onChange={e => handleChange('measurement', e.target.value)}>
              <option value="">Measurement</option>
              {measurements.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="e.g. Daily, 3x per week"
              value={goalData.frequency}
              onChange={e => handleChange('frequency', e.target.value)}
            />
          </div>
        );
      case 4:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Choose a Timeframe</h2>
            <select
              className="w-full p-2 border border-gray-300 rounded"
              value={goalData.timeframe}
              onChange={e => handleChange('timeframe', e.target.value)}>
              <option value="">Select timeframe</option>
              {timeframes.map(tf => (
                <option key={tf} value={tf}>{tf}</option>
              ))}
            </select>
          </div>
        );
      case 5:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Link Habits</h2>
            <div className="space-y-2 mb-3">
              {goalData.habitIds.map((habitId, index) => {
                const habit = userHabits.find(h => h.id === habitId);
                return (
                  <div key={habitId} className="text-sm bg-[#D5E3D1] text-[#1B5E57] px-3 py-2 rounded">
                    {habit?.title || `Habit ID: ${habitId}`}
                  </div>
                );
              })}
            </div>
            <select
              className="w-full p-2 border border-gray-300 rounded mb-2"
              onChange={e => handleAddHabitId(e.target.value)}
              value=""
            >
              <option value="">Select from existing habits</option>
              {userHabits.map(habit => (
                <option key={habit.id} value={habit.id}>
                  {habit.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowHabitModal(true)}
              className="mt-2 px-4 py-2 bg-[#B8CDBA] text-white rounded hover:bg-[#9AAE8C] flex items-center gap-1"
            >
              <Plus size={16} /> Create New Habit
            </button>
          </div>
        );
      case 6:
        return (
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
              <CheckCircle size={20} /> Review & Save
            </h2>
            <p><strong>Focus:</strong> {goalData.focus === 'custom' ? goalData.customFocus : goalData.focus}</p>
            <p><strong>Goal:</strong> {goalData.goalText}</p>
            <p><strong>Target:</strong> {goalData.targetType} - {goalData.measurement} ({goalData.frequency})</p>
            <p><strong>Timeframe:</strong> {goalData.timeframe}</p>
            <p><strong>Habits:</strong></p>
            <ul className="list-disc ml-6">
              {goalData.habitIds.map(hId => {
                const h = userHabits.find(habit => habit.id === hId);
                return <li key={hId}>{h?.name || hId}</li>;
              })}
            </ul>
            <div className="mt-4 flex gap-2">
              <button
                className="px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#3E3E3E]"
                onClick={() => onSave(goalData)}
              >
                Save Goal
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-400 text-gray-700 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-xl border p-6 shadow-sm bg-white">
      {renderStep()}
      <div className="flex justify-between mt-4">
        {step > 1 && (
          <button
            className="px-4 py-2 border border-gray-400 text-gray-700 rounded hover:bg-gray-100"
            onClick={handleBack}
          >
            Back
          </button>
        )}
        {step < 6 && (
          <button
            className="ml-auto px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#3E3E3E]"
            onClick={handleNext}
          >
            Next
          </button>
        )}
      </div>

      {/* Modal for creating new habit */}
      {showHabitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowHabitModal(false)}
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-[#1B5E57] mb-4">Create a New Habit</h3>
            <AddHabitForm
              userId={userId}
              onSuccess={(newHabitId) => {
                handleAddHabitId(newHabitId);
                if (onNewHabitCreated) onNewHabitCreated(newHabitId);
                setShowHabitModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}


