/**
 * FourThreeTwoOneCard
 * Expandable daily practice card: 4-3-2-1 reflection method.
 * Collapsed view shows completion summary; expanded shows text inputs for each section.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  { key: 'momentsOfJoy',    label: '4 moments of joy',              count: 4 },
  { key: 'mindBodyFuel',    label: '3 ways you fueled mind & body', count: 3 },
  { key: 'intentions',      label: '2 intentions',                  count: 2 },
  { key: 'letGo',           label: '1 thing to let go',             count: 1 },
];

function countFilledSections(entry) {
  if (!entry) return 0;
  let filled = 0;
  if ((entry.momentsOfJoy || []).some(v => v?.trim())) filled++;
  if ((entry.mindBodyFuel || []).some(v => v?.trim())) filled++;
  if ((entry.intentions   || []).some(v => v?.trim())) filled++;
  if ((entry.letGo || '').trim()) filled++;
  return filled;
}

export default function FourThreeTwoOneCard({ entry, onChange, userId }) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(() => ({
    momentsOfJoy: Array(4).fill(''),
    mindBodyFuel: Array(3).fill(''),
    intentions:   Array(2).fill(''),
    letGo:        '',
    ...(entry || {}),
  }));

  const filledCount = countFilledSections(draft);

  const handleArrayChange = (key, index, value) => {
    setDraft(prev => {
      const arr = [...(prev[key] || [])];
      arr[index] = value;
      return { ...prev, [key]: arr };
    });
  };

  const handleLetGoChange = (value) => {
    setDraft(prev => ({ ...prev, letGo: value }));
  };

  const handleSave = () => {
    onChange?.(draft);
    setExpanded(false);
  };

  return (
    <div className="bg-white rounded-vara-lg shadow-vara-md border border-divider overflow-hidden">
      {/* Header / toggle row */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-vara-lg text-left hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(prev => !prev)}
        aria-expanded={expanded}
      >
        <div>
          <p className="text-[15px] font-semibold text-soft-charcoal">4-3-2-1 Daily Practice</p>
          <p className="text-[13px] text-muted-sage-gray mt-0.5">
            {filledCount} of 4 sections filled
          </p>
        </div>
        {expanded
          ? <ChevronUp size={18} className="text-muted-sage-gray shrink-0" />
          : <ChevronDown size={18} className="text-muted-sage-gray shrink-0" />
        }
      </button>

      {/* Expanded form */}
      {expanded && (
        <div className="px-vara-lg pb-vara-lg border-t border-divider">
          {SECTIONS.map(({ key, label, count }) => (
            <div key={key} className="mt-4">
              <p className="text-[13px] font-semibold text-soft-charcoal mb-2">{label}</p>

              {count === 1 ? (
                <textarea
                  rows={2}
                  value={draft.letGo || ''}
                  onChange={e => handleLetGoChange(e.target.value)}
                  placeholder="What are you releasing today?"
                  className="w-full text-[13px] text-soft-charcoal placeholder:text-muted-sage-gray border border-divider rounded-vara-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
                />
              ) : (
                Array.from({ length: count }).map((_, i) => (
                  <input
                    key={i}
                    type="text"
                    value={(draft[key] || [])[i] || ''}
                    onChange={e => handleArrayChange(key, i, e.target.value)}
                    placeholder={`${i + 1}.`}
                    className="w-full text-[13px] text-soft-charcoal placeholder:text-muted-sage-gray border border-divider rounded-vara-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-evergreen-teal/30"
                  />
                ))
              )}
            </div>
          ))}

          <button
            type="button"
            onClick={handleSave}
            className="mt-4 w-full py-2 px-4 rounded-vara-lg bg-evergreen-teal text-white text-[14px] font-semibold hover:opacity-90 transition-opacity"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
