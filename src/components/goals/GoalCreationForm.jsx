// src/components/goals/GoalCreationForm.jsx

import React, { useState } from 'react';
import { Activity, Heart, Moon, Sparkles, Target, Calendar, Flame, Trophy, CheckCircle, X } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';

// Goal templates by category
const goalTemplates = {
  physical: [
    { title: "Exercise 3x per week", action: "Exercise", target: 3, unit: "times/week", timeframe: 66 },
    { title: "Walk 10,000 steps daily", action: "Walk", target: 10000, unit: "steps/day", timeframe: 30 },
    { title: "Strength train 30 mins", action: "Strength train", target: 30, unit: "minutes", frequency: "3x/week", timeframe: 90 },
    { title: "Run 3 miles per week", action: "Run", target: 3, unit: "miles/week", timeframe: 66 },
  ],
  mental: [
    { title: "Meditate 10 mins daily", action: "Meditate", target: 10, unit: "minutes/day", timeframe: 21 },
    { title: "Journal 3x per week", action: "Journal", target: 3, unit: "times/week", timeframe: 30 },
    { title: "Practice gratitude daily", action: "Practice gratitude", target: 1, unit: "time/day", timeframe: 66 },
    { title: "Read 20 mins daily", action: "Read", target: 20, unit: "minutes/day", timeframe: 30 },
  ],
  sleep: [
    { title: "Sleep 8 hours nightly", action: "Sleep", target: 8, unit: "hours/night", timeframe: 30 },
    { title: "Bedtime routine by 10pm", action: "Complete bedtime routine", target: 22, unit: "hour", timeframe: 21 },
    { title: "No screens 1hr before bed", action: "Avoid screens", target: 1, unit: "hour before bed", timeframe: 21 },
  ],
  lifestyle: [
    { title: "Drink 8 glasses of water daily", action: "Drink water", target: 8, unit: "glasses/day", timeframe: 21 },
    { title: "Cook healthy meals 5x/week", action: "Cook healthy meals", target: 5, unit: "times/week", timeframe: 66 },
    { title: "Limit social media to 30 mins", action: "Limit social media", target: 30, unit: "minutes/day", timeframe: 30 },
    { title: "Practice a hobby 3x/week", action: "Practice hobby", target: 3, unit: "times/week", timeframe: 66 },
  ]
};

// Research-backed timeframe options
const timeframeOptions = [
  { value: 21, label: '21 days', subtitle: 'Build a new habit', color: 'bg-evergreen-teal', icon: Flame },
  { value: 30, label: '30 days', subtitle: 'Monthly challenge', color: 'bg-blue-500', icon: Calendar },
  { value: 66, label: '66 days', subtitle: 'Make it stick', color: 'bg-purple-500', icon: Target },
  { value: 90, label: '90 days', subtitle: 'Transform your life', color: 'bg-orange-500', icon: Trophy },
  { value: 180, label: '6 months', subtitle: 'Major change', color: 'bg-red-500', icon: Sparkles },
  { value: 365, label: '1 year', subtitle: 'Long-term goal', color: 'bg-indigo-500', icon: CheckCircle }
];

