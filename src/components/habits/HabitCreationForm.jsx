// src/components/habits/HabitCreationForm.jsx

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { createHabit } from '../../services/db/habits.service';

const CATEGORIES = ['Sleep', 'Focus & Clarity', 'Movement', 'Mindfulness', 'Connection', 'General'];

const VALUE_OPTIONS = [
  'Health & Vitality',
  'Peace of Mind',
  'Personal Growth',
  'Connection & Belonging',
  'Achievement & Purpose',
  'Creativity',
  'Balance',
];

const SECTIONS = [
  { key: 'action', label: 'Action', required: true },
  { key: 'identity', label: 'Identity' },
  { key: 'intention', label: 'Intention' },
  { key: 'trigger', label: 'Trigger' },
  { key: 'scaling', label: 'Scaling' },
  { key: 'review', label: 'Review' },
];

function SectionHeader({ label, required, isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 text-left"
    >
      <span className="font-medium text-soft-charcoal flex items-center gap-1.5">
        {label}
        {required && <span className="text-xs text-evergreen-teal font-normal">(required)</span>}
      </span>
      {isOpen ? (
        <ChevronUp size={18} className="text-muted-sage-gray" />
      ) : (
        <ChevronDown size={18} className="text-muted-sage-gray" />
      )}
    </button>
  );
}

function inputCls() {
  return 'w-full border border-divider rounded-lg px-3 py-2 text-soft-charcoal text-sm focus:outline-none focus:ring-2 focus:ring-evergreen-teal focus:border-transparent';
}

