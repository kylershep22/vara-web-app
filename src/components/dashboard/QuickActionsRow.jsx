/**
 * QuickActionsRow
 * Two shortcut buttons for Journal and Focus, shown on the dashboard.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Timer } from 'lucide-react';

export default function QuickActionsRow() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-vara-base">
      <button
        type="button"
        onClick={() => navigate('/journal')}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-vara-lg border border-evergreen-teal text-evergreen-teal text-[14px] font-semibold bg-white hover:bg-teal-light transition-colors"
      >
        <BookOpen size={16} className="shrink-0" />
        Journal
      </button>

      <button
        type="button"
        onClick={() => navigate('/focus')}
        className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-vara-lg border border-evergreen-teal text-evergreen-teal text-[14px] font-semibold bg-white hover:bg-teal-light transition-colors"
      >
        <Timer size={16} className="shrink-0" />
        Focus
      </button>
    </div>
  );
}
