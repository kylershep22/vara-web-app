// src/components/goals/GoalDetailsModal.jsx

import React, { useEffect, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

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

export default function GoalDetailsModal({ goal, habits, tasks, onClose, onDelete, onGoalUpdated }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...goal });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFormData({ ...goal });
  }, [goal]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!goal.id) return;
    setSaving(true);
    try {
      const goalRef = doc(db, 'goals', goal.id);
      await updateDoc(goalRef, formData);
      if (onGoalUpdated) onGoalUpdated();
      setEditing(false);
      onClose();
    } catch (err) {
      console.error('Failed to update goal:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Transition show={!!goal} as={Fragment}>
      <Dialog onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black opacity-30" />
          </Transition.Child>

          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <div className="relative bg-white rounded-xl max-w-2xl w-full mx-auto p-6 z-50 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <Dialog.Title className="text-2xl font-bold text-[#1B5E57]">
                  {editing ? 'Edit Goal' : goal.title}
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium">Title</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={formData.title || ''}
                      onChange={(e) => handleChange('title', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Category</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={formData.category || ''}
                      onChange={(e) => handleChange('category', e.target.value)}
                    >
                      <option value="">Select...</option>
                      {focusOptions.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium">Target Type</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={formData.target || ''}
                        onChange={(e) => handleChange('target', e.target.value)}
                      >
                        <option value="">Select</option>
                        {targetTypes.map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium">Measurement</label>
                      <select
                        className="w-full border rounded px-3 py-2"
                        value={formData.unit || ''}
                        onChange={(e) => handleChange('unit', e.target.value)}
                      >
                        <option value="">Select</option>
                        {measurements.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Frequency</label>
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      value={formData.frequency || ''}
                      onChange={(e) => handleChange('frequency', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium">Timeframe</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={formData.timeframe || ''}
                      onChange={(e) => handleChange('timeframe', e.target.value)}
                    >
                      <option value="">Select timeframe</option>
                      {timeframes.map((tf) => (
                        <option key={tf} value={tf}>{tf}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 border text-gray-600 rounded hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#164e48]"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-gray-700">
                  <p><strong>Category:</strong> {goal.category}</p>
                  <p><strong>Target:</strong> {goal.target} {goal.unit}</p>
                  <p><strong>Frequency:</strong> {goal.frequency}</p>
                  <p><strong>Timeframe:</strong> {goal.timeframe}</p>
                  <div>
                    <strong>Linked Habits:</strong>
                    <ul className="list-disc ml-5 mt-1">
                      {habits.filter(h => h.goalIds?.includes(goal.id)).map(h => (
                        <li key={h.id}>{h.title}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Tasks:</strong>
                    <ul className="list-disc ml-5 mt-1">
                      {tasks.filter(t => t.goalId === goal.id).map(t => (
                        <li key={t.id}>{t.title}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-between mt-6">
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(goal.id)}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}



