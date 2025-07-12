import React, { useState } from 'react';

const sampleMeditations = [
  { id: 1, title: 'Calm Breath', duration: 5, mood: 'Calm', purpose: 'Stress' },
  { id: 2, title: 'Focused Mind', duration: 10, mood: 'Focused', purpose: 'Productivity' },
  { id: 3, title: 'Evening Wind Down', duration: 15, mood: 'Calm', purpose: 'Sleep' },
  { id: 4, title: 'Energizing Flow', duration: 10, mood: 'Energized', purpose: 'Morning' },
];

const MeditationLibrary = () => {
  const [filters, setFilters] = useState({ mood: '', duration: '', purpose: '' });

  const filtered = sampleMeditations.filter((m) => {
    return (
      (!filters.mood || m.mood === filters.mood) &&
      (!filters.duration || m.duration === parseInt(filters.duration)) &&
      (!filters.purpose || m.purpose === filters.purpose)
    );
  });

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select name="mood" onChange={handleChange} className="border p-2 rounded">
          <option value="">Mood</option>
          <option value="Calm">Calm</option>
          <option value="Focused">Focused</option>
          <option value="Energized">Energized</option>
        </select>
        <select name="duration" onChange={handleChange} className="border p-2 rounded">
          <option value="">Time</option>
          <option value="5">5 min</option>
          <option value="10">10 min</option>
          <option value="15">15 min</option>
        </select>
        <select name="purpose" onChange={handleChange} className="border p-2 rounded">
          <option value="">Purpose</option>
          <option value="Stress">Stress</option>
          <option value="Sleep">Sleep</option>
          <option value="Productivity">Productivity</option>
          <option value="Morning">Morning</option>
        </select>
      </div>

      {/* Meditation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((m) => (
          <div key={m.id} className="p-4 bg-white rounded shadow hover:shadow-lg transition">
            <h3 className="font-semibold text-emerald-800">{m.title}</h3>
            <p className="text-sm text-gray-600">{m.duration} min • {m.mood} • {m.purpose}</p>
            <button className="mt-2 text-sm text-emerald-700 underline hover:text-emerald-900">
              Add to Favorites
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-500 col-span-full">No meditations match your filters.</p>
        )}
      </div>
    </div>
  );
};

export default MeditationLibrary;