export default function HabitCreationForm({ userId, onSave, onCancel }) {
  const [openSections, setOpenSections] = useState({ action: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Action fields
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState('Daily');
  const [category, setCategory] = useState('General');

  // Identity
  const [identityStatement, setIdentityStatement] = useState('');

  // Intention
  const [why, setWhy] = useState('');
  const [valueAlignment, setValueAlignment] = useState('');

  // Trigger
  const [timeOfDay, setTimeOfDay] = useState('');
  const [cue, setCue] = useState('');
  const [brainStateHint, setBrainStateHint] = useState('');

  // Scaling
  const [startSmall, setStartSmall] = useState('');
  const [fullVersion, setFullVersion] = useState('');

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setOpenSections(prev => ({ ...prev, action: true }));
      setError('Please enter a habit name.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        frequency: frequency.toLowerCase(),
        category,
        identityStatement: identityStatement.trim() || null,
        why: why.trim() || null,
        valueAlignment: valueAlignment || null,
        timeOfDay: timeOfDay.trim() || null,
        cue: cue.trim() || null,
        brainStateHint: brainStateHint.trim() || null,
        startSmall: startSmall.trim() || null,
        fullVersion: fullVersion.trim() || null,
      };
      const habit = await createHabit(userId, payload);
      if (onSave) onSave(habit);
    } catch (err) {
      console.error('Error creating habit:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Summary for Review section
  const reviewItems = [
    name && { label: 'Habit', value: name },
    { label: 'Frequency', value: frequency },
    { label: 'Category', value: category },
    identityStatement && { label: 'Identity', value: identityStatement },
    why && { label: 'Why', value: why },
    valueAlignment && { label: 'Value', value: valueAlignment },
    timeOfDay && { label: 'Time of day', value: timeOfDay },
    cue && { label: 'Cue', value: cue },
    startSmall && { label: 'Start small', value: startSmall },
    fullVersion && { label: 'Full version', value: fullVersion },
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg relative flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-divider flex-shrink-0">
          <h2 className="text-xl font-semibold text-soft-charcoal">New Habit</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-sage-gray hover:text-soft-charcoal transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-6 py-2">
          {error && (
            <p className="text-sm text-red-500 mb-3 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Action Section */}
          <div className="border-b border-divider">
            <SectionHeader
              label="Action"
              required
              isOpen={openSections.action}
              onToggle={() => toggleSection('action')}
            />
            {openSections.action && (
              <div className="pb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Habit name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Morning walk"
                    className={inputCls()}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Frequency</label>
                  <div className="flex gap-2">
                    {['Daily', 'Weekly', 'Custom'].map(opt => (
                      <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="frequency"
                          value={opt}
                          checked={frequency === opt}
                          onChange={() => setFrequency(opt)}
                          className="accent-evergreen-teal"
                        />
                        <span className="text-sm text-soft-charcoal">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={inputCls()}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Identity Section */}
          <div className="border-b border-divider">
            <SectionHeader
              label="Identity"
              isOpen={openSections.identity}
              onToggle={() => toggleSection('identity')}
            />
            {openSections.identity && (
              <div className="pb-4">
                <label className="block text-xs font-medium text-muted-sage-gray mb-1">
                  Identity statement
                </label>
                <input
                  type="text"
                  value={identityStatement}
                  onChange={(e) => setIdentityStatement(e.target.value)}
                  placeholder="I am someone who..."
                  className={inputCls()}
                />
              </div>
            )}
          </div>

          {/* Intention Section */}
          <div className="border-b border-divider">
            <SectionHeader
              label="Intention"
              isOpen={openSections.intention}
              onToggle={() => toggleSection('intention')}
            />
            {openSections.intention && (
              <div className="pb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Why this habit?</label>
                  <textarea
                    value={why}
                    onChange={(e) => setWhy(e.target.value)}
                    placeholder="What matters to you about this?"
                    rows={3}
                    className={inputCls() + ' resize-none'}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Value alignment</label>
                  <select
                    value={valueAlignment}
                    onChange={(e) => setValueAlignment(e.target.value)}
                    className={inputCls()}
                  >
                    <option value="">Select a value...</option>
                    {VALUE_OPTIONS.map(v => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Trigger Section */}
          <div className="border-b border-divider">
            <SectionHeader
              label="Trigger"
              isOpen={openSections.trigger}
              onToggle={() => toggleSection('trigger')}
            />
            {openSections.trigger && (
              <div className="pb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Time of day</label>
                  <input
                    type="text"
                    value={timeOfDay}
                    onChange={(e) => setTimeOfDay(e.target.value)}
                    placeholder="e.g. Morning, After lunch"
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Cue / prompt</label>
                  <input
                    type="text"
                    value={cue}
                    onChange={(e) => setCue(e.target.value)}
                    placeholder="e.g. After I pour my coffee"
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Brain state hint</label>
                  <input
                    type="text"
                    value={brainStateHint}
                    onChange={(e) => setBrainStateHint(e.target.value)}
                    placeholder="e.g. When I feel energized"
                    className={inputCls()}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Scaling Section */}
          <div className="border-b border-divider">
            <SectionHeader
              label="Scaling"
              isOpen={openSections.scaling}
              onToggle={() => toggleSection('scaling')}
            />
            {openSections.scaling && (
              <div className="pb-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Start small</label>
                  <input
                    type="text"
                    value={startSmall}
                    onChange={(e) => setStartSmall(e.target.value)}
                    placeholder="e.g. 5 minutes"
                    className={inputCls()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-sage-gray mb-1">Full version</label>
                  <input
                    type="text"
                    value={fullVersion}
                    onChange={(e) => setFullVersion(e.target.value)}
                    placeholder="e.g. 30-minute daily walk"
                    className={inputCls()}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Review Section */}
          <div>
            <SectionHeader
              label="Review"
              isOpen={openSections.review}
              onToggle={() => toggleSection('review')}
            />
            {openSections.review && (
              <div className="pb-4">
                {reviewItems.length === 0 ? (
                  <p className="text-sm text-muted-sage-gray italic">Fill in the sections above to see a summary here.</p>
                ) : (
                  <div className="space-y-2">
                    {reviewItems.map(({ label, value }) => (
                      <div key={label} className="flex gap-2 text-sm">
                        <span className="text-muted-sage-gray w-28 flex-shrink-0">{label}</span>
                        <span className="text-soft-charcoal">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-divider flex gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-divider text-soft-charcoal text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form=""
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-evergreen-teal text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Habit'}
          </button>
        </div>
      </div>
    </div>
  );
}
