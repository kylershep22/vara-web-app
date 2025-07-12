import React from 'react';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Moon } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

export default function Sleep() {
  const { playTrack } = useAudioPlayer();

  const sleepSounds = [
    {
      title: 'Delta Waves',
      duration: '3:43 min',
      type: 'Brainwave',
      description: 'Deep sleep waves to help you stay in stage 3 & 4 sleep.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FDeltaWaves.mp3?alt=media&token=26646854-091e-4c5d-b0e8-99e37fa5998d',
    },
    {
      title: 'Calming Melody',
      duration: '3:27 min',
      type: 'Nature',
      description: 'A calming rain track for winding down.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FCalmingMelody.mp3?alt=media&token=e13ba763-1cd1-4831-b893-06fce2836093',
    },
    {
      title: 'Surreal Forest',
      duration: '2:01 min',
      type: 'Nature',
      description: 'Gentle waves rolling to help lull you to sleep.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FSurrealForest.mp3?alt=media&token=b151f59b-554a-4605-9108-002bd3aaa63c',
    },
  ];

  const sleepStories = [
    {
      title: 'The Forest Journey',
      duration: '18 min',
      description: 'A relaxing narrative through serene woods.',
      audioSrc: '/audio/forest-journey.mp3',
    },
    {
      title: 'Starry Skies',
      duration: '22 min',
      description: 'Travel across the night sky in a soothing story.',
      audioSrc: '/audio/starry-skies.mp3',
    },
  ];

  const guidedMeditations = [
    {
      title: 'Evening Body Scan',
      duration: '12 min',
      description: 'Full-body relaxation from head to toe.',
      audioSrc: '/audio/body-scan.mp3',
    },
  ];

  const renderTrack = (title, items) => (
    <div className="mb-10">
      <h2 className="text-xl font-semibold text-[#3E3E3E] mb-3">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#D5E3D1]">
        {items.map((item, index) => (
          <div
            key={index}
            className="min-w-[240px] flex-shrink-0 bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm hover:shadow-md transition"
          >
            <h3 className="text-md font-semibold text-[#1B5E57] mb-1">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-2">{item.description}</p>
            <div className="text-xs text-gray-500">{item.duration} {item.type ? `• ${item.type}` : ''}</div>
            <button
              onClick={() => playTrack(item.title, item.audioSrc)}
              className="mt-4 px-4 py-2 bg-[#1B5E57] text-white text-sm rounded-lg hover:bg-[#164e48] transition"
            >
              Play
            </button>
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
          <Moon size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Sleep Library</h1>
        </div>
        <p className="text-[#9AAE8C] mb-8 max-w-xl">
          Drift off with ambient sounds, relaxing stories, and guided meditations designed to support restful sleep.
        </p>

        {/* Sections */}
        {renderTrack('Sleep Sounds', sleepSounds)}
        {renderTrack('Sleep Stories', sleepStories)}
        {renderTrack('Guided Meditations for Sleep', guidedMeditations)}

        {/* Sleep Tracker Placeholder */}
        <div className="mt-16 bg-white border border-[#D5E3D1] rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-[#3E3E3E] mb-2">Sleep Tracking (Coming Soon)</h3>
          <p className="text-sm text-gray-600">Track your bedtime, wake time, and sleep quality in future releases.</p>
        </div>
      </div>
    </SidebarLayout>
  );
}


