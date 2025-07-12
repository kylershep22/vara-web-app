import React from 'react';

const categories = [
  { label: 'Physical Health & Fitness', value: 'physical' },
  { label: 'Mental & Emotional Wellness', value: 'mental' },
  { label: 'Lifestyle & Personal Growth', value: 'lifestyle' },
  { label: 'Sleep & Recovery', value: 'sleep' },
];

export default function Step1PrimaryFocus({ data, setData, nextStep }) {
  const handleSelect = (value) => {
    setData({ ...data, primaryFocus: value });
    nextStep(); // advance to Step 2
  };

  return (
    <div className="max-w-xl mx-auto text-center p-6 bg-[#FAFAF6] rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-[#1B5E57] mb-4">Step 1 of 6</h2>
      <p className="mb-6 text-[#3E3E3E]">
        What area of your life would you like to focus on today?
      </p>

      <div className="grid gap-4">
        {categories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleSelect(cat.value)}
            className="w-full py-3 px-4 bg-[#F4C542] text-white font-medium rounded hover:bg-[#F5B971] transition"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
