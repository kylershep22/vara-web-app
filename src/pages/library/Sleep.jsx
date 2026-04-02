import React from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Moon } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

export default function Sleep() {
  const { playTrack } = useAudioPlayer();

  const sleepSounds = [
    {
      id: 'delta-waves',
      title: 'Delta Waves',
      duration: '3:43 min',
      type: 'Brainwave',
      description: 'Deep sleep waves to help you stay in stage 3 & 4 sleep.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FDeltaWaves.mp3?alt=media&token=26646854-091e-4c5d-b0e8-99e37fa5998d',
    },
    {
      id: 'calming-melody',
      title: 'Calming Melody',
      duration: '3:27 min',
      type: 'Nature',
      description: 'A calming rain track for winding down.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FCalmingMelody.mp3?alt=media&token=e13ba763-1cd1-4831-b893-06fce2836093',
    },
    {
      id: 'surreal-forest',
      title: 'Surreal Forest',
      duration: '2:01 min',
      type: 'Nature',
      description: 'Gentle waves rolling to help lull you to sleep.',
      audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FSurrealForest.mp3?alt=media&token=b151f59b-554a-4605-9108-002bd3aaa63c',
    },
  ];

  const sleepStories = [
    {
      id: 'forest-journey',
      title: 'The Forest Journey',
      duration: '18 min',
      description: 'A relaxing narrative through serene woods.',
      audioSrc: '/audio/forest-journey.mp3',
    },
    {
      id: 'starry-skies',
      title: 'Starry Skies',
      duration: '22 min',
      description: 'Travel across the night sky in a soothing story.',
      audioSrc: '/audio/starry-skies.mp3',
    },
  ];

  const guidedMeditations = [
    {
      id: 'evening-body-scan',
      title: 'Evening Body Scan',
      duration: '12 min',
      description: 'Full-body relaxation from head to toe.',
      audioSrc: '/audio/body-scan.mp3',
    },
  ];

  const renderTrack = (title, items) => (
    <div className="mb-10">
      <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-3">{title}</h2>
      <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-silver-sage">
        {items.map((item) => (
          <div
            key={item.id}
            className="min-w-[240px] flex-shrink-0 bg-white border border-divider rounded-vara-lg p-vara-base shadow-vara-sm hover:shadow-vara-md transition"
          >
            <Link to={`/library/sleep/${item.id}`} className="block mb-2">
              <h3 className="text-md font-semibold text-evergreen-teal mb-1 hover:underline">{item.title}</h3>
              <p className="text-vara-sm text-muted-sage-gray mb-2">{item.description}</p>
              <div className="text-vara-xs text-muted-sage-gray">{item.duration} {item.type ? `• ${item.type}` : ''}</div>
            </Link>
            <button
              onClick={() => playTrack(item.title, item.audioSrc)}
              className="mt-2 px-4 py-2 bg-evergreen-teal text-white text-vara-sm rounded-vara-md hover:opacity-90 transition"
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
      <div className="px-vara-base py-vara-lg max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Moon size={28} className="text-evergreen-teal" />
          <div>
            <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Sleep Library</h1>
            <p className="text-sm text-evergreen-teal font-medium">Brain Cleanup & Memory Consolidation</p>
          </div>
        </div>
        <p className="text-muted-sage-gray mb-vara-base max-w-2xl">
          Quality sleep is your brain's reset button. During deep sleep, your brain clears metabolic waste, consolidates memories, and strengthens neural connections formed during the day.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8 max-w-2xl">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Brain Health Benefits of Sleep</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Memory Consolidation:</strong> Transfers learning from short-term to long-term storage</li>
            <li>• <strong>Metabolic Cleanup:</strong> Glymphatic system removes toxic proteins and waste products</li>
            <li>• <strong>Neuroplasticity:</strong> Strengthens important neural connections while pruning unused ones</li>
            <li>• <strong>Cognitive Performance:</strong> Restores focus, creativity, and decision-making capacity</li>
          </ul>
        </div>

        {/* Sections */}
        {renderTrack('Sleep Sounds', sleepSounds)}
        {renderTrack('Sleep Stories', sleepStories)}
        {renderTrack('Guided Meditations for Sleep', guidedMeditations)}

        {/* Sleep Tracker Placeholder */}
        <div className="mt-16 bg-white border border-divider rounded-vara-lg p-vara-lg shadow-vara-sm">
          <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-2">Sleep Tracking (Coming Soon)</h3>
          <p className="text-vara-sm text-muted-sage-gray">Track your bedtime, wake time, and sleep quality in future releases.</p>
        </div>
      </div>
    </SidebarLayout>
  );
}


