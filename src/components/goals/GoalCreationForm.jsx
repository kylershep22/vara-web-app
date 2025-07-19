import React, { useState } from 'react';
import { Sparkles, CheckCircle } from 'lucide-react';

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

export default function GoalCreationForm({ onSave }) {
  const [step, setStep] = useState(1);
  const [goalData, setGoalData] = useState({
    focus: '',
    customFocus: '',
    goalText: '',
    targetType: '',
    measurement: '',
    frequency: '',
    timeframe: '',
    habits: [],
  });

  const handleNext = () => setStep(step + 1);
  const handleBack = () => setStep(step - 1);

  const handleChange = (key, value) => {
    setGoalData(prev => ({ ...prev, [key]: value }));
  };

  const handleHabitChange = (index, value) => {
    const habits = [...goalData.habits];
    habits[index] = value;
    setGoalData(prev => ({ ...prev, habits }));
  };

  const addHabit = () => {
    setGoalData(prev => ({ ...prev, habits: [...prev.habits, ''] }));
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
            {goalData.habits.map((habit, index) => (
              <input
                key={index}
                className="w-full p-2 border border-gray-300 rounded mb-2"
                placeholder="e.g. 10 min guided meditation"
                value={habit}
                onChange={e => handleHabitChange(index, e.target.value)}
              />
            ))}
            <button
              className="mt-2 px-4 py-2 bg-[#B8CDBA] text-white rounded hover:bg-[#9AAE8C]"
              onClick={addHabit}
            >
              + Add Habit
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
              {goalData.habits.map((h, i) => <li key={i}>{h}</li>)}
            </ul>
            <button
              className="mt-4 px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#3E3E3E]"
              onClick={() => onSave(goalData)}
            >
              Save Goal
            </button>
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
    </div>
  );
}

