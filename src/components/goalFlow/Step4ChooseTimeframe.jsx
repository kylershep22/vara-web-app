import React, { useState } from 'react';

export default function Step4ChooseTimeframe({ data, setData, nextStep, prevStep }) {
  const [timeframe, setTimeframe] = useState(data.timeframe || '');
  const [targetDate, setTargetDate] = useState(data.targetDate || '');

  const handleNext = () => {
    if (timeframe) {
      setData({ ...data, timeframe, targetDate });
      nextStep();
    }
  };

  return (
    <div className="max-w-xl mx-auto text-center p-6 bg-mist-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-evergreen-teal mb-4">Step 4 of 6</h2>
      <p className="mb-6 text-soft-charcoal">
        How long would you like to focus on this goal?
      </p>

      <div className="grid gap-4 mb-6">
        {['Short-term (2 weeks)', 'Medium-term (1 month)', 'Long-term (3+ months)', 'Ongoing'].map((label) => (
          <button
            key={label}
            onClick={() => setTimeframe(label)}
            className={`w-full py-3 px-4 rounded font-medium transition ${
              timeframe === label
                ? 'bg-evergreen-teal text-white'
                : 'bg-sunrise-amber text-white hover:bg-golden-apricot'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6">
        <label className="block text-soft-charcoal mb-2">Optional: Set a target date</label>
        <input
          type="date"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          className="w-full px-4 py-2 border border-golden-apricot rounded focus:outline-none focus:ring focus:border-evergreen-teal"
        />
      </div>

      <div className="flex justify-between">
        <button
          onClick={prevStep}
          className="text-evergreen-teal underline hover:text-soft-charcoal transition"
        >
          ← Back to Step 3
        </button>
        <button
          onClick={handleNext}
          disabled={!timeframe}
          className="px-6 py-2 bg-evergreen-teal text-white rounded hover:opacity-90 transition disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
