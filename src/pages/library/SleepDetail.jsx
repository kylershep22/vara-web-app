import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Moon, ArrowLeft, Play } from 'lucide-react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

const allSleepContent = [
  {
    id: 'delta-waves',
    title: 'Delta Waves',
    duration: '3:43 min',
    category: 'Sleep Sounds',
    type: 'Brainwave',
    description: 'Deep sleep waves to help you stay in stage 3 & 4 sleep.',
    audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FDeltaWaves.mp3?alt=media&token=26646854-091e-4c5d-b0e8-99e37fa5998d',
  },
  {
    id: 'calming-melody',
    title: 'Calming Melody',
    duration: '3:27 min',
    category: 'Sleep Sounds',
    type: 'Nature',
    description: 'A calming rain track for winding down.',
    audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FCalmingMelody.mp3?alt=media&token=e13ba763-1cd1-4831-b893-06fce2836093',
  },
  {
    id: 'surreal-forest',
    title: 'Surreal Forest',
    duration: '2:01 min',
    category: 'Sleep Sounds',
    type: 'Nature',
    description: 'Gentle waves rolling to help lull you to sleep.',
    audioSrc: 'https://firebasestorage.googleapis.com/v0/b/vara-4a99f.firebasestorage.app/o/sleep-audio%2FSurrealForest.mp3?alt=media&token=b151f59b-554a-4605-9108-002bd3aaa63c',
  },
  {
    id: 'forest-journey',
    title: 'The Forest Journey',
    duration: '18 min',
    category: 'Sleep Stories',
    description: 'A relaxing narrative through serene woods.',
    audioSrc: '/audio/forest-journey.mp3',
  },
  {
    id: 'starry-skies',
    title: 'Starry Skies',
    duration: '22 min',
    category: 'Sleep Stories',
    description: 'Travel across the night sky in a soothing story.',
    audioSrc: '/audio/starry-skies.mp3',
  },
  {
    id: 'evening-body-scan',
    title: 'Evening Body Scan',
    duration: '12 min',
    category: 'Guided Meditation',
    description: 'Full-body relaxation from head to toe.',
    audioSrc: '/audio/body-scan.mp3',
  },
];

const sleepTips = [
  {
    title: 'Keep it dark',
    description: 'Use blackout curtains or an eye mask. Even small amounts of light can disrupt melatonin production and sleep quality.',
  },
  {
    title: 'Avoid screens before bed',
    description: 'Blue light from phones and laptops suppresses melatonin. Try to stop screen use 30-60 minutes before sleep.',
  },
  {
    title: 'Consistent schedule',
    description: 'Go to bed and wake up at the same time every day, even on weekends. This strengthens your circadian rhythm.',
  },
];

export default function SleepDetail() {
  const { id } = useParams();
  const { playTrack } = useAudioPlayer();
  const item = allSleepContent.find((s) => s.id === id);

  if (!item) {
    return (
      <SidebarLayout>
        <div className="px-vara-base py-vara-lg max-w-3xl mx-auto text-center">
          <h1 className="text-vara-xl font-semibold text-soft-charcoal mb-4">Content not found</h1>
          <p className="text-muted-sage-gray mb-6">The sleep content you're looking for doesn't exist.</p>
          <Link to="/library/sleep" className="text-evergreen-teal hover:underline font-medium">
            &larr; Back to Sleep
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          to="/library/sleep"
          className="inline-flex items-center gap-1.5 text-vara-sm text-evergreen-teal hover:underline mb-vara-lg"
        >
          <ArrowLeft size={16} />
          Back to Sleep
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
              <Moon size={32} className="text-evergreen-teal" />
            </div>
            <div>
              <h1 className="text-vara-xl font-semibold text-soft-charcoal">{item.title}</h1>
              <p className="text-vara-sm text-muted-sage-gray mt-1">{item.description}</p>
            </div>
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.duration}
            </span>
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.category}
            </span>
            {item.type && (
              <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
                {item.type}
              </span>
            )}
          </div>
        </div>

        {/* Play Button */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg text-center">
          <button
            onClick={() => playTrack(item.title, item.audioSrc)}
            className="inline-flex items-center gap-3 bg-evergreen-teal text-white font-medium py-4 px-8 rounded-vara-pill hover:bg-evergreen-teal/90 transition text-lg"
          >
            <Play size={24} fill="currentColor" />
            Play Now
          </button>
          <p className="text-vara-xs text-muted-sage-gray mt-3">Audio will play in the persistent player below</p>
        </div>

        {/* Sleep Tips */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Sleep Tips</h2>
          <div className="space-y-4">
            {sleepTips.map((tip, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-evergreen-teal text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-vara-sm font-semibold text-soft-charcoal">{tip.title}</h3>
                  <p className="text-vara-sm text-muted-sage-gray leading-relaxed">{tip.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
