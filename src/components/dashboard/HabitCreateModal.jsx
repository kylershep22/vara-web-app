// src/components/dashboard/HabitCreateModal.jsx

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const HabitCreateModal = ({ userId, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    frequency: 'daily',
    active: true
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await addDoc(collection(db, 'habits'), {
        userId: userId,
        name: formData.name,
        title: formData.name,
        type: formData.frequency,
        active: formData.active,
        streak: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error creating habit:', error);
      alert('Failed to create habit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-soft-charcoal">Create New Habit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-sage-gray" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Habit Name */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-2">
              Habit Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Morning meditation, Exercise, Read"
              className="w-full px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
              required
              autoFocus
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-2">
              Frequency
            </label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full px-4 py-2 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Active Status */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-evergreen-teal border-divider rounded focus:ring-evergreen-teal"
            />
            <label htmlFor="active" className="text-sm font-medium text-soft-charcoal">
              Active (show on dashboard)
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-divider rounded-lg text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-2 bg-evergreen-teal text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
