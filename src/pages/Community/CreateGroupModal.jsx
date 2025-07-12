import React, { useState } from 'react';

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

    // Reset form
    setName('');
    setDescription('');
    setCategory('');
    setIsPrivate(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Group Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-md p-2"
            >
              <option value="">Select a category</option>
              {categoryOptions.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={() => setIsPrivate(!isPrivate)}
              />
              Private Group
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm border border-gray-300 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700"
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
