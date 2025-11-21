// src/pages/SetGoalFlow.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Activity, Heart, Moon, Sparkles, Target, Calendar, Flame, Trophy, CheckCircle } from 'lucide-react';
import "../../styles/custom.css"; // Ensure custom styles are loaded

// Goal templates by category
const goalTemplates = {
  physical: [
    { title: "Exercise 3x per week", action: "Exercise", target: 3, unit: "times/week", timeframe: 66, icon: Activity },
    { title: "Walk 10,000 steps daily", action: "Walk", target: 10000, unit: "steps/day", timeframe: 30, icon: Activity },
    { title: "Strength train 30 mins", action: "Strength train", target: 30, unit: "minutes", frequency: "3x/week", timeframe: 90, icon: Activity },
    { title: "Run 3 miles per week", action: "Run", target: 3, unit: "miles/week", timeframe: 66, icon: Activity },
  ],
  mental: [
    { title: "Meditate 10 mins daily", action: "Meditate", target: 10, unit: "minutes/day", timeframe: 21, icon: Heart },
    { title: "Journal 3x per week", action: "Journal", target: 3, unit: "times/week", timeframe: 30, icon: Heart },
    { title: "Practice gratitude daily", action: "Practice gratitude", target: 1, unit: "time/day", timeframe: 66, icon: Heart },
    { title: "Read 20 mins daily", action: "Read", target: 20, unit: "minutes/day", timeframe: 30, icon: Heart },
  ],
  sleep: [
    { title: "Sleep 8 hours nightly", action: "Sleep", target: 8, unit: "hours/night", timeframe: 30, icon: Moon },
    { title: "Bedtime routine by 10pm", action: "Complete bedtime routine", target: 22, unit: "hour", timeframe: 21, icon: Moon },
    { title: "No screens 1hr before bed", action: "Avoid screens", target: 1, unit: "hour before bed", timeframe: 21, icon: Moon },
  ],
  lifestyle: [
    { title: "Drink 8 glasses of water daily", action: "Drink water", target: 8, unit: "glasses/day", timeframe: 21, icon: Sparkles },
    { title: "Cook healthy meals 5x/week", action: "Cook healthy meals", target: 5, unit: "times/week", timeframe: 66, icon: Sparkles },
    { title: "Limit social media to 30 mins", action: "Limit social media", target: 30, unit: "minutes/day", timeframe: 30, icon: Sparkles },
    { title: "Practice a hobby 3x/week", action: "Practice hobby", target: 3, unit: "times/week", timeframe: 66, icon: Sparkles },
  ]
};

// Research-backed timeframe options
const timeframeOptions = [
  { value: 21, label: '21 days', subtitle: 'Build a new habit', color: 'bg-green-500', icon: Flame },
  { value: 30, label: '30 days', subtitle: 'Monthly challenge', color: 'bg-blue-500', icon: Calendar },
  { value: 66, label: '66 days', subtitle: 'Make it stick', color: 'bg-purple-500', icon: Target },
  { value: 90, label: '90 days', subtitle: 'Transform your life', color: 'bg-orange-500', icon: Trophy },
  { value: 180, label: '6 months', subtitle: 'Major change', color: 'bg-red-500', icon: Sparkles },
  { value: 365, label: '1 year', subtitle: 'Long-term goal', color: 'bg-indigo-500', icon: CheckCircle }
];

