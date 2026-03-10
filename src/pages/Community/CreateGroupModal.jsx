import React, { useState } from 'react';
import { X } from 'lucide-react';

const CreateGroupModal = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  const categoryOptions = [
    'Challenge',
    'Mindfulness',
    'Meditation',
    'Fitness',
    'Nutrition',
    'Habits',
    'Accountability',
    'Encouragement',
    'Support',
    'Sleep & Recovery',
    'Mental Wellness',
    'Breathwork',
    'Journaling',
    'Goal Setting',
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !category) return;

    const newGroup = {
      name,
      description,
      category,
      isPrivate,
      createdAt: new Date().toISOString(),
    };

    onCreate(newGroup);
    onClose();

    setName('');
    setDescription('');
    setCategory('');
    setIsPrivate(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-overlay z-50 flex items-center justify-center p-vara-base">
      <div className="bg-white rounded-vara-lg shadow-vara-lg p-vara-lg w-full max-w-md">
        <div className="flex items-center justify-between mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal">Create New Group</h2>
          <button onClick={onClose} className="p-2 rounded-vara-md hover:bg-dew-sage-light text-muted-sage-gray">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-vara-base">
          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm min-h-input text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-vara-sm font-medium text-soft-charcoal mb-vara-xs">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full border border-silver-sage rounded-vara-md p-vara-sm min-h-input text-vara-base text-soft-charcoal focus:border-evergreen-teal focus:outline-none transition-colors"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-vara-sm">
            <input
              type="checkbox"
              id="isPrivate"
              checked={isPrivate}
              onChange={() => setIsPrivate(!isPrivate)}
              className="w-4 h-4 rounded border-silver-sage text-evergreen-teal focus:ring-evergreen-teal"
            />
            <label htmlFor="isPrivate" className="text-vara-sm text-soft-charcoal">
              Private Group
            </label>
          </div>

          <div className="flex justify-end gap-vara-md pt-vara-base border-t border-divider">
            <button
              type="button"
              onClick={onClose}
              className="px-vara-base py-2 rounded-vara-md text-vara-sm border border-divider text-muted-sage-gray hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-vara-base py-2 rounded-vara-md text-vara-sm bg-evergreen-teal text-white font-medium hover:opacity-90 transition-opacity"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateGroupModal;
