import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

const DIFFICULTIES = [
  { value: "smooth", label: "Smooth", emoji: "😊" },
  { value: "okay", label: "Okay", emoji: "😐" },
  { value: "hard", label: "Hard", emoji: "😓" },
];

export default function DailyReflectionCard({ reflection, onSave, loading }) {
  const [saved, setSaved] = useState(!!reflection);

  if (saved || reflection) {
    const selected = DIFFICULTIES.find((d) => d.value === (reflection?.difficulty || "okay"));
    return (
      <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-evergreen-teal" />
          <span className="text-vara-sm text-soft-charcoal">
            Today felt <strong>{selected?.label.toLowerCase()}</strong>
          </span>
        </div>
      </div>
    );
  }

  const handleSelect = async (difficulty) => {
    await onSave(difficulty);
    setSaved(true);
  };

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md p-vara-lg border border-divider">
      <h3 className="text-vara-sm font-semibold text-soft-charcoal">
        How did today feel?
      </h3>
      <p className="text-vara-xs text-muted-sage-gray mt-0.5 mb-vara-base">
        All your habits are done. Quick reflection before you go.
      </p>

      <div className="flex gap-vara-sm">
        {DIFFICULTIES.map((d) => (
          <button
            key={d.value}
            onClick={() => handleSelect(d.value)}
            disabled={loading}
            className="flex-1 flex flex-col items-center gap-1 py-vara-sm px-vara-base rounded-vara-md bg-gray-50 hover:bg-teal-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-xl">{d.emoji}</span>
            <span className="text-vara-xs text-soft-charcoal font-medium">{d.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