const SetGoalFlow = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    action: '',
    target: '',
    unit: '',
    timeframe: null,
    primaryFocus: '',
    refinedFocus: '',
    why: '',
    progress: 0
  });
  const [loading, setLoading] = useState(false);
  const [isCustomGoal, setIsCustomGoal] = useState(false);

  // Category selection handler
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedTemplate(null);
    setFormData({
      ...formData,
      primaryFocus: getCategoryLabel(category),
      refinedFocus: ''
    });
  };

  // Template selection handler
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    setFormData({
      ...formData,
      title: template.title,
      action: template.action,
      target: template.target,
      unit: template.unit,
      timeframe: template.timeframe,
      refinedFocus: template.action
    });
    setIsCustomGoal(false);
    setStep(2);
  };

  // Custom goal handler
  const handleCustomGoal = () => {
    setIsCustomGoal(true);
    setSelectedTemplate(null);
    setFormData({
      ...formData,
      title: '',
      action: '',
      target: '',
      unit: '',
      timeframe: null
    });
    setStep(2);
  };

  // Form change handler
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Navigate between steps
  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  // Calculate end date based on timeframe
  const calculateEndDate = (days) => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);
    return endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Submit goal
  const handleSubmit = () => {
    setLoading(true);
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        const uid = user.uid;
        const goalData = {
          userId: uid,
          title: formData.title,
          primaryFocus: formData.primaryFocus,
          refinedFocus: formData.refinedFocus,
          action: formData.action,
          target: formData.target,
          unit: formData.unit,
          timeframe: `${formData.timeframe} days`,
          why: formData.why || '',
          progress: 0,
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        addDoc(collection(db, 'goals'), goalData)
          .then(() => {
            navigate('/dashboard');
          })
          .catch((error) => {
            console.error('Error saving goal:', error);
            alert('Failed to save goal. Please try again.');
          })
          .finally(() => setLoading(false));
      } else {
        console.error('User not logged in.');
        setLoading(false);
      }
    });
  };

  // Helper to get category label
  const getCategoryLabel = (category) => {
    const labels = {
      physical: 'Physical Health & Fitness',
      mental: 'Mental & Emotional Wellness',
      sleep: 'Sleep & Recovery',
      lifestyle: 'Lifestyle & Personal Growth'
    };
    return labels[category] || '';
  };

  // Validation
  const canProceed = () => {
    if (step === 1) return selectedCategory !== null;
    if (step === 2) return formData.title && formData.action && formData.target && formData.unit;
    if (step === 3) return formData.timeframe !== null;
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            {[1, 2, 3].map((num) => (
              <React.Fragment key={num}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm transition-all ${
                  num < step ? 'bg-emerald-600 text-white' :
                  num === step ? 'bg-emerald-500 text-white ring-4 ring-emerald-200' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {num}
                </div>
                {num < 3 && (
                  <div className={`h-1 w-16 rounded-full transition-all ${
                    num < step ? 'bg-emerald-600' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="text-center text-sm text-gray-600">
            Step {step} of 3: {
              step === 1 ? "What's Your Goal?" :
              step === 2 ? "Make it Specific" :
              "Set Your Timeline"
            }
          </div>
        </div>

        {/* Step 1: Category & Template Selection */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">What's Your Goal?</h2>
              <p className="text-gray-600">Choose a category to see popular goals, or create your own</p>
            </div>

            {/* Category Cards */}
            {!selectedCategory && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: 'physical', label: 'Physical Health', icon: Activity, color: 'from-blue-500 to-blue-600' },
                  { id: 'mental', label: 'Mental Wellness', icon: Heart, color: 'from-purple-500 to-purple-600' },
                  { id: 'sleep', label: 'Sleep & Recovery', icon: Moon, color: 'from-indigo-500 to-indigo-600' },
                  { id: 'lifestyle', label: 'Lifestyle', icon: Sparkles, color: 'from-orange-500 to-orange-600' }
                ].map((cat) => {
                  const IconComponent = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`p-6 rounded-xl bg-gradient-to-br ${cat.color} text-white hover:scale-105 transition-transform shadow-lg`}
                    >
                      <IconComponent className="w-12 h-12 mx-auto mb-3" />
                      <div className="font-bold text-lg">{cat.label}</div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Template Selection */}
            {selectedCategory && (
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className="text-emerald-600 hover:text-emerald-700 font-medium text-sm flex items-center gap-1"
                >
                  ← Back to categories
                </button>
                <h3 className="text-xl font-bold text-gray-900">Popular {getCategoryLabel(selectedCategory)} Goals</h3>
                <div className="space-y-3">
                  {goalTemplates[selectedCategory].map((template, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
                    >
                      <div className="font-semibold text-gray-900 group-hover:text-emerald-700">{template.title}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {template.target} {template.unit} • {template.timeframe} days
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={handleCustomGoal}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-center"
                  >
                    <div className="font-semibold text-emerald-600">+ Create Custom Goal</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Goal Details */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Make it Specific & Measurable</h2>
              <p className="text-gray-600">SMART goals are more likely to succeed</p>
            </div>

            <div className="space-y-4">
              {/* Goal Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Goal Title</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="E.g., Exercise 3x per week"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Action */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">What will you do?</label>
                <input
                  type="text"
                  name="action"
                  value={formData.action}
                  onChange={handleChange}
                  placeholder="E.g., Exercise, Meditate, Read"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                />
              </div>

              {/* Target & Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">How much/often?</label>
                  <input
                    type="number"
                    name="target"
                    value={formData.target}
                    onChange={handleChange}
                    placeholder="E.g., 3"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Unit</label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    placeholder="E.g., times/week"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Live Preview */}
              {formData.action && formData.target && formData.unit && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4">
                  <div className="text-sm text-emerald-700 font-medium mb-1">Your Goal Preview:</div>
                  <div className="text-lg font-bold text-emerald-900">
                    {formData.action} {formData.target} {formData.unit}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Timeline & Review */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Set Your Timeline</h2>
              <p className="text-gray-600">Research-backed timeframes for lasting change</p>
            </div>

            {/* Timeframe Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {timeframeOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setFormData({ ...formData, timeframe: option.value })}
                    className={`p-5 rounded-xl border-2 transition-all text-left ${
                      formData.timeframe === option.value
                        ? 'border-emerald-500 bg-emerald-50 shadow-lg scale-105'
                        : 'border-gray-200 hover:border-emerald-300 hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`${option.color} p-2 rounded-lg`}>
                        <IconComponent className="w-5 h-5 text-white" />
                      </div>
                      <div className="font-bold text-lg text-gray-900">{option.label}</div>
                    </div>
                    <div className="text-sm text-gray-600">{option.subtitle}</div>
                    {formData.timeframe === option.value && (
                      <div className="text-xs text-emerald-700 font-medium mt-2">
                        Complete by {calculateEndDate(option.value)}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Why (Optional) */}
            {formData.timeframe && (
              <div className="pt-4 border-t border-gray-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Why is this goal important to you? (Optional)
                </label>
                <textarea
                  name="why"
                  value={formData.why}
                  onChange={handleChange}
                  placeholder="This will help keep you motivated..."
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none"
                />
              </div>
            )}

            {/* Review Card */}
            {formData.timeframe && (
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-6 shadow-xl">
                <div className="text-sm opacity-90 mb-2">Your SMART Goal</div>
                <div className="text-2xl font-bold mb-4">{formData.title}</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="opacity-75">Target</div>
                    <div className="font-semibold">{formData.target} {formData.unit}</div>
                  </div>
                  <div>
                    <div className="opacity-75">Timeline</div>
                    <div className="font-semibold">{formData.timeframe} days</div>
                  </div>
                  <div className="col-span-2">
                    <div className="opacity-75">Complete By</div>
                    <div className="font-semibold">{calculateEndDate(formData.timeframe)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-8">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-6 py-3 text-gray-700 font-semibold hover:text-gray-900 transition-colors"
            >
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`ml-auto px-8 py-3 rounded-lg font-semibold transition-all ${
                canProceed()
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className={`ml-auto px-8 py-3 rounded-lg font-semibold transition-all ${
                canProceed() && !loading
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Creating Your Goal...' : 'Start My Goal! 🎯'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetGoalFlow;






