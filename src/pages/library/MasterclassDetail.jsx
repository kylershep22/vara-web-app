import React from 'react';
import { useParams, Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { BookOpen, ArrowLeft, CheckCircle, User } from 'lucide-react';

const masterclasses = [
  {
    id: '1',
    title: 'The Science of Sleep',
    instructor: 'Dr. Sarah Chen',
    duration: '60 min',
    topic: 'Sleep',
    difficulty: 'beginner',
    description: 'Deep dive into sleep architecture, circadian rhythms, and evidence-based strategies for restorative rest.',
    bio: 'Dr. Sarah Chen is a board-certified sleep medicine physician with over 15 years of research experience in circadian biology and sleep optimization.',
    topics: [
      'Understanding sleep cycles and architecture',
      'How circadian rhythms regulate your body',
      'Evidence-based strategies for falling asleep faster',
      'The role of light exposure in sleep quality',
      'Nutrition and supplements that support sleep',
    ],
  },
  {
    id: '2',
    title: 'Breathwork Fundamentals',
    instructor: 'James Rodriguez',
    duration: '45 min',
    topic: 'Breathwork',
    difficulty: 'beginner',
    description: 'Learn the physiology of breath and practical techniques for relaxation, focus, and energy.',
    bio: 'James Rodriguez is a certified breathwork facilitator and wellness coach who has guided thousands of students through transformative breathing practices.',
    topics: [
      'The physiology of breathing and the nervous system',
      'Box breathing for calm and focus',
      'Energizing breath patterns for morning routines',
      'Breath techniques for managing anxiety',
      'Building a daily breathwork practice',
    ],
  },
  {
    id: '3',
    title: 'Nutrition for Brain Health',
    instructor: 'Dr. Emily Taylor',
    duration: '75 min',
    topic: 'Nutrition',
    difficulty: 'intermediate',
    description: 'Discover how food impacts cognitive function, mood, and long-term brain resilience.',
    bio: 'Dr. Emily Taylor is a neuroscientist and nutritional researcher specializing in the impact of diet on cognitive function and neuroprotection.',
    topics: [
      'How the gut-brain axis influences cognition',
      'Key nutrients for brain health and neuroplasticity',
      'Anti-inflammatory foods that protect your brain',
      'Meal timing and its effect on mental clarity',
      'Practical meal plans for cognitive performance',
    ],
  },
];

const difficultyColors = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-amber-100 text-amber-700',
  advanced: 'bg-red-100 text-red-700',
};

export default function MasterclassDetail() {
  const { id } = useParams();
  const item = masterclasses.find((m) => m.id === id);

  if (!item) {
    return (
      <SidebarLayout>
        <div className="px-vara-base py-vara-lg max-w-3xl mx-auto text-center">
          <h1 className="text-vara-xl font-semibold text-soft-charcoal mb-4">Content not found</h1>
          <p className="text-muted-sage-gray mb-6">The masterclass you're looking for doesn't exist.</p>
          <Link to="/masterclass" className="text-evergreen-teal hover:underline font-medium">
            &larr; Back to Masterclass
          </Link>
        </div>
      </SidebarLayout>
    );
  }

  const difficultyClass = difficultyColors[item.difficulty] || difficultyColors.beginner;

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-3xl mx-auto">
        {/* Back Link */}
        <Link
          to="/masterclass"
          className="inline-flex items-center gap-1.5 text-vara-sm text-evergreen-teal hover:underline mb-vara-lg"
        >
          <ArrowLeft size={16} />
          Back to Masterclass
        </Link>

        {/* Hero Section */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-evergreen-teal/10 flex items-center justify-center">
              <BookOpen size={32} className="text-evergreen-teal" />
            </div>
            <div>
              <h1 className="text-vara-xl font-semibold text-soft-charcoal">{item.title}</h1>
              <p className="text-vara-sm text-muted-sage-gray mt-1">with {item.instructor}</p>
            </div>
          </div>

          {/* Metadata Chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.duration}
            </span>
            <span className="bg-evergreen-teal/[0.06] text-evergreen-teal text-xs font-medium py-1 px-3 rounded-vara-pill">
              {item.topic}
            </span>
            <span className={`text-xs font-medium py-1 px-3 rounded-vara-pill ${difficultyClass}`}>
              {item.difficulty.charAt(0).toUpperCase() + item.difficulty.slice(1)}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">About this Masterclass</h2>
          <p className="text-vara-sm text-soft-charcoal leading-relaxed">{item.description}</p>
        </div>

        {/* What You'll Learn */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">What You'll Learn</h2>
          <ul className="space-y-3">
            {item.topics.map((topic, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle size={18} className="text-evergreen-teal flex-shrink-0 mt-0.5" />
                <span className="text-vara-sm text-soft-charcoal leading-relaxed">{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Start Learning Button */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm mb-vara-lg text-center">
          <button
            disabled
            className="inline-flex items-center gap-2 bg-dew-sage-light text-muted-sage-gray/60 font-medium py-3 px-6 rounded-vara-pill cursor-not-allowed"
          >
            Available Soon
          </button>
          <p className="text-vara-xs text-muted-sage-gray mt-3">Video content is being prepared by our expert instructors</p>
        </div>

        {/* Instructor Section */}
        <div className="bg-white rounded-vara-lg border border-divider p-vara-lg shadow-vara-sm">
          <h2 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-base">About the Instructor</h2>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-silver-sage/30 flex items-center justify-center">
              <User size={24} className="text-muted-sage-gray" />
            </div>
            <div>
              <h3 className="text-vara-sm font-semibold text-soft-charcoal">{item.instructor}</h3>
              <p className="text-vara-sm text-muted-sage-gray leading-relaxed mt-1">{item.bio}</p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
