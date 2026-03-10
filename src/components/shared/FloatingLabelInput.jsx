import React, { useState, useId } from 'react';

/**
 * FloatingLabelInput - Text input with floating label, matching mobile's FloatingLabelInput
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.value
 * @param {Function} props.onChange
 * @param {string} props.type - Input type (text, email, password, etc.)
 * @param {boolean} props.error
 * @param {string} props.errorText
 * @param {React.ReactNode} props.left - Left icon
 * @param {React.ReactNode} props.right - Right icon/button
 * @param {boolean} props.disabled
 * @param {string} props.className
 * @param {Object} props.inputProps - Additional props for the input element
 */
export default function FloatingLabelInput({
  label,
  value = '',
  onChange,
  type = 'text',
  error = false,
  errorText = '',
  left,
  right,
  disabled = false,
  className = '',
  ...inputProps
}) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  const hasValue = value.length > 0;
  const isFloating = focused || hasValue;

  const borderColor = error
    ? 'border-soft-coral'
    : focused
    ? 'border-evergreen-teal'
    : 'border-silver-sage';

  return (
    <div className={`mb-vara-base ${className}`}>
      <div
        className={`relative flex items-center min-h-input bg-white border ${borderColor} rounded-vara-lg transition-colors duration-200`}
      >
        {left && (
          <div className="pl-3 flex items-center text-muted-sage-gray">
            {left}
          </div>
        )}

        <div className="flex-1 relative">
          <label
            htmlFor={id}
            className={`absolute left-3 transition-all duration-200 pointer-events-none ${
              isFloating
                ? 'top-1.5 text-[10px] font-medium'
                : 'top-1/2 -translate-y-1/2 text-vara-base'
            } ${
              error
                ? 'text-soft-coral'
                : focused
                ? 'text-evergreen-teal'
                : 'text-muted-sage-gray'
            }`}
          >
            {label}
          </label>
          <input
            id={id}
            type={type}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            disabled={disabled}
            className={`w-full bg-transparent px-3 text-vara-base text-soft-charcoal outline-none ${
              isFloating ? 'pt-5 pb-1.5' : 'py-3'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            {...inputProps}
          />
        </div>

        {right && (
          <div className="pr-3 flex items-center">
            {right}
          </div>
        )}
      </div>

      {error && errorText && (
        <p className="mt-vara-xs ml-1 text-vara-xs text-soft-coral">
          {errorText}
        </p>
      )}
    </div>
  );
}
