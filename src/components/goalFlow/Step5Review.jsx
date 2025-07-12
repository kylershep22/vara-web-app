import React from 'react';

export default function Step5Review({ data, nextStep, prevStep }) {
  return (
    <div className="max-w-xl mx-auto text-left p-6 bg-[#FAFAF6] rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-[#1B5E57] mb-4 text-center">Step 5 of 6</h2>
      <p className="mb-6 text-[#3E3E3E] text-center">
        Here's a summary of your goal. Take a moment to review and make any changes if needed.
      </p>

      <div className="space-y-4">
        <div>
          <strong className="text-[#1B5E57]">Primary Focus:</strong>
          <div className="ml-2">{data.primaryFocus}</div>
        </div>

        <div>
          <strong className="text-[#1B5E57]">Refined Focus:</strong>
          <div className="ml-2">{data.refinedFocus}</div>
        </div>

        <div>
          <strong className="text-[#1B5E57]">Goal:</strong>
          <div className="ml-2">{data.goal}</div>
        </div>

        <div>
          <strong className="text-[#1B5E57]">Timeframe:</strong>
          <div className="ml-2">{data.timeframe}</div>
        </div>

        {data.targetDate && (
          <div>
            <strong className="text-[#1B5E57]">Target Date:</strong>
            <div className="ml-2">{data.targetDate}</div>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="text-[#1B5E57] underline hover:text-[#3E3E3E] transition"
        >
          ← Back
        </button>
        <button
          onClick={nextStep}
          className="px-6 py-2 bg-[#1B5E57] text-white rounded hover:bg-[#3E3E3E] transition"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
