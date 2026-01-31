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
      <h2 className="text-xl font-semibold text-[#3E3E3E] mb-3">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#D5E3D1]">
        {items.map((item, index) => (
          <div
            key={index}
            className="min-w-[240px] flex-shrink-0 bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            {item.type === 'video' && item.thumbnail && (
              <img
                src={item.thumbnail}
                alt={`${item.title} thumbnail`}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}

            <h3 className="text-md font-semibold text-[#1B5E57] mb-1">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            <div className="text-xs text-gray-500">{item.duration}</div>

            {item.type === 'video' ? (
              <button
                onClick={() => playVideo(item.title, item.videoSrc)}
                className="mt-4 px-4 py-2 bg-[#1B5E57] text-white text-sm rounded-lg hover:bg-[#164e48] transition"
              >
                Watch
              </button>
            ) : (
              <button
                onClick={() => playTrack(item.title, item.audioSrc)}
                className="mt-4 px-4 py-2 bg-[#1B5E57] text-white text-sm rounded-lg hover:bg-[#164e48] transition"
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
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Dumbbell size={28} className="text-[#1B5E57]" />
          <div>
            <h1 className="text-2xl font-semibold text-[#3E3E3E]">Movement Library</h1>
            <p className="text-sm text-[#1B5E57] font-medium">Blood Flow Boost & Cognitive Priming</p>
          </div>
        </div>
        <p className="text-[#9AAE8C] mb-4 max-w-2xl">
          Movement is medicine for your brain. Physical activity increases blood flow to your brain, releases growth factors that build new neurons, and triggers osteocalcin - a bone hormone that enhances memory and learning.
        </p>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-8 max-w-2xl">
          <h3 className="text-sm font-semibold text-emerald-900 mb-2">Brain Health Benefits of Movement</h3>
          <ul className="text-sm text-emerald-800 space-y-1">
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



