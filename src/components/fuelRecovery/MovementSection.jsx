// src/components/fuelRecovery/MovementSection.jsx

import React, { useEffect, useState } from 'react';
import { Dumbbell, Play } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

const MovementSection = ({ userId }) => {
  const { playTrack } = useAudioPlayer();
  const { playVideo } = useVideoPlayer();
  const [groupedContent, setGroupedContent] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'movementContent'), (snapshot) => {
      const grouped = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        const category = data.category || 'Other';
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(data);
      });
      setGroupedContent(grouped);
    });

    return () => unsubscribe();
  }, []);

  const renderTrack = (title, items) => (
    <div className="mb-10" key={title}>
      <h2 className="text-xl font-semibold text-soft-charcoal mb-3">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-divider">
        {items.map((item, index) => (
          <div
            key={index}
            className="min-w-[240px] flex-shrink-0 bg-white border border-divider rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            {item.type === 'video' && item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={`${item.title} thumbnail`}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}

            <h3 className="text-md font-semibold text-evergreen-teal mb-1">{item.title}</h3>
            <p className="text-sm text-muted-sage-gray mb-2">{item.description}</p>
            <div className="text-xs text-muted-sage-gray mb-3">{item.duration}</div>

            {item.type === 'video' ? (
              <button
                onClick={() => playVideo(item.title, item.videoSrc)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-evergreen-teal text-white text-sm rounded-lg hover:opacity-90 transition"
              >
                <Play size={16} />
                Watch
              </button>
            ) : (
              <button
                onClick={() => playTrack(item.title, item.audioSrc)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-evergreen-teal text-white text-sm rounded-lg hover:opacity-90 transition"
              >
                <Play size={16} />
                Play
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-dew-sage-light to-dew-sage-light border border-silver-sage rounded-lg p-4">
        <h3 className="font-semibold text-soft-charcoal mb-2">Movement for Brain Health</h3>
        <p className="text-sm text-muted-sage-gray mb-2">
          Exercise is one of the most powerful tools for brain health. It increases BDNF (brain-derived neurotrophic factor),
          improves mood, completes the stress cycle, and protects cognitive function as you age.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-sage-gray">
          <div>
            <span className="font-semibold">Daily Goal:</span> 20-30 min of movement
          </div>
          <div>
            <span className="font-semibold">Intensity:</span> Mix light, moderate, and vigorous
          </div>
          <div>
            <span className="font-semibold">Variety:</span> Cardio, strength, flexibility
          </div>
        </div>
      </div>

      {/* Movement Library */}
      {Object.keys(groupedContent).length > 0 ? (
        Object.entries(groupedContent).map(([category, items]) => renderTrack(category, items))
      ) : (
        <div className="text-center py-12 bg-dew-sage-light rounded-lg border-2 border-dashed border-divider">
          <Dumbbell className="mx-auto mb-3 text-silver-sage" size={48} />
          <p className="font-medium text-soft-charcoal mb-1">No movement content yet</p>
          <p className="text-sm text-muted-sage-gray">Check back soon for movement videos and guides</p>
        </div>
      )}

      {/* Movement Principles */}
      <div className="bg-white rounded-xl border border-divider p-6">
        <h3 className="text-xl font-semibold text-soft-charcoal mb-4">Movement Principles for Brain Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-soft-charcoal mb-2">Why Movement Matters</h4>
            <ul className="space-y-1 text-muted-sage-gray text-sm">
              <li>• Increases BDNF (grows new brain cells)</li>
              <li>• Improves mood and reduces anxiety</li>
              <li>• Enhances cognitive function and memory</li>
              <li>• Completes the stress response cycle</li>
              <li>• Protects against cognitive decline</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-soft-charcoal mb-2">Best Practices</h4>
            <ul className="space-y-1 text-muted-sage-gray text-sm">
              <li>• Move daily, even if just 10 minutes</li>
              <li>• Mix cardio, strength, and flexibility</li>
              <li>• Find activities you actually enjoy</li>
              <li>• Move after stressful events to discharge stress</li>
              <li>• Prioritize consistency over intensity</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Movement Ideas */}
      <div className="bg-gradient-to-br from-teal-light to-teal-light border border-silver-sage rounded-lg p-6">
        <h3 className="font-semibold text-soft-charcoal mb-3">Quick Movement Ideas (No Equipment)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            '10-min walk',
            '5-min stretch',
            '20 jumping jacks',
            'Dance to 2 songs',
            '30-sec plank',
            'Stair climbing',
            'Body-weight squats',
            'Yoga flow'
          ].map((idea, idx) => (
            <div key={idx} className="bg-white rounded-lg p-3 text-center border border-silver-sage">
              <span className="text-sm font-medium text-soft-charcoal">{idea}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MovementSection;
