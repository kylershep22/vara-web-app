import React from "react";
import { MessageSquare, Trophy, BookOpen, HelpCircle } from "lucide-react";

const POST_TYPES = [
  { id: "update", label: "Update", icon: MessageSquare },
  { id: "win", label: "Win", icon: Trophy },
  { id: "reflection", label: "Reflection", icon: BookOpen },
  { id: "ask", label: "Ask", icon: HelpCircle },
];

export default function PostTypeSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 mb-3">
      {POST_TYPES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
            value === id
              ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
              : "border-divider text-soft-charcoal hover:border-silver-sage"
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

export { POST_TYPES };
