// src/components/dashboard/GoalEditModal.jsx

import React, { useState } from 'react';
import { X, Plus, Minus } from 'lucide-react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

const GoalEditModal = ({ goal, onClose, onSave }) => {
  const currentProgress = goal.progress || 0;
  const target = goal.target || 100;

  const [formData, setFormData] = useState({
    title: goal.title || '',
    progress: currentProgress,
    target: target,
    unit: goal.unit || ''
  });
  const [saving, setSaving] = useState(false);

  const handleProgressChange = (amount) => {
    const newProgress = Math.max(0, Math.min(formData.target, formData.progress + amount));
    setFormData({ ...formData, progress: newProgress });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateDoc(doc(db, 'goals', goal.id), {
        title: formData.title,
        progress: formData.progress,
        target: formData.target,
        unit: formData.unit,
        updatedAt: serverTimestamp()
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error updating goal:', error);
      alert('Failed to update goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const progressPercent = Math.round((formData.progress / formData.target) * 100);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Edit Goal</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Goal Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Goal Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-[#1B5E57] outline-none"
              required
            />
          </div>

          {/* Progress Section */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Update Progress
            </label>

            {/* Progress Controls */}
            <div className="flex items-center gap-3 mb-3">
              <button
                type="button"
                onClick={() => handleProgressChange(-1)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Minus size={20} className="text-gray-600" />
              </button>

              <input
                type="number"
                value={formData.progress}
                onChange={(e) => setFormData({ ...formData, progress: Number(e.target.value) || 0 })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-[#1B5E57] outline-none text-center font-bold text-lg"
                min="0"
                max={formData.target}
              />

              <button
                type="button"
                onClick={() => handleProgressChange(1)}
                className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Plus size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-bold text-[#1B5E57]">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] transition-all duration-300"
                  style={{ width: `${Math.min(progressPercent, 100)}%` }}
                />
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              {formData.progress} / {formData.target} {formData.unit}
            </p>
          </div>

          {/* Target */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target
            </label>
            <input
              type="number"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: Number(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-[#1B5E57] outline-none"
              required
              min="1"
            />
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit (optional)
            </label>
            <input
              type="text"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
              placeholder="e.g., workouts, books, hours"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-[#1B5E57] outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.title.trim()}
              className="flex-1 px-4 py-2 bg-[#1B5E57] text-white rounded-lg font-medium hover:bg-[#164e48] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GoalEditModal;
