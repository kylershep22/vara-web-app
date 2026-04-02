import React from 'react';
import { Link2 } from 'lucide-react';

export default function CorrelationCard({
  title,
  highConditionLabel,
  lowConditionLabel,
  highValue,
  lowValue,
  footnote,
  isPrimary,
  anchorRef,
}) {
  return (
    <div className="mb-4" ref={anchorRef}>
      {isPrimary && (
        <div className="flex items-center gap-1 mb-2.5">
          <Link2 size={16} className="text-evergreen-teal" />
          <span className="text-[13px] font-medium text-evergreen-teal">
            Strongest pattern
          </span>
        </div>
      )}

      <div className="bg-white rounded-vara-lg p-vara-lg border-[0.5px] border-silver-sage/30">
        <h3 className="text-[15px] font-medium text-soft-charcoal mb-3">
          {title}
        </h3>

        {/* High bar */}
        <div className="mb-3">
          <div className="flex justify-between">
            <span className="text-[12px] text-muted-sage-gray">
              {highConditionLabel}
            </span>
            <span className="text-[12px] font-medium text-evergreen-teal">
              {highValue}%
            </span>
          </div>
          <div className="h-1.5 bg-silver-sage/30 rounded-full mt-1 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-evergreen-teal transition-all duration-[400ms] ease-out"
              style={{ width: `${highValue}%` }}
            />
          </div>
        </div>

        {/* Low bar */}
        <div>
          <div className="flex justify-between">
            <span className="text-[12px] text-muted-sage-gray">
              {lowConditionLabel}
            </span>
            <span className="text-[12px] font-medium text-soft-coral">
              {lowValue}%
            </span>
          </div>
          <div className="h-1.5 bg-silver-sage/30 rounded-full mt-1 overflow-hidden">
            <div
              className="h-1.5 rounded-full bg-soft-coral transition-all duration-[400ms] ease-out"
              style={{ width: `${lowValue}%` }}
            />
          </div>
        </div>

        {footnote && (
          <p className="text-[12px] text-muted-sage-gray mt-1">{footnote}</p>
        )}
      </div>
    </div>
  );
}
