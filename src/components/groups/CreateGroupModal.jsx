import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X } from 'lucide-react';

const categories = ['Accountability', 'Fitness', 'Nutrition', 'Mental Health', 'Sleep', 'Productivity'];
const groupTypes = ['Discussion', 'Challenge', 'Support', 'Learning'];

export default function CreateGroupModal({ isOpen, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    emoji: '🌱',
    isPublic: true,
    category: '',
    groupType: '',
    maxMembers: '',
    requiresApproval: false,
    tags: ''
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Group name is required';
    if (form.name.length > 50) newErrors.name = 'Max 50 characters';
    if (form.description.length > 250) newErrors.description = 'Max 250 characters';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    const payload = {
      ...form,
      maxMembers: form.maxMembers ? parseInt(form.maxMembers, 10) : null,
      tags: form.tags ? form.tags.split(',').map(tag => tag.trim()) : []
    };
    onCreate(payload);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black opacity-30" />

        <div className="relative bg-white rounded-xl max-w-lg w-full mx-auto shadow-xl p-6 z-10">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-semibold text-emerald-700">Create a Group</Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-medium text-sm mb-1">Group Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g., Mindful Mornings"
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
                rows={3}
                placeholder="Tell others what this group is about"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description}</p>}
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Privacy</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="true"
                    checked={form.isPublic === true}
                    onChange={() => setForm(prev => ({ ...prev, isPublic: true }))}
                  />
                  <span>Public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="false"
                    checked={form.isPublic === false}
                    onChange={() => setForm(prev => ({ ...prev, isPublic: false }))}
                  />
                  <span>Private</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Group Type</label>
              <select
                name="groupType"
                value={form.groupType}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Select type</option>
                {groupTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Max Members <span className="text-gray-400">(optional)</span></label>
              <input
                type="number"
                name="maxMembers"
                value={form.maxMembers}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="requiresApproval"
                checked={form.requiresApproval}
                onChange={handleChange}
              />
              <label className="text-sm">Require approval to join</label>
            </div>

            <div>
              <label className="block font-medium text-sm mb-1">Tags <span className="text-gray-400">(comma separated)</span></label>
              <input
                type="text"
                name="tags"
                value={form.tags}
                onChange={handleChange}
                placeholder="e.g., morning, mindfulness, community"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold"
              >
                Create Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}
