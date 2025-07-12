import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import {
  Wind,
  Dumbbell,
  Moon,
  BookOpen,
  Utensils,
  Video,
  Library
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function WellnessLibrary() {
  const sections = [
    {
      title: 'Breathwork',
      icon: Wind,
      description: 'Guided breathing techniques to reduce stress and reset your nervous system.',
      link: '/library/breathwork',
    },
    {
      title: 'Stretching & Movement',
      icon: Dumbbell,
      description: 'Improve mobility, posture, and energy with low-impact movement routines.',
      link: '/library/movement',
    },
    {
      title: 'Sleep Support',
      icon: Moon,
      description: 'Audio guides and practices to help you wind down and sleep better.',
      link: '/library/sleep',
    },
    {
      title: 'Nutrition',
      icon: Utensils,
      description: 'Educational content on mindful eating, hydration, and nourishment.',
      link: '/library/nutrition',
    },
    {
      title: 'Mindset Coaching',
      icon: BookOpen,
      description: 'Video and audio recordings focused on personal growth and resilience.',
      link: '/library/mindset',
    },
    {
      title: 'Video Recordings',
      icon: Video,
      description: 'Replay wellness sessions, expert interviews, and more.',
      link: '/library/videos',
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-4">
          <Library size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Wellness Library</h1>
        </div>

        <p className="text-[#9AAE8C] mb-8">
          Explore self-paced wellness resources including breathwork, sleep tools, mindset coaching, and more.
        </p>

        {/* Section Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((section, index) => (
            <Link
              to={section.link}
              key={index}
              className="group bg-white border border-[#D5E3D1] rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-[#B8CDBA] transition"
            >
              <div className="flex items-center gap-3 mb-3">
                <section.icon size={24} className="text-[#1B5E57]" />
                <h3 className="text-lg font-semibold text-[#3E3E3E] group-hover:text-[#1B5E57]">
                  {section.title}
                </h3>
              </div>
              <p className="text-sm text-[#666]">{section.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}



