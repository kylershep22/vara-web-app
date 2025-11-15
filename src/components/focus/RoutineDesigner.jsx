// src/components/focus/RoutineDesigner.jsx

import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Clock,
  Save,
  Edit3,
  X,
  Sun,
  Moon,
  Calendar as CalendarIcon,
  Coffee,
  Dumbbell,
  BookOpen,
  Brain,
  Heart,
  Droplets,
  Music,
  Users,
  Check
} from 'lucide-react';

const RoutineDesigner = ({ userId }) => {
  const [routines, setRoutines] = useState([]);
  const [selectedRoutineType, setSelectedRoutineType] = useState('morning');
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [routineName, setRoutineName] = useState('');
  const [activities, setActivities] = useState([]);
  const [reminderTime, setReminderTime] = useState('');
  const [showActivityLibrary, setShowActivityLibrary] = useState(false);
  const [loading, setLoading] = useState(false);

  // Activity Library
  const activityLibrary = {
    morning: [
      { name: 'Meditation', duration: 10, icon: 'Brain', color: 'purple' },
      { name: 'Exercise', duration: 30, icon: 'Dumbbell', color: 'green' },
      { name: 'Journaling', duration: 15, icon: 'BookOpen', color: 'blue' },
      { name: 'Breakfast', duration: 20, icon: 'Coffee', color: 'orange' },
      { name: 'Reading', duration: 20, icon: 'BookOpen', color: 'indigo' },
      { name: 'Gratitude Practice', duration: 5, icon: 'Heart', color: 'red' },
      { name: 'Hydration', duration: 2, icon: 'Droplets', color: 'cyan' },
      { name: 'Cold Shower', duration: 5, icon: 'Droplets', color: 'blue' },
      { name: 'Stretching', duration: 10, icon: 'Dumbbell', color: 'green' },
      { name: 'Goal Review', duration: 10, icon: 'Check', color: 'teal' }
    ],
    evening: [
      { name: 'Evening Walk', duration: 20, icon: 'Dumbbell', color: 'green' },
      { name: 'Dinner', duration: 30, icon: 'Coffee', color: 'orange' },
      { name: 'Reading', duration: 30, icon: 'BookOpen', color: 'indigo' },
      { name: 'Meditation', duration: 15, icon: 'Brain', color: 'purple' },
      { name: 'Journaling', duration: 15, icon: 'BookOpen', color: 'blue' },
      { name: 'Relaxing Music', duration: 20, icon: 'Music', color: 'pink' },
      { name: 'Skincare Routine', duration: 10, icon: 'Heart', color: 'red' },
      { name: 'Tomorrow Planning', duration: 10, icon: 'CalendarIcon', color: 'gray' },
      { name: 'No Screens', duration: 60, icon: 'Moon', color: 'indigo' },
      { name: 'Gratitude Practice', duration: 5, icon: 'Heart', color: 'red' }
    ],
    sunday: [
      { name: 'Week Review', duration: 30, icon: 'CalendarIcon', color: 'gray' },
      { name: 'Goal Setting', duration: 20, icon: 'Check', color: 'teal' },
      { name: 'Meal Planning', duration: 30, icon: 'Coffee', color: 'orange' },
      { name: 'Meal Prep', duration: 60, icon: 'Coffee', color: 'orange' },
      { name: 'Laundry & Cleaning', duration: 45, icon: 'Heart', color: 'blue' },
      { name: 'Social Connection', duration: 60, icon: 'Users', color: 'pink' },
      { name: 'Deep Work Session', duration: 90, icon: 'Brain', color: 'purple' },
      { name: 'Learning Time', duration: 45, icon: 'BookOpen', color: 'indigo' },
      { name: 'Relaxation', duration: 30, icon: 'Moon', color: 'purple' }
    ]
  };

  useEffect(() => {
    if (userId) {
      fetchRoutines();
    }
  }, [userId]);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const routinesQuery = query(
        collection(db, 'routines'),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(routinesQuery);
      const routinesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRoutines(routinesData);
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentRoutine = () => {
    return routines.find(r => r.type === selectedRoutineType && r.active);
  };

  const startNewRoutine = () => {
    const defaultName = `My ${selectedRoutineType.charAt(0).toUpperCase() + selectedRoutineType.slice(1)} Routine`;
    setRoutineName(defaultName);
    setActivities([]);
    setReminderTime('');
    setEditingRoutine({ isNew: true });
  };

  const editExistingRoutine = (routine) => {
    setRoutineName(routine.name);
    setActivities([...routine.activities]);
    setReminderTime(routine.reminderTime || '');
    setSelectedRoutineType(routine.type);
    setEditingRoutine(routine);
  };

  const addActivity = (activity) => {
    setActivities(prev => [
      ...prev,
      {
        ...activity,
        id: Date.now(),
        order: prev.length
      }
    ]);
    setShowActivityLibrary(false);
  };

  const removeActivity = (activityId) => {
    setActivities(prev => prev.filter(a => a.id !== activityId));
  };

  const moveActivity = (index, direction) => {
    const newActivities = [...activities];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newActivities.length) return;

    [newActivities[index], newActivities[newIndex]] = [newActivities[newIndex], newActivities[index]];

    setActivities(newActivities.map((a, i) => ({ ...a, order: i })));
  };

  const updateActivityDuration = (activityId, duration) => {
    setActivities(prev =>
      prev.map(a => a.id === activityId ? { ...a, duration: parseInt(duration) || 0 } : a)
    );
  };

  const saveRoutine = async () => {
    if (!routineName.trim() || activities.length === 0) {
      alert('Please add a name and at least one activity');
      return;
    }

    setLoading(true);
    try {
      const routineData = {
        userId,
        name: routineName,
        type: selectedRoutineType,
        activities: activities.map((a, i) => ({
          name: a.name,
          duration: a.duration,
          order: i,
          icon: a.icon,
          color: a.color
        })),
        active: true,
        reminderTime: reminderTime || null,
        updatedAt: serverTimestamp()
      };

      if (editingRoutine?.isNew) {
        // Create new
        routineData.createdAt = serverTimestamp();

        // Deactivate other routines of same type
        const existingRoutines = routines.filter(r => r.type === selectedRoutineType);
        for (const routine of existingRoutines) {
          await updateDoc(doc(db, 'routines', routine.id), { active: false });
        }

        await addDoc(collection(db, 'routines'), routineData);
      } else if (editingRoutine?.id) {
        // Update existing
        await updateDoc(doc(db, 'routines', editingRoutine.id), routineData);
      }

      await fetchRoutines();
      setEditingRoutine(null);
      setRoutineName('');
      setActivities([]);
      setReminderTime('');
      alert('Routine saved successfully! 🎉');
    } catch (error) {
      console.error('Error saving routine:', error);
      alert('Failed to save routine. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const deleteRoutine = async (routineId) => {
    if (!window.confirm('Are you sure you want to delete this routine?')) return;

    try {
      await deleteDoc(doc(db, 'routines', routineId));
      await fetchRoutines();
      setEditingRoutine(null);
    } catch (error) {
      console.error('Error deleting routine:', error);
      alert('Failed to delete routine.');
    }
  };

  const cancelEdit = () => {
    setEditingRoutine(null);
    setRoutineName('');
    setActivities([]);
    setReminderTime('');
  };

  const getTotalDuration = () => {
    return activities.reduce((sum, a) => sum + (a.duration || 0), 0);
  };

  const getIconComponent = (iconName, size = 16) => {
    const icons = {
      Brain, Coffee, Dumbbell, BookOpen, Heart, Droplets, Music, Users,
      Check, CalendarIcon, Sun, Moon
    };
    const Icon = icons[iconName] || Check;
    return <Icon size={size} />;
  };

  const routineTypes = [
    { value: 'morning', label: 'Morning', icon: Sun, color: 'orange' },
    { value: 'evening', label: 'Evening', icon: Moon, color: 'indigo' },
    { value: 'sunday', label: 'Sunday', icon: CalendarIcon, color: 'purple' }
  ];

  const currentRoutine = getCurrentRoutine();

  if (loading && routines.length === 0) {
    return <div className="text-center py-8">Loading routines...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Routine Type Selector */}
      <div className="flex items-center gap-2 justify-center">
        {routineTypes.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.value}
              onClick={() => {
                setSelectedRoutineType(type.value);
                setEditingRoutine(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                selectedRoutineType === type.value
                  ? 'bg-[#1B5E57] text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon size={20} />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Editing View */}
      {editingRoutine ? (
        <div className="bg-white rounded-xl border-2 border-[#1B5E57] p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-gray-900">
              {editingRoutine.isNew ? 'Create New Routine' : 'Edit Routine'}
            </h3>
            <button
              onClick={cancelEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>

          {/* Routine Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Routine Name
            </label>
            <input
              type="text"
              value={routineName}
              onChange={(e) => setRoutineName(e.target.value)}
              placeholder="My Morning Routine"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-[#1B5E57] focus:ring-2 focus:ring-[#1B5E57]/20 outline-none"
            />
          </div>

          {/* Activities List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">
                Activities ({activities.length})
              </label>
              <div className="text-sm text-gray-600">
                Total: {getTotalDuration()} minutes
              </div>
            </div>

            {activities.length > 0 ? (
              <div className="space-y-2 mb-4">
                {activities.map((activity, index) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <div className={`w-10 h-10 rounded-full bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600`}>
                      {getIconComponent(activity.icon, 20)}
                    </div>

                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{activity.name}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} className="text-gray-400" />
                        <input
                          type="number"
                          value={activity.duration}
                          onChange={(e) => updateActivityDuration(activity.id, e.target.value)}
                          className="w-16 px-2 py-1 text-sm rounded border border-gray-300 focus:border-[#1B5E57] outline-none"
                        />
                        <span className="text-sm text-gray-600">min</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveActivity(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronUp size={18} />
                      </button>
                      <button
                        onClick={() => moveActivity(index, 'down')}
                        disabled={index === activities.length - 1}
                        className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronDown size={18} />
                      </button>
                      <button
                        onClick={() => removeActivity(activity.id)}
                        className="p-1 rounded hover:bg-red-100 text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 mb-4">
                <p className="text-gray-500">No activities yet</p>
              </div>
            )}

            {/* Add Activity Button */}
            <button
              onClick={() => setShowActivityLibrary(!showActivityLibrary)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-gray-300 text-gray-700 hover:border-[#1B5E57] hover:text-[#1B5E57] transition-all"
            >
              <Plus size={20} />
              Add Activity
            </button>

            {/* Activity Library */}
            {showActivityLibrary && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-3">Choose an activity:</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {activityLibrary[selectedRoutineType].map((activity, idx) => (
                    <button
                      key={idx}
                      onClick={() => addActivity(activity)}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-blue-200 hover:border-blue-400 hover:shadow-sm transition-all text-left"
                    >
                      <div className={`w-8 h-8 rounded-full bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600 flex-shrink-0`}>
                        {getIconComponent(activity.icon, 16)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {activity.name}
                        </div>
                        <div className="text-xs text-gray-500">{activity.duration}m</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reminder Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Daily Reminder (Optional)
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 focus:border-[#1B5E57] focus:ring-2 focus:ring-[#1B5E57]/20 outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={saveRoutine}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1B5E57] text-white hover:bg-[#174C46] transition-all font-semibold disabled:opacity-50"
            >
              <Save size={20} />
              {loading ? 'Saving...' : 'Save Routine'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-6 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all font-semibold"
            >
              Cancel
            </button>
            {editingRoutine?.id && (
              <button
                onClick={() => deleteRoutine(editingRoutine.id)}
                className="ml-auto flex items-center gap-2 px-4 py-3 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-all"
              >
                <Trash2 size={18} />
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        // View Mode
        <div>
          {currentRoutine ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">{currentRoutine.name}</h3>
                <button
                  onClick={() => editExistingRoutine(currentRoutine)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-all"
                >
                  <Edit3 size={16} />
                  Edit
                </button>
              </div>

              {/* Activities Timeline */}
              <div className="space-y-3 mb-4">
                {currentRoutine.activities.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <div className={`w-10 h-10 rounded-full bg-${activity.color}-100 flex items-center justify-center text-${activity.color}-600`}>
                      {getIconComponent(activity.icon, 20)}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{activity.name}</div>
                      <div className="text-sm text-gray-600 flex items-center gap-1">
                        <Clock size={14} />
                        {activity.duration} minutes
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-gray-400">
                      #{index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                  <div className="text-sm text-gray-600">Total Duration</div>
                  <div className="text-2xl font-bold text-[#1B5E57]">
                    {currentRoutine.activities.reduce((sum, a) => sum + a.duration, 0)} min
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Activities</div>
                  <div className="text-2xl font-bold text-[#1B5E57]">
                    {currentRoutine.activities.length}
                  </div>
                </div>
              </div>

              {currentRoutine.reminderTime && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-blue-900">
                    🔔 Daily reminder set for <span className="font-semibold">{currentRoutine.reminderTime}</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <CalendarIcon className="mx-auto mb-3 text-gray-300" size={48} />
              <p className="font-medium text-gray-700 mb-2">
                No {selectedRoutineType} routine yet
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Create a routine to optimize your {selectedRoutineType} for success
              </p>
              <button
                onClick={startNewRoutine}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#1B5E57] text-white hover:bg-[#174C46] transition-all font-semibold"
              >
                <Plus size={20} />
                Create {selectedRoutineType.charAt(0).toUpperCase() + selectedRoutineType.slice(1)} Routine
              </button>
            </div>
          )}
        </div>
      )}

      {/* Benefits Section */}
      {!editingRoutine && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
          <h3 className="font-semibold text-purple-900 mb-3">
            💡 Why Routines Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
            <div>
              <span className="font-semibold">Reduces Decision Fatigue:</span> Pre-planned activities eliminate the need to decide what to do next
            </div>
            <div>
              <span className="font-semibold">Builds Consistency:</span> Regular routines create lasting habits and momentum
            </div>
            <div>
              <span className="font-semibold">Optimizes Energy:</span> Structure your day around your natural energy patterns
            </div>
            <div>
              <span className="font-semibold">Improves Sleep:</span> Evening routines signal your body it's time to wind down
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutineDesigner;
