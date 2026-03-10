import React from 'react';

const flows = [
  { id: 1, title: 'Morning Stretch', duration: 5, type: 'Gentle' },
  { id: 2, title: 'Desk Reset', duration: 3, type: 'Seated' },
  { id: 3, title: 'Bedtime Yoga', duration: 7, type: 'Relaxing' },
];

const MovementGuidance = () => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flows.map((flow) => (
          <div key={flow.id} className="p-4 bg-white rounded shadow hover:shadow-lg transition">
            <h3 className="text-evergreen-teal font-semibold">{flow.title}</h3>
            <p className="text-sm text-muted-sage-gray">
              {flow.duration}-minute • {flow.type}
            </p>
            <div className="flex justify-between mt-3">
              <button className="text-sm text-evergreen-teal underline hover:text-evergreen-teal/90">
                Preview
              </button>
              <button className="text-sm text-evergreen-teal hover:underline">
                Log as Completed
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MovementGuidance;

