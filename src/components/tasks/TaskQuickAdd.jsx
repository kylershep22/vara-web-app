// src/components/tasks/TaskQuickAdd.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Plus, Calendar, X } from 'lucide-react';

/**
 * TaskQuickAdd - Inline task creation component
 *
 * Features:
 * - Expandable input (click to reveal full form)
 * - Optional due date picker
 * - Auto-focus on expand
 * - Keyboard shortcuts (Enter to save, Esc to cancel)
 * - Smart defaults (urgent-important quadrant)
 */
const TaskQuickAdd = ({ onAdd, defaultQuadrant = 'urgent-important' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      title: title.trim(),
      eisenhowerQuadrant: defaultQuadrant,
      dueDate: dueDate ? new Date(dueDate) : new Date(),
      status: 'pending',
    });

    // Reset
    setTitle('');
    setDueDate('');
    setShowDatePicker(false);
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setTitle('');
    setDueDate('');
    setShowDatePicker(false);
    setIsExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#1B5E57] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-gray-600 hover:text-[#1B5E57] font-medium"
      >
        <Plus size={20} />
        <span>Quick Add Task</span>
        <kbd className="hidden sm:inline-block px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300 ml-auto">
          ⌘K
        </kbd>
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border-2 border-[#1B5E57] p-4 shadow-lg">
      {/* Title Input */}
      <input
        ref={inputRef}
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="What needs to be done?"
        className="w-full text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none mb-3"
      />

      {/* Actions Row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Due Date Toggle */}
          <button
            type="button"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
              showDatePicker || dueDate
                ? 'bg-[#1B5E57] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Calendar size={16} />
            {dueDate ? new Date(dueDate).toLocaleDateString() : 'Due Date'}
          </button>

          {/* Date Picker (appears when toggled) */}
          {showDatePicker && (
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B5E57]"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Cancel */}
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Cancel (Esc)"
          >
            <X size={18} />
          </button>

          {/* Add Task */}
          <button
            type="submit"
            disabled={!title.trim()}
            className="px-4 py-2 rounded-lg bg-[#1B5E57] text-white font-medium hover:bg-[#174C46] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Add Task
          </button>
        </div>
      </div>

      {/* Hint */}
      <p className="text-xs text-gray-500 mt-2">
        Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300">Enter</kbd> to save,
        <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-300 ml-1">Esc</kbd> to cancel
      </p>
    </form>
  );
};

export default TaskQuickAdd;
