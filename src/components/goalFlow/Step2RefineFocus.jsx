import React from 'react';

const subcategories = {
  physical: [
    'Exercise',
    'Nutrition',
    'Sleep',
    'Physical Recovery',
  ],
  mental: [
    'Mindfulness & Stress Management',
    'Emotional Resilience',
    'Mental Clarity',
  ],
  lifestyle: [
    'Self-Improvement',
    'Creativity',
    'Work-Life Balance',
  ],
  sleep: [
    'Sleep Hygiene',
    'Physical Recovery',
  ],
};

export default function Step2RefineFocus({ data, setData, nextStep, prevStep }) {
  const options = subcategories[data.primaryFocus] || [];

  const handleSelect = (refined) => {
    setData({ ...data, refinedFocus: refined });
    nextStep(); // move to Step 3
  };

  return (
    <div className="max-w-xl mx-auto text-center p-6 bg-mist-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-evergreen-teal mb-4">Step 2 of 6</h2>
      <p className="mb-6 text-soft-charcoal">
        Let’s narrow things down a bit. What specifically would you like to focus on?
      </p>

      <div className="grid gap-4">
        {options.map((option) => (
          <button
            key={option}
            onClick={() => handleSelect(option)}
            className="w-full py-3 px-4 bg-sunrise-amber text-white font-medium rounded hover:bg-golden-apricot transition"
          >
            {option}
          </button>
        ))}
      </div>

      <button
        onClick={prevStep}
        className="mt-6 text-evergreen-teal underline hover:text-soft-charcoal transition"
      >
        ← Back to Step 1
      </button>
    </div>
  );
}
