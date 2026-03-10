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
      <div className="max-w-5xl mx-auto px-vara-base py-vara-lg">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="text-evergreen-teal" size={32} />
            <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Masterclass</h1>
          </div>
          <p className="text-muted-sage-gray">
            Expert-led video education on brain health, wellness, and peak performance
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="mb-8 bg-gradient-to-r from-evergreen-teal to-silver-sage rounded-xl shadow-sm p-8 text-white">
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
          <h2 className="text-xl font-semibold text-soft-charcoal mb-4">Upcoming Masterclasses</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingClasses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-xl shadow-sm border border-divider overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Thumbnail placeholder */}
              <div className="h-40 bg-gradient-to-br from-evergreen-teal to-silver-sage flex items-center justify-center">
                <Play className="text-white" size={48} />
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold text-evergreen-teal bg-silver-sage/30 px-2 py-1 rounded">
                    {course.topic}
                  </span>
                  <span className="text-xs text-muted-sage-gray">{course.duration}</span>
                </div>

                <h3 className="text-lg font-semibold text-soft-charcoal mb-2">
                  {course.title}
                </h3>

                <p className="text-sm text-muted-sage-gray mb-3">
                  {course.instructor}
                </p>

                <p className="text-sm text-muted-sage-gray mb-4">
                  {course.description}
                </p>

                <button
                  className="w-full bg-dew-sage-light text-muted-sage-gray/60 px-4 py-2 rounded-lg font-medium cursor-not-allowed"
                  disabled
                >
                  Coming Soon
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Topics Overview */}
        <div className="mt-12 bg-white rounded-xl shadow-sm border border-divider p-6">
          <h3 className="text-xl font-semibold text-soft-charcoal mb-4">Masterclass Topics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Sleep Science</h4>
                <p className="text-sm text-muted-sage-gray">Optimize your rest and recovery</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Breathwork</h4>
                <p className="text-sm text-muted-sage-gray">Master your breath, master your state</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Nutrition</h4>
                <p className="text-sm text-muted-sage-gray">Fuel your brain for peak performance</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Movement</h4>
                <p className="text-sm text-muted-sage-gray">Exercise for cognitive health</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Gut Health</h4>
                <p className="text-sm text-muted-sage-gray">The gut-brain connection</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Hormones</h4>
                <p className="text-sm text-muted-sage-gray">Optimize your hormonal health</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Longevity</h4>
                <p className="text-sm text-muted-sage-gray">Strategies for healthspan</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-silver-sage/30 rounded-lg p-2">
                <BookOpen className="text-evergreen-teal" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-soft-charcoal">Stress & Resilience</h4>
                <p className="text-sm text-muted-sage-gray">Build mental toughness</p>
              </div>
            </div>
          </div>
        </div>

        {/* My Learning Section */}
        <div className="mt-8 bg-teal-light border border-evergreen-teal/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-soft-charcoal mb-2">Your Learning Journey</h3>
          <p className="text-muted-sage-gray mb-4">
            Track your progress, bookmark key moments, take notes, and earn certificates as you complete masterclasses.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-evergreen-teal">0</p>
              <p className="text-sm text-muted-sage-gray">Courses Started</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-evergreen-teal">0</p>
              <p className="text-sm text-muted-sage-gray">Courses Completed</p>
            </div>
            <div className="bg-white rounded-lg p-4">
              <p className="text-2xl font-bold text-evergreen-teal">0 hrs</p>
              <p className="text-sm text-muted-sage-gray">Total Learning Time</p>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
