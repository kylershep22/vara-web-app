import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { 
  Target, 
  Sparkles, 
  CalendarDays, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle, 
  Plus,
  Clock,
  Zap,
  AlertTriangle,
  Archive,
  Link2,
  MoreHorizontal,
  X,
  Brain,
  Lightbulb,
  Magic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc
} from 'firebase/firestore';

import HabitList from '../components/habits/HabitList';
import AddHabitForm from '../components/habits/AddHabitForm';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';
import CalendarView from '../components/habits/CalendarView';
import GoalCreationForm from '../components/goals/GoalCreationForm';
import TaskCreationForm from '../components/tasks/TaskCreationForm';
import GoalDetailsModal from '../components/goals/GoalDetailsModal';

export default function ProductivityHub() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [habits, setHabits] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [expandedGoalId, setExpandedGoalId] = useState(null);

  const [creatingGoal, setCreatingGoal] = useState(false);
  const [creatingHabit, setCreatingHabit] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [selectedGoalForTask, setSelectedGoalForTask] = useState(null);
  const [selectedHabitForTask, setSelectedHabitForTask] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [taskFilter, setTaskFilter] = useState({ 
    goalId: 'all', 
    status: 'open' 
  });

  // AI Suggestions state
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestionType, setAiSuggestionType] = useState('goals');

  useEffect(() => {
    if (user) {
      fetchGoals();
      fetchHabits();
      fetchTasks();
    }
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const goalData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGoals(goalData);
  };

  const fetchHabits = async () => {
    const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const habitData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setHabits(habitData);
  };

  const fetchTasks = async () => {
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const taskData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setTasks(taskData);
  };

  const handleSaveGoal = async (goalData) => {
    if (!user?.uid) return;

    try {
      const mappedGoal = {
        title: goalData.goalText,
        category: goalData.focus === 'custom' ? goalData.customFocus : goalData.focus,
        target: goalData.targetType,
        unit: goalData.measurement,
        frequency: goalData.frequency,
        habitIds: goalData.habitIds,
        timeframe: goalData.timeframe,
        userId: user.uid,
        createdAt: new Date()
      };

      const docRef = await addDoc(collection(db, 'goals'), mappedGoal);
      await fetchGoals();
      setExpandedGoalId(docRef.id);
      setCreatingGoal(false);
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  const handleSaveHabit = async (habitData) => {
    if (!user?.uid) return;

    try {
      const mappedHabit = {
        ...habitData,
        userId: user.uid,
        createdAt: new Date()
      };

      await addDoc(collection(db, 'habits'), mappedHabit);
      await fetchHabits();
      setCreatingHabit(false);
    } catch (error) {
      console.error('Error saving habit:', error);
    }
  };

  const handleDeleteGoal = async (goalId) => {
    await deleteDoc(doc(db, 'goals', goalId));
    fetchGoals();
  };

  const toggleTaskStatus = async (taskId, currentStatus) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    fetchTasks();
  };

  const getTasksByQuadrant = (quadrant) => {
    return tasks.filter((task) => {
      const matchesQuadrant = task.eisenhowerQuadrant === quadrant;
      const matchesGoal = taskFilter.goalId === 'all' 
        ? true 
        : taskFilter.goalId === 'ungrouped' 
        ? !task.goalId 
        : task.goalId === taskFilter.goalId;
      const matchesStatus = taskFilter.status === 'all' 
        ? true 
        : task.status === (taskFilter.status === 'open' ? 'pending' : 'completed');
      
      return matchesQuadrant && matchesGoal && matchesStatus;
    });
  };

  const getLinkedGoal = (goalId) => {
    return goals.find(goal => goal.id === goalId);
  };

  const getLinkedHabit = (habitId) => {
    return habits.find(habit => habit.id === habitId);
  };

  // AI Suggestions Component
  const AIAssistantSection = () => (
    <div className="mb-8">
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 border border-purple-200/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                AI Assistant
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">Beta</span>
              </h2>
              <p className="text-sm text-gray-600">Get personalized suggestions powered by AI</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAISuggestions(!showAISuggestions)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              showAISuggestions 
                ? 'bg-purple-500 text-white shadow-md' 
                : 'bg-white text-purple-600 border border-purple-200 hover:bg-purple-50'
            }`}
          >
            <Lightbulb size={16} />
            {showAISuggestions ? 'Hide Suggestions' : 'Get Suggestions'}
          </button>
        </div>

        {showAISuggestions && (
          <div className="mt-6 space-y-4">
            {/* Type Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Get suggestions for:</span>
              <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                {[
                  { key: 'goals', label: 'Goals', icon: Target, color: 'text-green-600' },
                  { key: 'habits', label: 'Habits', icon: Sparkles, color: 'text-blue-600' },
                  { key: 'tasks', label: 'Tasks', icon: CheckCircle, color: 'text-orange-600' }
                ].map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => setAiSuggestionType(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      aiSuggestionType === key
                        ? 'bg-purple-100 text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={14} className={aiSuggestionType === key ? 'text-purple-600' : color} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* AI Suggestions Content */}
            <div className="bg-white rounded-xl p-4 border border-gray-200/50 shadow-sm">
              {aiSuggestionType === 'goals' && (
                <AIBasedSuggestions 
                  type="goals"
                  userId={user.uid}
                  context={{ goals, habits, tasks }}
                />
              )}
              {aiSuggestionType === 'habits' && (
                <AIBasedSuggestions 
                  type="habits"
                  userId={user.uid}
                  context={{ goals, habits, tasks }}
                />
              )}
              {aiSuggestionType === 'tasks' && (
                <AIBasedSuggestions 
                  type="tasks"
                  userId={user.uid}
                  context={{ goals, habits, tasks }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const EisenhowerQuadrant = ({ title, quadrant, color, icon: Icon, tasks }) => (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-3 h-[280px] flex flex-col`}>
      <div className="flex items-center gap-2 mb-3 flex-shrink-0">
        <Icon size={14} className="text-white" />
        <h4 className="font-semibold text-white text-xs">{title}</h4>
        <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
        {tasks.map(task => (
          <div 
            key={task.id}
            className={`bg-white/90 rounded p-2 text-xs transition-all hover:bg-white ${
              task.status === 'completed' ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-start gap-2">
              <button
                onClick={() => toggleTaskStatus(task.id, task.status)}
                className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  task.status === 'completed' 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300 hover:border-green-400'
                }`}
              >
                {task.status === 'completed' && (
                  <CheckCircle size={8} className="text-white" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`font-medium leading-tight ${
                  task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-800'
                }`}>
                  {task.title}
                </div>
                
                {(task.goalId || task.habitId) && (
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {task.goalId && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        {getLinkedGoal(task.goalId)?.title?.substring(0, 15) || 'Goal'}
                        {getLinkedGoal(task.goalId)?.title?.length > 15 ? '...' : ''}
                      </span>
                    )}
                    {task.habitId && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {getLinkedHabit(task.habitId)?.name?.substring(0, 15) || 'Habit'}
                        {getLinkedHabit(task.habitId)?.name?.length > 15 ? '...' : ''}
                      </span>
                    )}
                  </div>
                )}
                
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock size={8} />
                    {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SidebarLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target size={28} className="text-[#1B5E57]" />
            <h1 className="text-3xl font-semibold text-[#3E3E3E]">
              Productivity Hub
            </h1>
          </div>
          <p className="text-[#9AAE8C] max-w-2xl">
            Organize your goals, build supporting habits, and manage tasks with the Eisenhower Matrix for maximum productivity.
          </p>
        </div>

        {/* AI Assistant Section */}
        <AIAssistantSection />

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Goals Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#1B5E57] flex items-center gap-2">
                <Target size={20} />
                Goals
              </h2>
              <button
                onClick={() => setCreatingGoal(true)}
                className="flex items-center gap-1 text-sm text-[#1B5E57] border border-[#B8CDBA] px-3 py-1.5 rounded-lg hover:bg-[#B8CDBA] hover:text-white transition"
              >
                <Plus size={14} /> New Goal
              </button>
            </div>

            {creatingGoal && (
              <div className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#1B5E57]">Create New Goal</h3>
                  <button
                    onClick={() => setCreatingGoal(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close form"
                  >
                    <X size={18} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <GoalCreationForm 
                  userId={user.uid}
                  userHabits={habits}
                  onNewHabitCreated={fetchHabits}
                  onSave={handleSaveGoal}
                  onCancel={() => setCreatingGoal(false)}
                />
              </div>
            )}

            <div className="space-y-4">
              {goals.map((goal) => (
                <div key={goal.id} className="bg-white border-2 border-[#1B5E57] rounded-xl p-4 shadow-sm">
                  <div
                    className="flex justify-between items-start cursor-pointer"
                    onClick={() => setSelectedGoal(goal)}
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-[#1B5E57] flex items-center gap-2">
                        🎯 {goal.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-1">
                        {goal.category} • {goal.target} {goal.unit}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#9AAE8C]">
                        <span>{habits.filter(h => h.goalIds?.includes(goal.id)).length} habits</span>
                        <span>{tasks.filter(t => t.goalId === goal.id).length} tasks</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(goal.id);
                        }}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                      {expandedGoalId === goal.id ? (
                        <ChevronUp size={16} className="text-[#9AAE8C]" />
                      ) : (
                        <ChevronDown size={16} className="text-[#9AAE8C]" />
                      )}
                    </div>
                  </div>

                  {expandedGoalId === goal.id && (
                    <div className="mt-4 pt-4 border-t border-[#D5E3D1] space-y-4">
                      <CalendarView userId={user.uid} goalId={goal.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Goal Details Modal */}
            {selectedGoal && (
              <GoalDetailsModal
                goal={selectedGoal}
                habits={habits}
                tasks={tasks}
                onClose={() => setSelectedGoal(null)}
                onDelete={handleDeleteGoal}
              />
            )}
          </div>

          {/* Habits Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#9AAE8C] flex items-center gap-2">
                <Sparkles size={20} />
                Habits
              </h2>
              <button 
                onClick={() => setCreatingHabit(true)}
                className="flex items-center gap-1 text-sm text-[#9AAE8C] border border-[#9AAE8C] px-3 py-1.5 rounded-lg hover:bg-[#9AAE8C] hover:text-white transition"
              >
                <Plus size={14} /> New Habit
              </button>
            </div>

            {creatingHabit && (
              <div className="bg-white border border-[#9AAE8C] rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#9AAE8C]">Create New Habit</h3>
                  <button
                    onClick={() => setCreatingHabit(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close form"
                  >
                    <X size={18} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <AddHabitForm
                  userId={user.uid}
                  goals={goals}
                  onSave={handleSaveHabit}
                  onCancel={() => setCreatingHabit(false)}
                />
              </div>
            )}

            <div className="space-y-4">
              {habits.map((habit) => (
                <div key={habit.id} className="bg-white border-2 border-[#9AAE8C] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  {/* Header with streak info */}
                  <div className="bg-gradient-to-r from-[#9AAE8C]/5 to-[#9AAE8C]/10 p-4 border-b border-[#9AAE8C]/20">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-3 h-3 rounded-full ${
                            habit.type === 'daily' ? 'bg-green-500' :
                            habit.type === 'weekly' ? 'bg-blue-500' :
                            habit.type === 'monthly' ? 'bg-purple-500' :
                            'bg-gray-500'
                          }`}></div>
                          <h3 className="font-semibold text-[#9AAE8C] text-lg">
                            {habit.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span className={`px-2 py-1 rounded-full ${
                            habit.type === 'daily' ? 'bg-green-100 text-green-700' :
                            habit.type === 'weekly' ? 'bg-blue-100 text-blue-700' :
                            habit.type === 'monthly' ? 'bg-purple-100 text-purple-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {habit.type || habit.frequency}
                          </span>
                          <span>{tasks.filter(t => t.habitId === habit.id).length} tasks</span>
                        </div>
                      </div>
                      
                      {/* Streak indicator */}
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-[#9AAE8C] mb-1">
                          <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                          <span>7 day streak</span>
                        </div>
                        <button className="text-xs bg-[#9AAE8C] text-white px-3 py-1.5 rounded-lg hover:bg-[#7A9B6E] transition-colors">
                          Log Today
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 gap-3 text-sm text-gray-700">
                      {/* Habit details */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="font-medium text-gray-900">Type:</span>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`w-2 h-2 rounded-full ${
                              habit.type === 'daily' ? 'bg-green-500' :
                              habit.type === 'weekly' ? 'bg-blue-500' :
                              habit.type === 'monthly' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}></span>
                            <span className="text-gray-600">{habit.type || 'Custom'}</span>
                          </div>
                        </div>
                        <div>
                          <span className="font-medium text-gray-900">Frequency:</span>
                          <p className="text-gray-600 mt-1">{habit.frequency}</p>
                        </div>
                      </div>
                      
                      {habit.trigger && (
                        <div>
                          <span className="font-medium text-gray-900">🎯 Trigger:</span>
                          <p className="text-gray-600 mt-1 bg-blue-50 px-3 py-2 rounded-lg text-xs">
                            {habit.trigger}
                          </p>
                        </div>
                      )}
                      
                      {habit.reward && (
                        <div>
                          <span className="font-medium text-gray-900">🎁 Reward:</span>
                          <p className="text-gray-600 mt-1 bg-green-50 px-3 py-2 rounded-lg text-xs">
                            {habit.reward}
                          </p>
                        </div>
                      )}
                      
                      {/* Linked Goals */}
                      {habit.goalIds && habit.goalIds.length > 0 && (
                        <div>
                          <span className="font-medium text-gray-900">🔗 Linked Goals:</span>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {habit.goalIds.map((gId) => {
                              const goal = goals.find(g => g.id === gId);
                              return (
                                <span 
                                  key={gId} 
                                  className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full border border-blue-200 hover:bg-blue-200 transition-colors cursor-pointer"
                                >
                                  {goal ? goal.title : 'Unknown Goal'}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Progress indicators */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">This week's progress</span>
                          <span className="font-medium text-[#9AAE8C]">5/7 days</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                          <div className="bg-gradient-to-r from-[#9AAE8C] to-[#7A9B6E] h-2 rounded-full" style={{width: '71%'}}></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>🔥 Best streak: 14 days</span>
                          <span>📅 Next: Tomorrow</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tasks & Eisenhower Matrix Column */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[#E4BFA1] flex items-center gap-2">
                <CheckCircle size={20} />
                Task Matrix
              </h2>
              <button 
                onClick={() => setCreatingTask(true)}
                className="flex items-center gap-1 text-sm text-[#E4BFA1] border border-[#E4BFA1] px-3 py-1.5 rounded-lg hover:bg-[#E4BFA1] hover:text-white transition"
              >
                <Plus size={14} /> New Task
              </button>
            </div>

            {creatingTask && (
              <div className="bg-white border border-[#E4BFA1] rounded-xl p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[#E4BFA1]">Create New Task</h3>
                  <button
                    onClick={() => setCreatingTask(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Close form"
                  >
                    <X size={18} className="text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
                <TaskCreationForm
                  userId={user.uid}
                  goals={goals}
                  habits={habits}
                  onTaskCreated={fetchTasks}
                  onCancel={() => setCreatingTask(false)}
                />
              </div>
            )}

            {/* Enhanced Filter Controls */}
            <div className="bg-gradient-to-r from-white/80 via-white/90 to-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-4 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                <h3 className="text-sm font-medium text-gray-700">Filter Tasks</h3>
              </div>
              
                              <div className="flex flex-wrap gap-3">
                {/* Modern Goal Filter */}
                <div className="flex-1 min-w-[140px]">
                  <div className="relative">
                    <select 
                      value={taskFilter.goalId} 
                      onChange={(e) => setTaskFilter((prev) => ({ 
                        ...prev, 
                        goalId: e.target.value 
                      }))} 
                      className="w-full bg-white/70 border-0 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200/50 focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all appearance-none cursor-pointer hover:shadow-md"
                    >
                      <option value="all">🎯 All Goals</option>
                      <option value="ungrouped">📋 Ungrouped</option>
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          🎪 {g.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Modern Status Filter */}
                <div className="flex-1 min-w-[120px]">
                  <div className="relative">
                    <select 
                      value={taskFilter.status} 
                      onChange={(e) => setTaskFilter((prev) => ({ 
                        ...prev, 
                        status: e.target.value 
                      }))} 
                      className="w-full bg-white/70 border-0 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-gray-200/50 focus:ring-2 focus:ring-green-500/30 focus:bg-white transition-all appearance-none cursor-pointer hover:shadow-md"
                    >
                      <option value="open">⏳ Open Tasks</option>
                      <option value="completed">✅ Completed</option>
                      <option value="all">📊 All Tasks</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                {/* Quick Stats */}
                <div className="flex items-center gap-4 text-xs text-gray-500 ml-auto">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <span>Showing: {tasks.filter(t => {
                      const matchesGoal = taskFilter.goalId === 'all' 
                        ? true 
                        : taskFilter.goalId === 'ungrouped' 
                        ? !t.goalId 
                        : t.goalId === taskFilter.goalId;
                      const matchesStatus = taskFilter.status === 'all' 
                        ? true 
                        : t.status === (taskFilter.status === 'open' ? 'pending' : 'completed');
                      return matchesGoal && matchesStatus;
                    }).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Eisenhower Matrix */}
            <div className="grid grid-cols-2 gap-3">
              <EisenhowerQuadrant
                title="Urgent & Important"
                quadrant="urgent-important"
                color="from-red-500 to-red-600"
                icon={AlertTriangle}
                tasks={getTasksByQuadrant('urgent-important')}
              />
              <EisenhowerQuadrant
                title="Important, Not Urgent"
                quadrant="important-not-urgent"
                color="from-blue-500 to-blue-600"
                icon={Target}
                tasks={getTasksByQuadrant('important-not-urgent')}
              />
              <EisenhowerQuadrant
                title="Urgent, Not Important"
                quadrant="urgent-not-important"
                color="from-yellow-500 to-yellow-600"
                icon={Zap}
                tasks={getTasksByQuadrant('urgent-not-important')}
              />
              <EisenhowerQuadrant
                title="Neither Urgent nor Important"
                quadrant="neither"
                color="from-gray-500 to-gray-600"
                icon={Archive}
                tasks={getTasksByQuadrant('neither')}
              />
            </div>

            {/* Enhanced Task Summary */}
            <div className="bg-gradient-to-br from-white to-gray-50/50 rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={18} className="text-[#E4BFA1]" />
                <h3 className="font-semibold text-gray-800">Task Overview</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Tasks:</span>
                  <span className="font-semibold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    {tasks.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-semibold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {tasks.filter(t => t.status === 'completed').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Linked to Goals:</span>
                  <span className="font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                    {tasks.filter(t => t.goalId).length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Linked to Habits:</span>
                  <span className="font-semibold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {tasks.filter(t => t.habitId).length}
                  </span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500">Completion Rate</span>
                  <span className="font-medium text-gray-700">
                    {tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-500" 
                    style={{
                      width: `${tasks.length > 0 ? (tasks.filter(t => t.status === 'completed').length / tasks.length) * 100 : 0}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Enhanced Task List View */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle size={18} className="text-[#E4BFA1]" />
                    Task List
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="bg-gray-100 px-2 py-1 rounded-full">
                      {tasks.filter(task => {
                        const matchesGoal = taskFilter.goalId === 'all' 
                          ? true 
                          : taskFilter.goalId === 'ungrouped' 
                          ? !task.goalId 
                          : task.goalId === taskFilter.goalId;
                        const matchesStatus = taskFilter.status === 'all' 
                          ? true 
                          : task.status === (taskFilter.status === 'open' ? 'pending' : 'completed');
                        return matchesGoal && matchesStatus;
                      }).length} tasks
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {tasks.filter(task => {
                  const matchesGoal = taskFilter.goalId === 'all' 
                    ? true 
                    : taskFilter.goalId === 'ungrouped' 
                    ? !task.goalId 
                    : task.goalId === taskFilter.goalId;
                  const matchesStatus = taskFilter.status === 'all' 
                    ? true 
                    : task.status === (taskFilter.status === 'open' ? 'pending' : 'completed');
                  return matchesGoal && matchesStatus;
                }).length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <CheckCircle size={32} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-600 mb-1">No tasks match your current filters</p>
                    <p className="text-xs text-gray-500">Try adjusting your filters or create a new task</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {tasks.filter(task => {
                      const matchesGoal = taskFilter.goalId === 'all' 
                        ? true 
                        : taskFilter.goalId === 'ungrouped' 
                        ? !task.goalId 
                        : task.goalId === taskFilter.goalId;
                      const matchesStatus = taskFilter.status === 'all' 
                        ? true 
                        : task.status === (taskFilter.status === 'open' ? 'pending' : 'completed');
                      return matchesGoal && matchesStatus;
                    }).map(task => (
                      <div 
                        key={task.id} 
                        className={`p-4 hover:bg-gray-50 transition-colors ${
                          task.status === 'completed' ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => toggleTaskStatus(task.id, task.status)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                              task.status === 'completed' 
                                ? 'bg-green-500 border-green-500 scale-110' 
                                : 'border-gray-300 hover:border-green-400 hover:scale-110'
                            }`}
                          >
                            {task.status === 'completed' && (
                              <CheckCircle size={14} className="text-white" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-medium text-sm ${
                                  task.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                                }`}>
                                  {task.title}
                                </h4>
                                
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  {/* Eisenhower Quadrant Badge */}
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                                    task.eisenhowerQuadrant === 'urgent-important' ? 'bg-red-100 text-red-700 border border-red-200' :
                                    task.eisenhowerQuadrant === 'important-not-urgent' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                    task.eisenhowerQuadrant === 'urgent-not-important' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                    'bg-gray-100 text-gray-700 border border-gray-200'
                                  }`}>
                                    {task.eisenhowerQuadrant === 'urgent-important' ? '🚨 Urgent & Important' :
                                     task.eisenhowerQuadrant === 'important-not-urgent' ? '🎯 Important' :
                                     task.eisenhowerQuadrant === 'urgent-not-important' ? '⚡ Urgent' :
                                     '📦 Neither'}
                                  </span>
                                  
                                  {task.goalId && (
                                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                                      🎯 {getLinkedGoal(task.goalId)?.title || 'Unknown Goal'}
                                    </span>
                                  )}
                                  
                                  {task.habitId && (
                                    <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                                      ⚡ {getLinkedHabit(task.habitId)?.name || 'Unknown Habit'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-right flex-shrink-0">
                                {task.dueDate && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
                                    <Clock size={12} />
                                    {new Date(task.dueDate.seconds * 1000).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}







