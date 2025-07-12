import React, { useState } from 'react';

const sessions = [
  { id: 1, title: 'Box Breathing', duration: 4, purpose: 'Relax' },
  { id: 2, title: '4-7-8 Breathing', duration: 5, purpose: 'Sleep' },
  { id: 3, title: 'Energizing Breath', duration: 3, purpose: 'Focus' },
];

const BreathworkSessions = () => {
  const [selected, setSelected] = useState(null);

  return (
    <div className="space-y-6">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="p-4 bg-white rounded shadow hover:shadow-lg transition cursor-pointer"
            onClick={() => setSelected(session)}
          >
            <h3 className="font-semibold text-emerald-800">{session.title}</h3>
            <p className="text-sm text-gray-600">{session.duration}-minute • {session.purpose}</p>
          </div>
        ))}
      </div>

      {/* Session Modal / Panel */}
      {selected && (
        <div className="p-4 border rounded bg-emerald-50 shadow-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-lg font-semibold text-emerald-900">{selected.title}</h4>
            <button
              className="text-sm text-red-500 hover:underline"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
          <p className="text-gray-700 mb-4">
            Inhale deeply... hold... exhale slowly. Follow the {selected.duration}-minute guided breath cycle.
          </p>
          <div className="w-full h-4 bg-emerald-100 rounded">
            <div
              className="h-full bg-emerald-500 rounded animate-pulse"
              style={{ width: '25%' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BreathworkSessions;

