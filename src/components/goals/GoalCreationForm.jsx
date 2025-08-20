// src/components/goals/GoalCreationForm.jsx
import React, { useMemo, useState } from 'react';
import {
  Sparkles,
  CheckCircle,
  Plus,
  Target,
  Ruler,
  Gauge,
  ClipboardList,
  ClipboardCheck,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import AddHabitForm from '../habits/AddHabitForm';

/* -------------------- UI helpers (hoisted for stable identity) -------------------- */

function StepHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3">
        <Icon className="text-[#1B5E57]" size={22} />
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {subtitle ? <p className="text-sm text-gray-500 mt-1">{subtitle}</p> : null}
    </div>
  );
}

function FieldLabel({ children }) {
  return <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>;
}

function HelpText({ children }) {
  return <p className="text-xs text-gray-500 mt-1">{children}</p>;
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-start gap-2 rounded-md bg-red-50 text-red-700 p-3 border border-red-200 mb-4">
      <AlertCircle size={18} className="mt-0.5" />
      <div className="text-sm">{message}</div>
    </div>
  );
}

function ProgressBar({ step, total }) {
  const progress = Math.round((step / total) * 100);
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Step {step} of {total}</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-2 bg-[#B8CDBA] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* -------------------- constants -------------------- */

const focusOptions = [
  'Mental Wellness',
  'Physical Health',
  'Nutrition',
  'Sleep & Recovery',
  'Mindset',
  'Community',
  'Spiritual',
  'Productivity',
];

const targetTypes = ['Duration', 'Frequency', 'Streak', 'Milestone'];
const measurements = ['Minutes', 'Days', 'Sessions', 'Repetitions', 'Miles', 'Steps', 'Calories'];
const quickTimeframes = [
  { label: '2 Weeks', days: 14 },
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
];

/* -------------------- main component -------------------- */

export default function GoalCreationForm({
  onSave,
  userId,
  userHabits = [],
  onNewHabitCreated,
  onCancel,
}) {
  const TOTAL_STEPS = 7;

  const [step, setStep] = useState(1);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [error, setError] = useState('');

  const [goalData, setGoalData] = useState({
    // Specific
    focus: '',
    customFocus: '',
    goalTitle: '',
    goalStatement: '',

    // Measurable
    targetType: '',
    measurementUnit: '',
    targetAmount: '', // string; parse on save/validate
    frequencyValue: '', // string; parse on save/validate
    frequencyPeriod: 'per week',
    successCriteria: '',

    // Achievable
    baselineAmount: '',
    baselineNotes: '',
    confidence: '7', // keep as string for inputs; parse on save

    // Relevant
    whyImportant: '',
    alignmentNotes: '',

    // Time-bound
    startDate: '',
    endDate: '',
    timeframeQuick: '',

    // Habits
    habitIds: [],
  });

  /* ---------- helpers ---------- */
  const update = (key, value) => setGoalData((prev) => ({ ...prev, [key]: value }));

  const parseNumber = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const n = Number(val);
    return Number.isNaN(n) ? '' : n;
  };

  const applyQuickTimeframe = (label, days) => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    update('timeframeQuick', label);
    update('startDate', today.toISOString().slice(0, 10));
    update('endDate', end.toISOString().slice(0, 10));
  };

  const addHabitId = (habitId) => {
    if (!habitId) return;
    setGoalData((prev) => (prev.habitIds.includes(habitId) ? prev : {
      ...prev, habitIds: [...prev.habitIds, habitId],
    }));
  };

  const removeHabitId = (habitId) => {
    setGoalData((prev) => ({
      ...prev,
      habitIds: prev.habitIds.filter((id) => id !== habitId),
    }));
  };

  const focusLabel = goalData.focus === 'custom'
    ? goalData.customFocus || 'Custom'
    : goalData.focus || '—';

  const measurableLine = useMemo(() => {
    const amt = goalData.targetAmount || '—';
    const unit = goalData.measurementUnit || '—';
    const freq = goalData.frequencyValue || '—';
    const period = goalData.frequencyPeriod || '—';
    return `${amt} ${unit}, ${freq} ${period}`;
  }, [goalData.targetAmount, goalData.measurementUnit, goalData.frequencyValue, goalData.frequencyPeriod]);

  const smartSummary = useMemo(() => {
    const parts = [
      `Focus: ${focusLabel}`,
      `Goal: ${goalData.goalTitle || '—'}`,
      `Specific: ${goalData.goalStatement || '—'}`,
      `Measurable: ${goalData.targetType || '—'} • ${measurableLine}`,
      `Achievable: Baseline ${goalData.baselineAmount || '—'} ${goalData.measurementUnit || ''} • Confidence ${goalData.confidence || '—'}/10`,
      `Relevant: ${goalData.whyImportant || '—'}`,
      goalData.startDate && goalData.endDate
        ? `Time-bound: ${goalData.startDate} → ${goalData.endDate}`
        : `Time-bound: —`,
    ];
    return parts.join('  •  ');
  }, [focusLabel, goalData, measurableLine]);

  /* ---------- validation ---------- */
  const validateStep = () => {
    setError('');
    switch (step) {
      case 1: {
        const focusChosen =
          goalData.focus &&
          (goalData.focus !== 'custom' || goalData.customFocus.trim() !== '');
        if (!focusChosen) return 'Please choose a focus area (or enter a custom focus).';
        if (!goalData.goalTitle.trim()) return 'Please give your goal a short, clear title.';
        if (!goalData.goalStatement.trim()) return 'Please write a one-sentence goal statement.';
        return '';
      }
      case 2: {
        if (!goalData.targetType) return 'Please choose a target type.';
        if (!goalData.measurementUnit) return 'Please choose a measurement unit.';
        const amt = parseNumber(goalData.targetAmount);
        if (amt === '' || amt <= 0) return 'Please enter a positive target amount.';
        const freq = parseNumber(goalData.frequencyValue);
        if (freq === '' || freq <= 0) return 'Please enter a positive frequency.';
        if (!goalData.frequencyPeriod) return 'Please choose a frequency period.';
        return '';
      }
      case 3: {
        const base = parseNumber(goalData.baselineAmount);
        if (base !== '' && base < 0) return 'Baseline cannot be negative.';
        const conf = parseNumber(goalData.confidence);
        if (conf === '' || conf < 1 || conf > 10) return 'Confidence should be between 1 and 10.';
        return '';
      }
      case 4: {
        if (!goalData.whyImportant.trim()) return 'Please describe why this goal is important to you.';
        return '';
      }
      case 5: {
        if (!goalData.startDate || !goalData.endDate) {
          return 'Please choose a start and end date (or use a quick timeframe).';
        }
        const start = new Date(goalData.startDate);
        const end = new Date(goalData.endDate);
        if (end <= start) return 'End date must be after the start date.';
        return '';
      }
      case 6:
      default:
        return '';
    }
  };

  const next = () => {
    const msg = validateStep();
    if (msg) return setError(msg);
    setStep((s) => s + 1);
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(1, s - 1));
  };

  /* ---------- step renderers (plain functions, NOT React components) ---------- */

  const renderSpecific = () => (
    <>
      <StepHeader
        icon={Target}
        title="Specific"
        subtitle="Choose a focus and write a one-sentence statement that clearly defines the behavior you’ll do."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Focus Area</FieldLabel>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.focus}
            onChange={(e) => update('focus', e.target.value)}
          >
            <option value="">Select…</option>
            {focusOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            <option value="custom">Other…</option>
          </select>
          {goalData.focus === 'custom' && (
            <>
              <FieldLabel>Custom Focus</FieldLabel>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="e.g., Marathon Training"
                value={goalData.customFocus}
                onChange={(e) => update('customFocus', e.target.value)}
              />
            </>
          )}
        </div>
        <div>
          <FieldLabel>Goal Title</FieldLabel>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Short, clear title (e.g., Daily Meditation)"
            value={goalData.goalTitle}
            onChange={(e) => update('goalTitle', e.target.value)}
          />
          <HelpText>Keep it punchy — this shows up on cards and dashboards.</HelpText>
        </div>
      </div>

      <div className="mt-4">
        <FieldLabel>Specific Goal Statement</FieldLabel>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          placeholder='e.g., "I will meditate using a 10-minute guided session right after my morning coffee."'
          value={goalData.goalStatement}
          onChange={(e) => update('goalStatement', e.target.value)}
          rows={3}
        />
        <HelpText>Tip: Include what you will do, when you will do it, and where.</HelpText>
      </div>
    </>
  );

  const renderMeasurable = () => (
    <>
      <StepHeader icon={Ruler} title="Measurable" subtitle="Define how you will measure progress and success." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Target Type</FieldLabel>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.targetType}
            onChange={(e) => update('targetType', e.target.value)}
          >
            <option value="">Select…</option>
            {targetTypes.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Measurement Unit</FieldLabel>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.measurementUnit}
            onChange={(e) => update('measurementUnit', e.target.value)}
          >
            <option value="">Select…</option>
            {measurements.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <FieldLabel>Target Amount</FieldLabel>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="e.g., 10"
            value={goalData.targetAmount}
            onChange={(e) => update('targetAmount', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <FieldLabel>Frequency</FieldLabel>
          <input
            type="number"
            min="1"
            step="1"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="e.g., 5"
            value={goalData.frequencyValue}
            onChange={(e) => update('frequencyValue', e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>Period</FieldLabel>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.frequencyPeriod}
            onChange={(e) => update('frequencyPeriod', e.target.value)}
          >
            <option value="per day">per day</option>
            <option value="per week">per week</option>
            <option value="per month">per month</option>
          </select>
        </div>
        <div>
          <FieldLabel>Success Criteria (optional)</FieldLabel>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="e.g., Hit 80% of weekly target for 4 weeks"
            value={goalData.successCriteria}
            onChange={(e) => update('successCriteria', e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 rounded-md bg-[#F6F9F6] border border-[#E3ECE2] p-3 text-sm">
        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-[#1B5E57]" />
          <span className="font-medium">Current measurable plan</span>
        </div>
        <div className="mt-1 text-gray-700">{measurableLine}</div>
      </div>
    </>
  );

  const renderAchievable = () => (
    <>
      <StepHeader icon={ClipboardCheck} title="Achievable" subtitle="Reality-check your target based on your current baseline." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <FieldLabel>Current Baseline (amount)</FieldLabel>
          <input
            type="number"
            min="0"
            step="1"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="e.g., 3"
            value={goalData.baselineAmount}
            onChange={(e) => update('baselineAmount', e.target.value)}
          />
          <HelpText>Where are you today using the same unit (if possible)?</HelpText>
        </div>
        <div className="md:col-span-2">
          <FieldLabel>Notes (optional)</FieldLabel>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded"
            placeholder="Context, constraints, or supports you have"
            value={goalData.baselineNotes}
            onChange={(e) => update('baselineNotes', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div>
          <FieldLabel>Confidence (1–10)</FieldLabel>
          <input
            type="number"
            min="1"
            max="10"
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.confidence}
            onChange={(e) => update('confidence', e.target.value)}
          />
          <HelpText>Aim for 7–8+. If lower, consider reducing the target.</HelpText>
        </div>
      </div>
    </>
  );

  const renderRelevant = () => (
    <>
      <StepHeader icon={ClipboardList} title="Relevant" subtitle="Connect this goal to your values and broader outcomes." />
      <div>
        <FieldLabel>Why is this goal important to you?</FieldLabel>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="e.g., Reduce anxiety, sleep better, be more present for my family…"
          value={goalData.whyImportant}
          onChange={(e) => update('whyImportant', e.target.value)}
          rows={3}
        />
      </div>
      <div className="mt-4">
        <FieldLabel>How does it align with your priorities? (optional)</FieldLabel>
        <textarea
          className="w-full p-2 border border-gray-300 rounded"
          placeholder="Tie to your focus areas, values, or current season of life."
          value={goalData.alignmentNotes}
          onChange={(e) => update('alignmentNotes', e.target.value)}
          rows={2}
        />
      </div>
    </>
  );

  const renderTimebound = () => (
    <>
      <StepHeader icon={Clock} title="Time-bound" subtitle="Choose a realistic timeframe to start and finish." />
      <div className="flex flex-wrap gap-2">
        {quickTimeframes.map((tf) => (
          <button
            key={tf.label}
            type="button"
            onClick={() => applyQuickTimeframe(tf.label, tf.days)}
            className={`px-3 py-1.5 rounded-full border text-sm ${
              goalData.timeframeQuick === tf.label
                ? 'bg-[#B8CDBA] text-white border-[#B8CDBA]'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tf.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            update('timeframeQuick', '');
            update('startDate', '');
            update('endDate', '');
          }}
          className="px-3 py-1.5 rounded-full border text-sm bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div>
          <FieldLabel>Start Date</FieldLabel>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.startDate}
            onChange={(e) => update('startDate', e.target.value)}
          />
        </div>
        <div>
          <FieldLabel>End Date</FieldLabel>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded"
            value={goalData.endDate}
            onChange={(e) => update('endDate', e.target.value)}
          />
        </div>
      </div>
    </>
  );

  const renderHabits = () => (
    <>
      <StepHeader icon={Sparkles} title="Link Habits" subtitle="Attach habits you’ll perform to reach this goal (recommended)." />
      <div className="space-y-2 mb-3">
        {goalData.habitIds.length === 0 ? (
          <p className="text-sm text-gray-500">No habits linked yet.</p>
        ) : (
          goalData.habitIds.map((habitId) => {
            const habit = userHabits.find((h) => h.id === habitId);
            return (
              <div
                key={habitId}
                className="flex items-center justify-between text-sm bg-[#D5E3D1] text-[#1B5E57] px-3 py-2 rounded"
              >
                <span>{habit?.title || `Habit ID: ${habitId}`}</span>
                <button
                  type="button"
                  onClick={() => removeHabitId(habitId)}
                  className="text-[#1B5E57]/70 hover:text-[#1B5E57] text-xs underline"
                >
                  Remove
                </button>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="md:col-span-2">
          <FieldLabel>Select Existing Habit</FieldLabel>
          <select
            className="w-full p-2 border border-gray-300 rounded"
            onChange={(e) => addHabitId(e.target.value)}
            value=""
          >
            <option value="">Choose…</option>
            {userHabits.map((h) => (
              <option key={h.id} value={h.id}>{h.title}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={() => setShowHabitModal(true)}
            className="w-full px-4 py-2 bg-[#B8CDBA] text-white rounded hover:bg-[#9AAE8C] flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Create New Habit
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Tip: Habits make your goal actionable. Link at least one consistent habit to boost success.
      </div>
    </>
  );

  const renderReview = () => (
    <>
      <StepHeader icon={CheckCircle} title="Review & Save" subtitle="Confirm your SMART goal details before saving." />
      <div className="rounded-lg border border-gray-200 p-4 bg-white">
        <div className="text-sm leading-6 text-gray-800">{smartSummary}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Focus</h4>
            <div className="text-sm">{focusLabel}</div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Title</h4>
            <div className="text-sm">{goalData.goalTitle || '—'}</div>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-semibold text-gray-700 mb-1">Specific Statement</h4>
            <div className="text-sm">{goalData.goalStatement || '—'}</div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Measurable</h4>
            <div className="text-sm">
              {goalData.targetType || '—'} • {measurableLine}
              {goalData.successCriteria ? ` • ${goalData.successCriteria}` : ''}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Achievable</h4>
            <div className="text-sm">
              Baseline: {goalData.baselineAmount || '—'} {goalData.measurementUnit || ''}
              {goalData.baselineNotes ? ` • ${goalData.baselineNotes}` : ''} • Confidence:{' '}
              {goalData.confidence || '—'}/10
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Relevant</h4>
            <div className="text-sm">{goalData.whyImportant || '—'}</div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-1">Time-bound</h4>
            <div className="text-sm">
              {goalData.startDate && goalData.endDate ? `${goalData.startDate} → ${goalData.endDate}` : '—'}
              {goalData.timeframeQuick ? ` • ${goalData.timeframeQuick}` : ''}
            </div>
          </div>

          <div className="md:col-span-2">
            <h4 className="font-semibold text-gray-700 mb-1">Linked Habits</h4>
            {goalData.habitIds.length === 0 ? (
              <div className="text-sm text-gray-500">None</div>
            ) : (
              <ul className="list-disc ml-5 text-sm">
                {goalData.habitIds.map((hId) => {
                  const h = userHabits.find((habit) => habit.id === hId);
                  return <li key={hId}>{h?.title || hId}</li>;
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        You can always edit this goal later from your dashboard.
      </div>

      <div className="mt-6 flex gap-2">
        <button
          className="px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#174C46]"
          onClick={() => {
            const msg = validateStep();
            if (msg) { setError(msg); return; }
            const payload = {
              userId,
              focus: goalData.focus === 'custom' ? goalData.customFocus.trim() : goalData.focus,
              goalTitle: goalData.goalTitle.trim(),
              goalStatement: goalData.goalStatement.trim(),
              targetType: goalData.targetType,
              measurementUnit: goalData.measurementUnit,
              targetAmount: Number(goalData.targetAmount),
              frequencyValue: Number(goalData.frequencyValue),
              frequencyPeriod: goalData.frequencyPeriod,
              successCriteria: goalData.successCriteria,
              baselineAmount: goalData.baselineAmount === '' ? null : Number(goalData.baselineAmount),
              baselineNotes: goalData.baselineNotes,
              confidence: Number(goalData.confidence),
              whyImportant: goalData.whyImportant,
              alignmentNotes: goalData.alignmentNotes,
              startDate: goalData.startDate,
              endDate: goalData.endDate,
              timeframeQuick: goalData.timeframeQuick,
              habitIds: goalData.habitIds,
              createdAt: new Date().toISOString(),
              status: 'active',
            };
            onSave && onSave(payload);
          }}
        >
          Save Goal
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderSpecific();
      case 2: return renderMeasurable();
      case 3: return renderAchievable();
      case 4: return renderRelevant();
      case 5: return renderTimebound();
      case 6: return renderHabits();
      case 7: return renderReview();
      default: return null;
    }
  };

  /* -------------------- render -------------------- */

  return (
    <div className="rounded-xl border p-6 shadow-sm bg-white">
      <ProgressBar step={step} total={TOTAL_STEPS} />
      <ErrorBanner message={error} />

      {renderStep()}

      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 && (
            <button
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              onClick={back}
              type="button"
            >
              <ChevronLeft size={16} /> Back
            </button>
          )}
        </div>

        {step < TOTAL_STEPS && (
          <button
            className="inline-flex items-center gap-2 ml-auto px-4 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#174C46]"
            onClick={next}
            type="button"
          >
            Next <ChevronRight size={16} />
          </button>
        )}
      </div>

      {/* Habit Modal */}
      {showHabitModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowHabitModal(false)}
              type="button"
              aria-label="Close"
            >
              ✕
            </button>
            <h3 className="text-lg font-semibold text-[#1B5E57] mb-4">Create a New Habit</h3>
            <AddHabitForm
              userId={userId}
              onSuccess={(newHabitId) => {
                addHabitId(newHabitId);
                onNewHabitCreated && onNewHabitCreated(newHabitId);
                setShowHabitModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}



