import React from 'react';

const favorites = [
  { id: 1, type: 'Meditation', title: 'Focused Mind', duration: 10 },
  { id: 2, type: 'Breathwork', title: 'Box Breathing', duration: 4 },
  { id: 3, type: 'Movement', title: 'Desk Reset', duration: 3 },
];

const progress = {
  totalSessions: 12,
  streak: 4,
  minutes: 85,
};

const FavoritesSection = () => {
  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <div className="bg-teal-light p-4 rounded-xl shadow grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
        <div>
          <h4 className="text-lg font-semibold text-evergreen-teal">🧘‍♀️ Sessions</h4>
          <p className="text-2xl text-evergreen-teal">{progress.totalSessions}</p>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-evergreen-teal">🔥 Streak</h4>
          <p className="text-2xl text-evergreen-teal">{progress.streak} days</p>
        </div>
        <div>
          <h4 className="text-lg font-semibold text-evergreen-teal">⏱️ Minutes</h4>
          <p className="text-2xl text-evergreen-teal">{progress.minutes}</p>
        </div>
      </div>

      {/* Favorites List */}
      <div>
        <h3 className="text-lg font-semibold text-evergreen-teal mb-2">⭐ Your Favorites</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => (
            <div key={fav.id} className="p-4 bg-white rounded shadow hover:shadow-lg transition">
              <h4 className="text-evergreen-teal font-semibold">{fav.title}</h4>
              <p className="text-sm text-muted-sage-gray">
                {fav.type} • {fav.duration} min
              </p>
              <button className="mt-2 text-sm text-red-500 hover:underline">Remove</button>
            </div>
          ))}
        </div>
        {favorites.length === 0 && (
          <p className="text-muted-sage-gray text-sm mt-4">No favorites saved yet.</p>
        )}
      </div>
    </div>
  );
};

export default FavoritesSection;

