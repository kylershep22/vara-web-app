// src/components/habits/HabitDetailPanel.jsx

import React, { useEffect, useCallback } from 'react';
import { X, Pencil, Trash2 } from 'lucide-react';
import ConsistencyRhythm from './ConsistencyRhythm';
import { EDUCATION_CARD_ITEMS } from '../../constants/brainInsightsCopy';

const CATEGORY_PILLAR_MAP = {
  'Sleep': 'energy',
  'Focus & Clarity': 'focus',
  'Movement': 'energy',
  'Mindfulness': 'focus',
  'Connection': 'connection',
  'General': 'growth',
};

const CATEGORY_COLORS = {
  'Sleep': 'bg-blue-100 text-blue-700',
  'Focus & Clarity': 'bg-purple-100 text-purple-700',
  'Movement': 'bg-orange-100 text-orange-700',
  'Mindfulness': 'bg-teal-100 text-teal-700',
  'Connection': 'bg-pink-100 text-pink-700',
  'General': 'bg-gray-100 text-gray-600',
};

function getBrainInsight(category) {
  const pillar = CATEGORY_PILLAR_MAP[category] || 'growth';
  const match = EDUCATION_CARD_ITEMS.find(item => item.pillar === pillar);
  return match || EDUCATION_CARD_ITEMS[0];
}

export default function HabitDetailPanel({ habit, completionDates = [], onEdit, onDelete, onClose }) {
  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  if (!habit) return null;

  const categoryColor = CATEGORY_COLORS[habit.category] || CATEGORY_COLORS['General'];
  const insight = getBrainInsight(habit.category);

  // Stats
  const totalCompletions = completionDates.length;
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const activeDaysThisWeek = completionDates.filter(d => {
    const date = new Date(d);
    return date >= startOfWeek && date <= today;
  }).length;

  const handleDelete = () => {
    if (window.confirm(`Delete "${habit.name || habit.title}"? This cannot be undone.`)) {
      if (onDelete) onDelete(habit.id);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-divider flex-shrink-0">
          <div className="space-y-1.5 pr-4">
            <h2 className="text-xl font-semibold text-soft-charcoal leading-snug">
              {habit.name || habit.title}
            </h2>
            {habit.category && (
              <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColor}`}>
                {habit.category}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-muted-sage-gray hover:text-soft-charcoal transition-colors flex-shrink-0 mt-0.5"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Stats row */}
          <div className="flex gap-4">
            <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-evergreen-teal">{totalCompletions}</p>
              <p className="text-xs text-muted-sage-gray mt-0.5">Total completions</p>
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-2xl font-semibold text-evergreen-teal">{activeDaysThisWeek}</p>
              <p className="text-xs text-muted-sage-gray mt-0.5">Days this week</p>
            </div>
          </div>

          {/* Consistency rhythm */}
          <div>
            <h3 className="text-sm font-semibold text-soft-charcoal mb-3">Consistency Rhythm</h3>
            <ConsistencyRhythm completionDates={completionDates} />
          </div>

          {/* Identity statement */}
          {habit.identityStatement && (
            <div className="bg-teal-light rounded-xl p-4">
              <p className="text-xs font-semibold text-evergreen-teal uppercase tracking-wide mb-1">Identity</p>
              <p className="text-sm text-soft-charcoal italic">"{habit.identityStatement}"</p>
            </div>
          )}

          {/* Brain health insight */}
          <div className="border border-divider rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-evergreen-teal uppercase tracking-wide">Brain health insight</p>
            <p className="text-sm font-medium text-soft-charcoal">{insight.title}</p>
            <p className="text-sm text-muted-sage-gray leading-relaxed">{insight.fact}</p>
            <p className="text-sm text-soft-charcoal">{insight.tip}</p>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-divider flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleDelete}
            className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            <Trash2 size={14} className="inline mr-1" />
            Delete
          </button>
          <button
            onClick={() => onEdit && onEdit(habit)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
