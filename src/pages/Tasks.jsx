// src/pages/Tasks.jsx
import React, { useEffect, useState, useCallback } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Leaf, Plus, AlertCircle, CheckCircle2, Square, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore';

// ─── constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    badgeClass: 'bg-green-100 text-green-700',
    activeClass: 'bg-green-100 text-green-700 border-green-400',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-100 text-amber-700',
    activeClass: 'bg-amber-100 text-amber-700 border-amber-400',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-red-100 text-red-700',
    activeClass: 'bg-red-100 text-red-700 border-red-400',
  },
};

const PRIORITIES = ['low', 'medium', 'high'];

const EMPTY_FORM = { title: '', description: '', priority: 'medium' };

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  if (!cfg) return null;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
      {cfg.label}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onToggle, onEdit }) {
  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider px-4 py-3 flex items-center gap-3">
      {/* Checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="shrink-0 text-evergreen-teal hover:opacity-70 transition-opacity"
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? (
          <CheckCircle2 size={22} className="text-evergreen-teal" />
        ) : (
          <Square size={22} className="text-muted-sage-gray" />
        )}
      </button>

      {/* Content */}
      <button
        onClick={() => onEdit(task)}
        className="flex-1 min-w-0 text-left"
      >
        <p
          className={`font-medium text-sm leading-snug ${
            task.completed ? 'line-through text-muted-sage-gray' : 'text-soft-charcoal'
          }`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-sage-gray mt-0.5 truncate">{task.description}</p>
        )}
        <div className="mt-1">
          <PriorityBadge priority={task.priority} />
        </div>
      </button>
    </div>
  );
}

// ─── Task Modal (Create / Edit) ───────────────────────────────────────────────

function TaskModal({ task, userId, onClose, onSaved }) {
  const isEditing = Boolean(task);
  const [form, setForm] = useState(
    task
      ? { title: task.title, description: task.description || '', priority: task.priority || 'medium' }
      : EMPTY_FORM
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError('Task title is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (isEditing) {
        await updateDoc(doc(db, 'tasks', task.id), {
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
        });
      } else {
        await addDoc(collection(db, 'tasks'), {
          userId,
          title: form.title.trim(),
          description: form.description.trim(),
          priority: form.priority,
          completed: false,
          createdAt: serverTimestamp(),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving task:', err);
      setError('Failed to save task. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-vara-lg shadow-vara-md w-full max-w-md p-vara-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal">
            {isEditing ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {/* Title */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-soft-charcoal">Task Title *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g., Review project proposal"
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal placeholder-muted-sage-gray focus:outline-none focus:ring-2 focus:ring-evergreen-teal"
          />
        </label>

        {/* Description */}
        <label className="block mb-4">
          <span className="text-sm font-medium text-soft-charcoal">
            Description <span className="text-muted-sage-gray font-normal">(optional)</span>
          </span>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Add details..."
            rows={3}
            className="mt-1 w-full border border-divider rounded-vara-lg px-3 py-2 text-sm text-soft-charcoal placeholder-muted-sage-gray focus:outline-none focus:ring-2 focus:ring-evergreen-teal resize-none"
          />
        </label>

        {/* Priority selector */}
        <div className="mb-5">
          <p className="text-sm font-medium text-soft-charcoal mb-2">Priority</p>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => {
              const cfg = PRIORITY_CONFIG[p];
              const selected = form.priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={`flex-1 py-2 rounded-vara-lg border text-sm font-semibold transition-colors ${
                    selected
                      ? `${cfg.activeClass}`
                      : 'border-divider text-muted-sage-gray bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  {cfg.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-vara-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 rounded-vara-lg bg-evergreen-teal text-white text-sm font-semibold hover:bg-opacity-90 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todo');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);

    const q = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error('Error loading tasks:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user?.uid]);

  const todoCount = tasks.filter((t) => !t.completed).length;
  const doneCount = tasks.filter((t) => t.completed).length;

  const FILTER_OPTIONS = [
    { value: 'todo', label: `To Do (${todoCount})` },
    { value: 'done', label: `Done (${doneCount})` },
    { value: 'all', label: 'All' },
  ];

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'todo') return !t.completed;
    if (filter === 'done') return t.completed;
    return true;
  });

  const handleToggle = useCallback(async (task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { completed: !task.completed });
    } catch (err) {
      console.error('Error toggling task:', err);
    }
  }, []);

  const handleEdit = (task) => {
    setEditingTask(task);
    setShowModal(true);
  };

  const handleAddNew = () => {
    setEditingTask(null);
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTask(null);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SidebarLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-evergreen-teal border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-muted-sage-gray text-sm">Loading tasks...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SidebarLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <AlertCircle size={48} className="text-red-500 mb-4" />
          <h2 className="text-vara-lg font-semibold text-red-600 mb-2">Unable to Load Tasks</h2>
          <p className="text-muted-sage-gray mb-1 text-sm">
            There was a problem loading your tasks. Please check your connection and try again.
          </p>
          {error.message && (
            <p className="text-xs text-muted-sage-gray mb-4">Error: {error.message}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 border border-divider rounded-vara-lg text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Try again
          </button>
        </div>
      </SidebarLayout>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────
  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">

        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal">Tasks</h1>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-evergreen-teal text-white px-4 py-2 rounded-vara-lg text-sm font-semibold hover:bg-opacity-90 transition-colors shrink-0"
          >
            <Plus size={16} />
            Add Task
          </button>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 mt-5 mb-6">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-evergreen-teal text-white'
                  : 'bg-teal-light text-evergreen-teal hover:bg-evergreen-teal hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Task list / empty state */}
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full bg-teal-light flex items-center justify-center mb-4">
              {filter === 'done' ? (
                <CheckCircle2 size={28} className="text-evergreen-teal" />
              ) : (
                <Leaf size={28} className="text-evergreen-teal" />
              )}
            </div>
            <h3 className="font-semibold text-soft-charcoal mb-1">
              {filter === 'done' ? 'No completed tasks yet' : 'A clear space for what matters'}
            </h3>
            <p className="text-muted-sage-gray text-sm mb-6">
              {filter === 'done'
                ? 'Your completed tasks will appear here'
                : 'Add tasks whenever something comes to mind.'}
            </p>
            {filter !== 'done' && (
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 bg-evergreen-teal text-white px-5 py-2 rounded-vara-lg text-sm font-semibold hover:bg-opacity-90 transition-colors"
              >
                <Plus size={16} />
                Add a task
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <TaskModal
          task={editingTask}
          userId={user.uid}
          onClose={handleModalClose}
          onSaved={() => {}}
        />
      )}
    </SidebarLayout>
  );
}
