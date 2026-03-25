// src/components/dashboard/HabitCreateModal.jsx

import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { createHabit } from '../../services/db/habits.service';
import { getAllHabitCategories } from '../../constants/brainHealthMapping';

const HabitCreateModal = ({ userId, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const categories = getAllHabitCategories();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      let parsedReminderTime = null;
      if (reminderEnabled) {
        const [hour, minute] = reminderTime.split(':').map(Number);
        parsedReminderTime = { hour, minute };
      }

      await createHabit(userId, {
        name: name.trim(),
        category: category || null,
        frequency,
        reminderEnabled,
        reminderTime: parsedReminderTime,
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error creating habit:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-soft-charcoal">Create Habit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-sage-gray" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning meditation, Drink water"
              className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
              required
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Category <span className="text-muted-sage-gray font-normal">(optional)</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Toggle */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Frequency
            </label>
            <div className="flex rounded-lg border border-divider overflow-hidden">
              <button
                type="button"
                onClick={() => setFrequency('daily')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  frequency === 'daily'
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-white text-soft-charcoal hover:bg-dew-sage-light'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  frequency === 'weekly'
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-white text-soft-charcoal hover:bg-dew-sage-light'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Reminder Toggle + Time Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-soft-charcoal flex items-center gap-1.5">
                <Bell size={16} className="text-muted-sage-gray" />
                Reminder
              </label>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  reminderEnabled ? 'bg-evergreen-teal' : 'bg-silver-sage'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {reminderEnabled && (
              <div className="mt-2">
                <p className="text-xs text-muted-sage-gray mb-2">
                  Get a push notification if this habit isn't completed by this time
                </p>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-divider rounded-lg text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitCreateModal;
