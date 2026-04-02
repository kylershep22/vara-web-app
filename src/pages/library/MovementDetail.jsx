import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Dumbbell, ArrowLeft, Play, ShieldCheck, Shirt, Droplets } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useVideoPlayer } from '../../context/VideoPlayerContext';

const equipmentItems = [
  { icon: Shirt, label: 'Comfortable clothes', description: 'Wear breathable clothing that allows free range of motion' },
  { icon: ShieldCheck, label: 'Mat or towel', description: 'A yoga mat or towel for floor exercises and cushioning' },
  { icon: Droplets, label: 'Water bottle', description: 'Stay hydrated before, during, and after your workout' },
];

const safetyTips = [
  'Warm up for 3-5 minutes before starting to prepare your muscles and joints',
  'Listen to your body and modify exercises as needed for your fitness level',
  'Stop immediately if you feel sharp pain, dizziness, or shortness of breath',
];

export default function MovementDetail() {
  const { id } = useParams();
  const { playTrack } = useAudioPlayer();
  const { playVideo } = useVideoPlayer();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContent() {
      try {
        const docRef = doc(db, 'movementContent', id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setItem({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error('Error fetching movement content:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchContent();
  }, [id]);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="px-vara-base py-vara-lg max-w-3xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-48" />
            <div className="h-48 bg-gray-200 rounded-vara-lg" />
            <div className="h-32 bg-gray-200 rounded-vara-lg" />
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!item) {
    return (
      <SidebarLayout>
        <div className="px-vara-base py-vara-lg max-w-3xl mx-auto text-center">
          <h1 className="text-vara-xl font-semibold text-soft-charcoal mb-4">Content not found</h1>
          <p className="text-muted-sage-gray mb-6">The movement content you're looking for doesn't exist.</p>
          <Link to="/library/movement" className="text-evergreen-teal hover:underline font-medium">
            &larr; Back to Movement
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  const handleStart = () => {
    if (item.type === 'video' && item.videoSrc) {
      playVideo(item.title, item.videoSrc);
    } else if (item.audioSrc) {
      playTrack(item.title, item.audioSrc);
    }
  };

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          to="/library/movement"
          className="inline-flex items-center gap-1.5 text-vara-sm text-evergreen-teal hover:underline mb-vara-lg"
        >
          <ArrowLeft size={16} />
          Back to Movement
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-vara-lg border border-divider shadow-vara-sm mb-vara-lg overflow-hidden">
          {item.thumbnail ? (
            <img
              src={item.thumbnail}
              alt={item.title}
              className="w-full h-48 object-cover"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-evergreen-teal to-silver-sage flex items-center justify-center">
              <Dumbbell size={56} className="text-white/80" />
            </div>
          )}
          <div className="p-vara-lg">
            <h1 className="text-vara-xl font-semibold text-soft-charcoal mb-2">{item.title}</h1>
            <p className="text-vara-sm text-muted-sage-gray leading-relaxed">{item.description}</p>

            {/* Metadata Chips */}
            <div className="flex flex-wrap gap-2 mt-4">
              {item.duration && (
                <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
                  {item.duration}
                </span>
              )}
              {item.category && (
                <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
                  {item.category}
                </span>
              )}
              {item.type && (
                <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
                  {item.type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Start Workout Button */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg text-center">
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 bg-evergreen-teal text-white font-medium py-3 px-6 rounded-vara-pill hover:bg-evergreen-teal/90 transition"
          >
            <Play size={18} fill="currentColor" />
            Start Workout
          </button>
        </div>

        {/* What You'll Need */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">What You'll Need</h2>
          <div className="space-y-4">
            {equipmentItems.map((eq, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-evergreen-teal/10 flex items-center justify-center">
                  <eq.icon size={18} className="text-evergreen-teal" />
                </div>
                <div>
                  <h3 className="text-vara-sm font-semibold text-soft-charcoal">{eq.label}</h3>
                  <p className="text-vara-xs text-muted-sage-gray">{eq.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Tips */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">Safety Tips</h2>
          <div className="space-y-3">
            {safetyTips.map((tip, i) => (
              <div key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-vara-sm text-soft-charcoal leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
