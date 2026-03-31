import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { HABIT_CATEGORIES, isCognitiveReserveCategory, getCRCallout } from "../../constants/habitCategories";
import { INTENTION_OPTIONS, INTENTION_CATEGORY_LABELS, INTENTION_CATEGORIES } from "../../constants/intentions";

const TOTAL_STEPS = 6;

const DEFAULT_FORM = {
  name: "",
  category: "",
  type: "daily",
  frequency: 1,
  identity: "",
  identityStatement: "",
  outcomeGoal: "",
  fullVersion: "",
  quickStartVersion: "",
  justShowUpVersion: "",
  cueType: "time",
  cueValue: "",
  implementationIntention: "",
  intentionLabel: "",
  intentionCategory: "",
  intentionIsCustom: false,
  valueAlignment: "",
  problem: "",
};

/**
 * 6-step habit creation wizard matching mobile identity-based flow.
 *
 * Props:
 *   onSubmit  – called with the complete form data object
 *   onClose   – called to dismiss the wizard
 *   goalId    – optional goalId to link the habit
 */
export default function HabitWizard({ onSubmit, onClose, goalId }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ ...DEFAULT_FORM });

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canAdvance() {
    if (step === 1) return form.name.trim().length > 0;
    return true; // Steps 2-5 are skippable
  }

  function handleNext() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }
  function handleBack() {
    if (step > 1) setStep(step - 1);
  }
  function handleSkip() {
    if (step < TOTAL_STEPS) setStep(step + 1);
  }

  function handleSubmit() {
    const data = { ...form };
    if (data.identity && !data.identityStatement) {
      data.identityStatement = `I'm becoming ${data.identity.toLowerCase()}`;
    }
    if (data.cueValue && data.name) {
      data.implementationIntention = `When ${data.cueValue}, I will ${data.name.toLowerCase()}`;
    }
    if (data.intentionLabel) {
      data.intention = {
        label: data.intentionLabel,
        category: data.intentionCategory,
        isCustom: data.intentionIsCustom,
      };
    }
    if (goalId) data.goalId = goalId;
    onSubmit(data);
  }

  const crCallout = getCRCallout(form.category);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-divider">
          <span className="text-sm text-muted-sage-gray">Step {step} of {TOTAL_STEPS}</span>
          <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
            <X size={20} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-evergreen-teal transition-all duration-300"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 1 && <Step1Action form={form} set={set} crCallout={crCallout} />}
          {step === 2 && <Step2Identity form={form} set={set} />}
          {step === 3 && <Step3Scaling form={form} set={set} />}
          {step === 4 && <Step4Trigger form={form} set={set} />}
          {step === 5 && <Step5Intention form={form} set={set} />}
          {step === 6 && <Step6Review form={form} set={set} crCallout={crCallout} />}
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between p-4 border-t border-divider">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-1 text-sm text-muted-sage-gray hover:text-soft-charcoal disabled:opacity-30"
          >
            <ChevronLeft size={16} /> Back
          </button>

          <div className="flex gap-2">
            {step > 1 && step < TOTAL_STEPS && (
              <button
                onClick={handleSkip}
                className="text-sm text-muted-sage-gray hover:text-soft-charcoal px-4 py-2"
              >
                Skip
              </button>
            )}

            {step < TOTAL_STEPS ? (
              <button
                onClick={handleNext}
                disabled={!canAdvance()}
                className="flex items-center gap-1 bg-evergreen-teal text-white px-4 py-2 rounded-lg text-sm hover:opacity-90 disabled:opacity-40 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="bg-evergreen-teal text-white px-6 py-2 rounded-lg text-sm hover:opacity-90 transition font-medium"
              >
                Save Habit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Step 1: Action (Required) ─────────────────────────────────── */

function Step1Action({ form, set, crCallout }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">What habit do you want to build?</h2>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Habit Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., Morning run, Read 20 pages"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Category</label>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal"
        >
          <option value="">Select a category...</option>
          {HABIT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {crCallout && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm font-medium text-teal-800 flex items-center gap-1">
            <Leaf size={14} /> {crCallout.headline}
          </p>
          <p className="text-xs text-teal-700 mt-1">{crCallout.body}</p>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-muted-sage-gray mb-1">Type</label>
          <div className="flex gap-2">
            {["daily", "weekly", "custom"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  set("type", t);
                  set("frequency", t === "daily" ? 1 : t === "weekly" ? 1 : form.frequency);
                }}
                className={`flex-1 py-2 rounded-lg text-sm border-2 transition ${
                  form.type === t
                    ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                    : "border-divider text-soft-charcoal"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {form.type === "custom" && (
        <div>
          <label className="block text-sm font-medium text-muted-sage-gray mb-1">Times per week</label>
          <input
            type="number"
            min={1}
            max={7}
            value={form.frequency}
            onChange={(e) => set("frequency", parseInt(e.target.value, 10) || 1)}
            className="w-24 border border-divider rounded-lg p-2 text-soft-charcoal"
          />
        </div>
      )}
    </div>
  );
}

/* ── Step 2: Identity (Skippable) ──────────────────────────────── */

function Step2Identity({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Who are you becoming?</h2>
      <p className="text-sm text-muted-sage-gray">
        Focus on the person you want to become, not just the outcome.
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Identity (e.g., "A runner", "Someone who writes")
        </label>
        <input
          type="text"
          value={form.identity}
          onChange={(e) => set("identity", e.target.value)}
          placeholder="A person who..."
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      {form.identity.trim() && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800 italic">
            "I'm becoming {form.identity.toLowerCase()}"
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Outcome Goal (optional)
        </label>
        <input
          type="text"
          value={form.outcomeGoal}
          onChange={(e) => set("outcomeGoal", e.target.value)}
          placeholder="e.g., Run a 5K"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 3: Scaling Versions (Skippable) ──────────────────────── */

function Step3Scaling({ form, set }) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set your scaling versions</h2>
      <p className="text-sm text-muted-sage-gray">
        On tough days, showing up is the win. Every version counts toward your progress!
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Full Version</label>
        <input
          type="text"
          value={form.fullVersion}
          onChange={(e) => set("fullVersion", e.target.value)}
          placeholder="e.g., Run 30 minutes"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Quick Start (5-10 min)</label>
        <input
          type="text"
          value={form.quickStartVersion}
          onChange={(e) => set("quickStartVersion", e.target.value)}
          placeholder="e.g., Run 10 minutes"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Just Show Up (1-2 min)</label>
        <input
          type="text"
          value={form.justShowUpVersion}
          onChange={(e) => set("justShowUpVersion", e.target.value)}
          placeholder="e.g., Put on shoes, step outside"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 4: Trigger (Skippable) ───────────────────────────────── */

const CUE_TYPES = [
  { value: "time", label: "Time", placeholder: "e.g., 7:00 AM" },
  { value: "after_habit", label: "After Habit", placeholder: "e.g., After breakfast" },
  { value: "location", label: "Location", placeholder: "e.g., At the gym" },
  { value: "emotion", label: "Feeling", placeholder: "e.g., When I feel stressed" },
];

function Step4Trigger({ form, set }) {
  const cueType = CUE_TYPES.find((c) => c.value === form.cueType) || CUE_TYPES[0];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set a trigger</h2>
      <p className="text-sm text-muted-sage-gray">
        Linking your habit to a cue makes it more likely to stick.
      </p>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">Cue Type</label>
        <div className="flex gap-2 flex-wrap">
          {CUE_TYPES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("cueType", c.value)}
              className={`px-3 py-2 rounded-lg text-sm border-2 transition ${
                form.cueType === c.value
                  ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
                  : "border-divider text-soft-charcoal"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">When?</label>
        <input
          type="text"
          value={form.cueValue}
          onChange={(e) => set("cueValue", e.target.value)}
          placeholder={cueType.placeholder}
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>

      {form.cueValue.trim() && form.name.trim() && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
          <p className="text-sm text-teal-800 italic">
            "When {form.cueValue}, I will {form.name.toLowerCase()}"
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Step 5: Intention (Skippable) ─────────────────────────────── */

function Step5Intention({ form, set }) {
  const [expandedCat, setExpandedCat] = useState(null);
  const [customMode, setCustomMode] = useState(false);

  function selectIntention(label, category) {
    set("intentionLabel", label);
    set("intentionCategory", category);
    set("intentionIsCustom", false);
    setCustomMode(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Set an intention</h2>
      <p className="text-sm text-muted-sage-gray">
        Why does this habit matter to you?
      </p>

      {INTENTION_CATEGORIES.map((cat) => (
        <div key={cat}>
          <button
            type="button"
            onClick={() => setExpandedCat(expandedCat === cat ? null : cat)}
            className="w-full text-left text-sm font-medium text-soft-charcoal py-2 flex items-center justify-between"
          >
            {INTENTION_CATEGORY_LABELS[cat]}
            <ChevronRight
              size={16}
              className={`transition-transform ${expandedCat === cat ? "rotate-90" : ""}`}
            />
          </button>

          {expandedCat === cat && (
            <div className="flex flex-wrap gap-2 pb-2">
              {INTENTION_OPTIONS[cat].map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => selectIntention(label, cat)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition ${
                    form.intentionLabel === label && !form.intentionIsCustom
                      ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal"
                      : "border-divider text-soft-charcoal hover:border-silver-sage"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}

      <div className="border-t border-divider pt-3">
        <button
          type="button"
          onClick={() => setCustomMode(!customMode)}
          className="text-sm text-evergreen-teal hover:underline"
        >
          Write your own
        </button>
        {customMode && (
          <input
            type="text"
            value={form.intentionIsCustom ? form.intentionLabel : ""}
            onChange={(e) => {
              set("intentionLabel", e.target.value);
              set("intentionCategory", "sustainable_consistency");
              set("intentionIsCustom", true);
            }}
            maxLength={80}
            placeholder="My intention is..."
            className="mt-2 w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-muted-sage-gray mb-1">
          Value alignment (optional)
        </label>
        <input
          type="text"
          value={form.valueAlignment}
          onChange={(e) => set("valueAlignment", e.target.value)}
          placeholder="e.g., Health, Family, Growth"
          className="w-full border border-divider rounded-lg p-3 text-soft-charcoal focus:ring-2 focus:ring-evergreen-teal focus:border-transparent"
        />
      </div>
    </div>
  );
}

/* ── Step 6: Review ────────────────────────────────────────────── */

function Step6Review({ form, crCallout }) {
  const rows = [
    { label: "Habit", value: form.name },
    { label: "Category", value: form.category || "—" },
    { label: "Type", value: form.type },
    { label: "Identity", value: form.identity || "—" },
    { label: "Full version", value: form.fullVersion || "—" },
    { label: "Quick start", value: form.quickStartVersion || "—" },
    { label: "Just show up", value: form.justShowUpVersion || "—" },
    { label: "Trigger", value: form.cueValue ? `${form.cueType}: ${form.cueValue}` : "—" },
    { label: "Intention", value: form.intentionLabel || "—" },
    { label: "Value", value: form.valueAlignment || "—" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-soft-charcoal">Review your habit</h2>

      {form.identity && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-center">
          <p className="text-sm text-teal-800 italic">
            "I'm becoming {form.identity.toLowerCase()}"
          </p>
        </div>
      )}

      <div className="divide-y divide-divider/50">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between py-2">
            <span className="text-sm text-muted-sage-gray">{r.label}</span>
            <span className="text-sm text-soft-charcoal font-medium text-right max-w-[60%] truncate">
              {r.value}
              {r.label === "Category" && crCallout && (
                <span className="ml-1 text-xs text-teal-600">🌿 CR</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
