import React from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { GraduationCap, Play, BookOpen, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Masterclass() {
  const { user } = useAuth();

  // Placeholder masterclass data
  const upcomingClasses = [
    {
      id: 1,
      title: "The Science of Sleep",
      instructor: "Dr. Sarah Chen",
      duration: "60 min",
      topic: "Sleep",
      description: "Deep dive into sleep architecture, circadian rhythms, and evidence-based strategies for restorative rest."
    },
    {
      id: 2,
      title: "Breathwork Fundamentals",
      instructor: "James Rodriguez",
      duration: "45 min",
      topic: "Breathwork",
      description: "Learn the physiology of breath and practical techniques for relaxation, focus, and energy."
    },
    {
      id: 3,
      title: "Nutrition for Brain Health",
      instructor: "Dr. Emily Taylor",
      duration: "75 min",
      topic: "Nutrition",
      description: "Discover how food impacts cognitive function, mood, and long-term brain resilience."
    }
  ];

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="text-[#1B5E57]" size={32} />
            <h1 className="text-3xl font-bold text-[#3E3E3E]">Masterclass</h1>
          </div>
          <p className="text-[#6B7280]">
            Expert-led video education on brain health, wellness, and peak performance
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="mb-8 bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] rounded-xl shadow-sm p-8 text-white">
          <div className="flex items-start gap-4">
            <GraduationCap size={48} className="flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-bold mb-2">Masterclass Library Coming Soon</h2>
              <p className="opacity-90 mb-4">
                Get ready for in-depth video courses taught by leading experts in sleep science, breathwork, nutrition, movement, and cognitive health.
              </p>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle size={16} />
                <span>Expert instructors</span>
                <span className="opacity-50">•</span>
                <CheckCircle size={16} />
                <span>Science-backed content</span>
                <span className="opacity-50">•</span>
                <CheckCircle size={16} />
                <span>Progress tracking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Masterclasses Preview */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-[#3E3E3E] mb-4">Upcoming Masterclasses</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingClasses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-sm border border-[#D5E3D1] overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail placeholder */}
              <div className="h-40 bg-gradient-to-br from-[#1B5E57] to-[#B8CDBA] flex items-center justify-center">
                <Play className="text-white" size={48} />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-[#1B5E57] bg-[#D5E3D1] px-2 py-1 rounded">
                    {course.topic}
                  </span>
                  <span className="text-xs text-[#6B7280]">{course.duration}</span>
                </div>

                <h3 className="text-lg font-semibold text-[#3E3E3E] mb-2">
                  {course.title}
                </h3>

                <p className="text-sm text-[#6B7280] mb-3">
                  {course.instructor}
                </p>

                <p className="text-sm text-[#6B7280] mb-4">
                  {course.description}
                </p>

                <button
                  className="w-full bg-gray-100 text-gray-400 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Topics Overview */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-[#D5E3D1] p-6">
          <h3 className="text-xl font-semibold text-[#3E3E3E] mb-4">Masterclass Topics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Sleep Science</h4>
                <p className="text-sm text-[#6B7280]">Optimize your rest and recovery</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Breathwork</h4>
                <p className="text-sm text-[#6B7280]">Master your breath, master your state</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Nutrition</h4>
                <p className="text-sm text-[#6B7280]">Fuel your brain for peak performance</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Movement</h4>
                <p className="text-sm text-[#6B7280]">Exercise for cognitive health</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Gut Health</h4>
                <p className="text-sm text-[#6B7280]">The gut-brain connection</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Hormones</h4>
                <p className="text-sm text-[#6B7280]">Optimize your hormonal health</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Longevity</h4>
                <p className="text-sm text-[#6B7280]">Strategies for healthspan</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-[#D5E3D1] rounded-lg p-2">
                <BookOpen className="text-[#1B5E57]" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-[#3E3E3E]">Stress & Resilience</h4>
                <p className="text-sm text-[#6B7280]">Build mental toughness</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Learning Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Learning Journey</h3>
          <p className="text-blue-700 mb-4">
            Track your progress, bookmark key moments, take notes, and earn certificates as you complete masterclasses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-[#1B5E57]">0</p>
              <p className="text-sm text-[#6B7280]">Courses Started</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-[#10B981]">0</p>
              <p className="text-sm text-[#6B7280]">Courses Completed</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-[#F59E0B]">0 hrs</p>
              <p className="text-sm text-[#6B7280]">Total Learning Time</p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
