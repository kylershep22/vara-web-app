import React, { useEffect, useState } from 'react';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Dumbbell } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';

export default function Movement() {
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
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-3">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-silver-sage">
        {items.map((item, index) => (
          <div
            key={index}
            className="min-w-[240px] flex-shrink-0 bg-white border border-divider rounded-vara-lg p-vara-base shadow-vara-sm hover:shadow-vara-md transition"
          >
            {item.type === 'video' && item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={`${item.title} thumbnail`}
                className="w-full h-32 object-cover rounded-vara-md mb-3"
              />
            )}

            <h3 className="text-md font-semibold text-evergreen-teal mb-1">{item.title}</h3>
            <p className="text-vara-sm text-muted-sage-gray mb-2">{item.description}</p>
            <div className="text-vara-xs text-muted-sage-gray">{item.duration}</div>

            {item.type === 'video' ? (
              <button
                onClick={() => playVideo(item.title, item.videoSrc)}
                className="mt-4 px-4 py-2 bg-evergreen-teal text-white text-vara-sm rounded-vara-md hover:opacity-90 transition"
              >
                Watch
              </button>
            ) : (
              <button
                onClick={() => playTrack(item.title, item.audioSrc)}
                className="mt-4 px-4 py-2 bg-evergreen-teal text-white text-vara-sm rounded-vara-md hover:opacity-90 transition"
              >
                Play
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Dumbbell size={28} className="text-evergreen-teal" />
          <div>
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Movement Library</h1>
            <p className="text-sm text-evergreen-teal font-medium">Blood Flow Boost & Cognitive Priming</p>
          </div>
        </div>
        <p className="text-muted-sage-gray mb-vara-base max-w-2xl">
          Movement is medicine for your brain. Physical activity increases blood flow to your brain, releases growth factors that build new neurons, and triggers osteocalcin - a bone hormone that enhances memory and learning.
        </p>
        <div className="bg-teal-light border border-teal-medium/20 rounded-vara-lg p-vara-base mb-8 max-w-2xl">
          <h3 className="text-sm font-semibold text-evergreen-teal mb-2">Brain Health Benefits of Movement</h3>
          <ul className="text-sm text-evergreen-teal/80 space-y-1">
            <li>• <strong>Increased Blood Flow:</strong> Delivers oxygen and nutrients to brain cells</li>
            <li>• <strong>BDNF Release:</strong> Brain-Derived Neurotrophic Factor promotes neuron growth</li>
            <li>• <strong>Osteocalcin:</strong> Bone-derived hormone that crosses blood-brain barrier to enhance cognition</li>
            <li>• <strong>Mental Clarity:</strong> Improves focus, memory, and creative problem-solving</li>
            <li>• <strong>Neurogenesis:</strong> Stimulates growth of new brain cells in hippocampus</li>
          </ul>
        </div>

        {/* Sections */}
        {Object.entries(groupedContent).map(([category, items]) =>
          renderTrack(category, items)
        )}
      </div>
    </SidebarLayout>
  );
}