export default function GoalCreationForm({ userId, onSave, onCancel }) {
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
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const goalData = {
        userId: userId,
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

      await onSave(goalData);
    } catch (error) {
      console.error('Error saving goal:', error);
      alert('Failed to save goal. Please try again.');
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-center gap-2 mb-4">
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs transition-all ${
                num < step ? 'bg-evergreen-teal text-white' :
                num === step ? 'bg-evergreen-teal text-white ring-4 ring-evergreen-teal/30' :
                'bg-silver-sage/30 text-muted-sage-gray'
              }`}>
                {num}
              </div>
              {num < 3 && (
                <div className={`h-1 w-12 rounded-full transition-all ${
                  num < step ? 'bg-evergreen-teal' : 'bg-silver-sage/30'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="text-center text-xs text-muted-sage-gray">
          Step {step} of 3: {
            step === 1 ? "What's Your Goal?" :
            step === 2 ? "Make it Specific" :
            "Set Your Timeline"
          }
        </div>
      </div>

      {/* Step 1: Category & Template Selection */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-soft-charcoal mb-1">What's Your Goal?</h3>
            <p className="text-sm text-muted-sage-gray">Choose a category to see popular goals, or create your own</p>
          </div>

          {/* Category Cards */}
          {!selectedCategory && (
            <div className="grid grid-cols-2 gap-3">
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
                    className={`p-4 rounded-xl bg-gradient-to-br ${cat.color} text-white hover:scale-105 transition-transform shadow-md`}
                  >
                    <IconComponent className="w-8 h-8 mx-auto mb-2" />
                    <div className="font-semibold text-sm">{cat.label}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Template Selection */}
          {selectedCategory && (
            <div className="space-y-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-evergreen-teal hover:text-evergreen-teal font-medium text-xs flex items-center gap-1"
              >
                ← Back to categories
              </button>
              <h4 className="text-sm font-bold text-soft-charcoal">Popular {getCategoryLabel(selectedCategory)} Goals</h4>
              <div className="space-y-2">
                {goalTemplates[selectedCategory].map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full p-3 border-2 border-divider rounded-lg hover:border-evergreen-teal/30 hover:bg-teal-light transition-all text-left group"
                  >
                    <div className="font-semibold text-sm text-soft-charcoal group-hover:text-evergreen-teal">{template.title}</div>
                    <div className="text-xs text-muted-sage-gray mt-0.5">
                      {template.target} {template.unit} • {template.timeframe} days
                    </div>
                  </button>
                ))}
                <button
                  onClick={handleCustomGoal}
                  className="w-full p-3 border-2 border-dashed border-divider rounded-lg hover:border-evergreen-teal/30 hover:bg-teal-light transition-all text-center"
                >
                  <div className="font-semibold text-sm text-evergreen-teal">+ Create Custom Goal</div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Goal Details */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-soft-charcoal mb-1">Make it Specific & Measurable</h3>
            <p className="text-sm text-muted-sage-gray">SMART goals are more likely to succeed</p>
          </div>

          {/* Goal Title */}
          <div>
            <label className="block text-xs font-semibold text-soft-charcoal mb-1">Goal Title</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="E.g., Exercise 3x per week"
              className="w-full px-3 py-2 text-sm border-2 border-divider rounded-lg focus:border-evergreen-teal/30 focus:ring-2 focus:ring-evergreen-teal outline-none transition-all"
            />
          </div>

          {/* Action */}
          <div>
            <label className="block text-xs font-semibold text-soft-charcoal mb-1">What will you do?</label>
            <input
              type="text"
              name="action"
              value={formData.action}
              onChange={handleChange}
              placeholder="E.g., Exercise, Meditate, Read"
              className="w-full px-3 py-2 text-sm border-2 border-divider rounded-lg focus:border-evergreen-teal/30 focus:ring-2 focus:ring-evergreen-teal outline-none transition-all"
            />
          </div>

          {/* Target & Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-soft-charcoal mb-1">How much/often?</label>
              <input
                type="number"
                name="target"
                value={formData.target}
                onChange={handleChange}
                placeholder="E.g., 3"
                className="w-full px-3 py-2 text-sm border-2 border-divider rounded-lg focus:border-evergreen-teal/30 focus:ring-2 focus:ring-evergreen-teal outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-soft-charcoal mb-1">Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="E.g., times/week"
                className="w-full px-3 py-2 text-sm border-2 border-divider rounded-lg focus:border-evergreen-teal/30 focus:ring-2 focus:ring-evergreen-teal outline-none transition-all"
              />
            </div>
          </div>

          {/* Live Preview */}
          {formData.action && formData.target && formData.unit && (
            <div className="bg-teal-light border-2 border-evergreen-teal/30 rounded-lg p-3">
              <div className="text-xs text-evergreen-teal font-medium mb-0.5">Your Goal Preview:</div>
              <div className="text-base font-bold text-evergreen-teal">
                {formData.action} {formData.target} {formData.unit}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Timeline & Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="text-center">
            <h3 className="text-xl font-bold text-soft-charcoal mb-1">Set Your Timeline</h3>
            <p className="text-sm text-muted-sage-gray">Research-backed timeframes for lasting change</p>
          </div>

          {/* Timeframe Options */}
          <div className="grid grid-cols-2 gap-3">
            {timeframeOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, timeframe: option.value })}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    formData.timeframe === option.value
                      ? 'border-evergreen-teal/30 bg-teal-light shadow-md scale-105'
                      : 'border-divider hover:border-evergreen-teal/30 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`${option.color} p-1.5 rounded-lg`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div className="font-bold text-sm text-soft-charcoal">{option.label}</div>
                  </div>
                  <div className="text-xs text-muted-sage-gray">{option.subtitle}</div>
                  {formData.timeframe === option.value && (
                    <div className="text-xs text-evergreen-teal font-medium mt-1">
                      By {calculateEndDate(option.value)}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Why (Optional) */}
          {formData.timeframe && (
            <div className="pt-3 border-t border-divider">
              <label className="block text-xs font-semibold text-soft-charcoal mb-1">
                Why is this goal important to you? (Optional)
              </label>
              <textarea
                name="why"
                value={formData.why}
                onChange={handleChange}
                placeholder="This will help keep you motivated..."
                rows="2"
                className="w-full px-3 py-2 text-sm border-2 border-divider rounded-lg focus:border-evergreen-teal/30 focus:ring-2 focus:ring-evergreen-teal outline-none transition-all resize-none"
              />
            </div>
          )}

          {/* Review Card */}
          {formData.timeframe && (
            <div className="bg-gradient-to-br from-evergreen-teal to-silver-sage text-white rounded-lg p-4 shadow-lg">
              <div className="text-xs opacity-90 mb-1">Your SMART Goal</div>
              <div className="text-lg font-bold mb-3">{formData.title}</div>
              <div className="grid grid-cols-2 gap-3 text-xs">
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
      <div className="flex justify-between items-center pt-4 border-t border-divider">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-muted-sage-gray hover:text-soft-charcoal font-medium transition-colors"
        >
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-sm text-soft-charcoal font-semibold hover:text-soft-charcoal transition-colors"
            >
              ← Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`px-6 py-2 text-sm rounded-lg font-semibold transition-all ${
                canProceed()
                  ? 'bg-evergreen-teal text-white hover:bg-evergreen-teal/90 shadow-md hover:shadow-lg'
                  : 'bg-silver-sage text-muted-sage-gray cursor-not-allowed'
              }`}
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !canProceed()}
              className={`px-6 py-2 text-sm rounded-lg font-semibold transition-all ${
                canProceed() && !loading
                  ? 'bg-evergreen-teal text-white hover:bg-evergreen-teal/90 shadow-md hover:shadow-lg'
                  : 'bg-silver-sage text-muted-sage-gray cursor-not-allowed'
              }`}
            >
              {loading ? 'Creating...' : 'Create Goal 🎯'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
