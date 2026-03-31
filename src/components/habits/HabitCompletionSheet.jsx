import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { isCognitiveReserveCategory } from "../../constants/habitCategories";

const REFLECTIONS = [
  { value: "smooth", label: "Smooth", emoji: "✓" },
  { value: "okay", label: "Okay", emoji: "~" },
  { value: "hard", label: "Hard today", emoji: "!" },
];

const CONNECTION_REFLECTIONS = [
  { value: "nourishing", label: "Nourishing", emoji: "🌿" },
  { value: "fine", label: "Fine", emoji: "~~" },
  { value: "draining", label: "Draining", emoji: "◌" },
];

const AFFIRMATIONS = {
  smooth: { title: "Captured. Building.", body: null },
  okay: { title: "Captured.", body: "Showing up is the work." },
  hard: { title: "Captured.", body: "Hard days count the most." },
  skip: { title: "Captured.", body: null },
  nourishing: { title: "Captured.", body: "That kind of connection is genuinely restorative." },
  fine: { title: "Captured.", body: "Connection is connection. It counts." },
  draining: { title: "Captured.", body: "Worth noticing. Your energy matters too." },
};

/**
 * Modal shown after toggling a habit complete.
 * Captures a reflection (smooth/okay/hard) or connection quality (nourishing/fine/draining).
 *
 * Props:
 *   habit        – the habit object being completed
 *   onSubmit     – called with { reflection, connectionQuality, skippedReflection, crFlagged, valueAlignment }
 *   onClose      – called when the sheet should close (cancel or after affirmation)
 */
export default function HabitCompletionSheet({ habit, onSubmit, onClose }) {
  const [selected, setSelected] = useState(null);
  const [affirmation, setAffirmation] = useState(null);

  const isConnection = habit?.category === "Connection";
  const isCR = isCognitiveReserveCategory(habit?.category);
  const options = isConnection ? CONNECTION_REFLECTIONS : REFLECTIONS;

  useEffect(() => {
    if (!affirmation) return;
    const timer = setTimeout(() => onClose(), 900);
    return () => clearTimeout(timer);
  }, [affirmation, onClose]);

  function handleSelect(value) {
    setSelected(value);

    const data = {
      reflection: isConnection ? null : value,
      connectionQuality: isConnection ? value : null,
      skippedReflection: false,
      crFlagged: isCR,
      valueAlignment: habit?.valueAlignment ?? null,
    };
    onSubmit(data);
    setAffirmation(AFFIRMATIONS[value]);
  }

  function handleSkip() {
    onSubmit({
      reflection: null,
      connectionQuality: null,
      skippedReflection: true,
      crFlagged: isCR,
      valueAlignment: habit?.valueAlignment ?? null,
    });
    setAffirmation(AFFIRMATIONS.skip);
  }

  if (!habit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-6 shadow-xl animate-slide-up">
        {affirmation ? (
          <div className="text-center py-8">
            <p className="text-lg font-semibold text-evergreen-teal">{affirmation.title}</p>
            {affirmation.body && (
              <p className="text-sm text-muted-sage-gray mt-2">{affirmation.body}</p>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-soft-charcoal">
                {isConnection ? "How was that connection?" : "How did it go?"}
              </h3>
              <button onClick={onClose} className="text-muted-sage-gray hover:text-soft-charcoal">
                <X size={20} />
              </button>
            </div>

            <p className="text-sm text-muted-sage-gray mb-4">
              {habit.name || habit.title}
            </p>

            {habit.valueAlignment && (
              <p className="text-xs text-evergreen-teal mb-4 italic">
                Today, toward {habit.valueAlignment}
              </p>
            )}

            <div className="flex gap-3 mb-4">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                    selected === opt.value
                      ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal"
                      : "border-divider text-soft-charcoal hover:border-silver-sage"
                  }`}
                >
                  <span className="block text-lg mb-1">{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>

            {isCR && (
              <p className="text-xs text-teal-700 bg-teal-50 rounded-lg p-2 mb-3">
                🌿 This habit builds your cognitive reserve
              </p>
            )}

            <button
              onClick={handleSkip}
              className="text-sm text-muted-sage-gray hover:text-soft-charcoal w-full text-center py-2"
            >
              Skip reflection
            </button>
          </>
        )}
      </div>
    </div>
  );
}
