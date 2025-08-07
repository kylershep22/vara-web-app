// src/components/tasks/TaskCreationForm.jsx

import React, { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  CalendarDays,
  Target,
  ClipboardList,
  Zap,
  AlertTriangle,
  Archive,
  CheckCircle
} from 'lucide-react';

const quadrantOptions = [
  { value: 'urgent-important', label: 'Urgent & Important', icon: AlertTriangle },
  { value: 'important-not-urgent', label: 'Important, Not Urgent', icon: Target },
  { value: 'urgent-not-important', label: 'Urgent, Not Important', icon: Zap },
  { value: 'neither', label: 'Neither Urgent nor Important', icon: Archive }
];

export default function TaskCreationForm({ userId, goals, habits, onTaskCreated, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [quadrant, setQuadrant] = useState('important-not-urgent');
  const [goalId, setGoalId] = useState('');
  const [habitId, setHabitId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !quadrant || !goalId) return;

    try {
      setLoading(true);
      const newTask = {
        userId,
        title: title.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        eisenhowerQuadrant: quadrant,
        goalId,
        habitId: habitId || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'tasks'), newTask);
      if (onTaskCreated) onTaskCreated();
    } catch (err) {
      console.error('Error creating task:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold text-[#E4BFA1] flex items-center gap-2">
        <ClipboardList size={20} /> Create a New Task
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">Task Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          placeholder="Write summary of key ideas"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          placeholder="Details, resources, or outcomes..."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Eisenhower Quadrant</label>
          <select
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value)}
            className="mt-1 w-full border rounded-lg p-2"
          >
            {quadrantOptions.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Link to Goal</label>
        <select
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
          required
        >
          <option value="">Select a goal...</option>
          {goals.map(goal => (
            <option key={goal.id} value={goal.id}>{goal.title}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Link to Habit (Optional)</label>
        <select
          value={habitId}
          onChange={(e) => setHabitId(e.target.value)}
          className="mt-1 w-full border rounded-lg p-2"
        >
          <option value="">None</option>
          {habits.map(habit => (
            <option key={habit.id} value={habit.id}>{habit.title}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-between gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 text-gray-600 px-4 py-2 rounded hover:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-[#E4BFA1] text-white px-4 py-2 rounded-lg hover:bg-[#d4a884] transition flex items-center gap-2"
        >
          {loading ? 'Saving...' : <><CheckCircle size={16} /> Save Task</>}
        </button>
      </div>
    </form>
  );
}