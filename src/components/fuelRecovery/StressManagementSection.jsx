// src/components/fuelRecovery/StressManagementSection.jsx

import React, { useState } from 'react';
import { Brain, Zap, Heart, Target, BookOpen, TrendingUp, Shield } from 'lucide-react';

const StressManagementSection = ({ userId }) => {
  const [expandedTopic, setExpandedTopic] = useState(null);

  const stressTopics = [
    {
      id: 'stress-tool',
      title: 'Stress is a Tool, Not the Enemy',
      icon: Zap,
      color: 'from-orange-500 to-red-500',
      summary: 'Reframe your relationship with stress and learn how to use it for growth.',
      content: [
        {
          heading: 'The Stress Paradox',
          text: 'Stress isn\'t inherently bad. In fact, acute stress can enhance performance, sharpen focus, and improve memory. The problem isn\'t stress itself—it\'s chronic, unmanaged stress that becomes harmful.'
        },
        {
          heading: 'Two Types of Stress',
          text: 'Eustress (good stress) challenges you and helps you grow. Distress (bad stress) overwhelms you and depletes your resources. The key is learning to recognize the difference and respond accordingly.'
        },
        {
          heading: 'Building Stress Resilience',
          text: 'Just like muscles, your stress response system gets stronger when challenged appropriately and given time to recover. This is called hormetic stress—small doses of challenge that build resilience.'
        }
      ],
      practices: [
        'Reframe stressful situations as challenges, not threats',
        'Practice voluntary stress exposure (cold showers, exercise)',
        'Build recovery time into your schedule',
        'Track your stress patterns to understand your triggers'
      ]
    },
    {
      id: 'nervous-system',
      title: 'Understanding Your Nervous System',
      icon: Brain,
      color: 'from-purple-500 to-pink-500',
      summary: 'Learn how your autonomic nervous system works and how to regulate it.',
      content: [
        {
          heading: 'Sympathetic vs Parasympathetic',
          text: 'Your sympathetic nervous system activates the "fight or flight" response. Your parasympathetic nervous system activates "rest and digest." Neither is bad—you need both. The goal is flexibility to shift between them.'
        },
        {
          heading: 'Vagal Tone',
          text: 'The vagus nerve is the main nerve of your parasympathetic system. Higher vagal tone means better emotional regulation, stress resilience, and physical health. You can train your vagal tone.'
        },
        {
          heading: 'Heart Rate Variability (HRV)',
          text: 'HRV measures the variation in time between heartbeats. Higher HRV generally indicates better stress resilience and recovery capacity. It\'s influenced by sleep, exercise, nutrition, and stress management.'
        }
      ],
      practices: [
        'Practice deep breathing (stimulates vagus nerve)',
        'Cold exposure (activates parasympathetic system)',
        'Humming or singing (vagal nerve stimulation)',
        'Track HRV to monitor stress and recovery'
      ]
    },
    {
      id: 'stress-response',
      title: 'The Stress Response Cycle',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      summary: 'Why completing the stress response cycle is critical for your health.',
      content: [
        {
          heading: 'The Problem with Modern Stress',
          text: 'Historically, stress was physical (running from a lion). Your body would mobilize energy, act, and then rest. Today, stress is psychological (work deadlines, relationship conflicts), but your body still activates the same physical response—without the release.'
        },
        {
          heading: 'Completing the Cycle',
          text: 'Your body needs to physically process and complete the stress response. If you don\'t, stress hormones like cortisol and adrenaline stay elevated, leading to anxiety, sleep problems, and health issues.'
        },
        {
          heading: 'Physical Release is Key',
          text: 'The stress response is meant to be discharged through physical activity. This is why movement is so powerful for stress relief—it completes the biological stress cycle.'
        }
      ],
      practices: [
        'Move your body after stressful events (walk, shake, dance)',
        'Practice progressive muscle relaxation',
        'Engage in intense exercise to discharge stress hormones',
        'Use breathwork to signal safety to your nervous system'
      ]
    },
    {
      id: 'recovery-practices',
      title: 'Active Recovery Practices',
      icon: Heart,
      color: 'from-green-500 to-emerald-500',
      summary: 'Practical techniques to actively manage and recover from stress.',
      content: [
        {
          heading: 'Sleep is Non-Negotiable',
          text: 'Sleep is when your brain processes stress and consolidates emotional memories. Poor sleep amplifies stress, reduces resilience, and impairs decision-making. Prioritize 7-9 hours of quality sleep.'
        },
        {
          heading: 'Movement as Medicine',
          text: 'Exercise is one of the most powerful stress management tools. It completes the stress cycle, improves mood, enhances resilience, and protects brain health. Even 10-minute walks help.'
        },
        {
          heading: 'Social Connection',
          text: 'Connection with others activates your parasympathetic nervous system and releases oxytocin, which counteracts cortisol. Isolation amplifies stress; connection heals.'
        }
      ],
      practices: [
        'Establish a consistent sleep schedule',
        'Move your body daily (walking, stretching, exercise)',
        'Connect with friends or community regularly',
        'Practice gratitude to shift your nervous system state'
      ]
    },
    {
      id: 'cognitive-strategies',
      title: 'Cognitive Stress Management',
      icon: Target,
      color: 'from-indigo-500 to-purple-500',
      summary: 'Mental frameworks and strategies to manage stress effectively.',
      content: [
        {
          heading: 'Stress Mindset Matters',
          text: 'Research shows that people who view stress as enhancing (rather than debilitating) have better health outcomes, better performance, and lower cortisol levels. Your mindset literally changes how stress affects you.'
        },
        {
          heading: 'Cognitive Reappraisal',
          text: 'This is the practice of reframing how you interpret a situation. Instead of "This is overwhelming," try "This is challenging, and I have the tools to handle it." Same situation, different nervous system response.'
        },
        {
          heading: 'Locus of Control',
          text: 'Focus on what you can control (your response, your actions, your mindset) and let go of what you can\'t (other people, outcomes, the past). This reduces unnecessary stress.'
        }
      ],
      practices: [
        'Journal about stressful situations and reframe them',
        'Practice the "stress-enhancing" mindset',
        'Identify what you can and cannot control',
        'Use "and" instead of "but" (I\'m stressed AND I can handle this)'
      ]
    }
  ];

  const toggleTopic = (topicId) => {
    setExpandedTopic(expandedTopic === topicId ? null : topicId);
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-lg">
            <Zap className="text-orange-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-orange-900 mb-2">Stress is Not the Enemy</h2>
            <p className="text-orange-700 mb-3">
              You've been told to "reduce stress" and "avoid burnout," but what if stress isn't the villain?
              What if the real problem is how we respond to stress and fail to recover from it?
            </p>
            <p className="text-orange-700">
              This section will teach you how to reframe stress, understand your nervous system,
              and build practices that turn stress into a tool for growth and resilience.
            </p>
          </div>
        </div>
      </div>

      {/* Key Principles Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-4">
          <Shield className="text-blue-600 mb-2" size={24} />
          <h3 className="font-semibold text-blue-900 mb-1">Build Resilience</h3>
          <p className="text-sm text-blue-700">
            Small doses of stress make you stronger. Recovery builds capacity.
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4">
          <Brain className="text-purple-600 mb-2" size={24} />
          <h3 className="font-semibold text-purple-900 mb-1">Regulate Your System</h3>
          <p className="text-sm text-purple-700">
            Learn to shift between activation and rest intentionally.
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg p-4">
          <Heart className="text-green-600 mb-2" size={24} />
          <h3 className="font-semibold text-green-900 mb-1">Complete the Cycle</h3>
          <p className="text-sm text-green-700">
            Stress needs physical release. Movement and rest complete the cycle.
          </p>
        </div>
      </div>

      {/* Educational Topics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Deep Dives</h3>
        {stressTopics.map(topic => {
          const Icon = topic.icon;
          const isExpanded = expandedTopic === topic.id;

          return (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Topic Header */}
              <button
                onClick={() => toggleTopic(topic.id)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 bg-gradient-to-br ${topic.color} rounded-lg`}>
                    <Icon className="text-white" size={24} />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-900 text-lg">{topic.title}</h4>
                    <p className="text-sm text-gray-600">{topic.summary}</p>
                  </div>
                </div>
                <BookOpen
                  className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  size={20}
                />
              </button>

              {/* Topic Content */}
              {isExpanded && (
                <div className="px-6 pb-6 space-y-6 border-t border-gray-100">
                  {/* Content Sections */}
                  {topic.content.map((section, idx) => (
                    <div key={idx} className="pt-4">
                      <h5 className="font-semibold text-gray-900 mb-2">{section.heading}</h5>
                      <p className="text-gray-700 leading-relaxed">{section.text}</p>
                    </div>
                  ))}

                  {/* Practices */}
                  <div className="bg-gray-50 rounded-lg p-4 mt-4">
                    <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Target size={18} />
                      Practical Applications
                    </h5>
                    <ul className="space-y-2">
                      {topic.practices.map((practice, idx) => (
                        <li key={idx} className="text-gray-700 flex items-start gap-2">
                          <span className="text-[#1B5E57] mt-1">•</span>
                          <span>{practice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-[#1B5E57] to-[#B8CDBA] rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-2">Ready to Apply These Principles?</h3>
        <p className="mb-4 opacity-90">
          Combine stress management with the other tools in Fuel & Recovery: Sleep for recovery,
          Breathwork for nervous system regulation, and Movement to complete the stress cycle.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="px-4 py-2 bg-white text-[#1B5E57] rounded-lg font-medium hover:shadow-lg transition"
          >
            Explore Other Tools
          </button>
        </div>
      </div>

      {/* Resources Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen size={20} />
          Recommended Resources
        </h3>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-gray-900">The Upside of Stress</h4>
            <p className="text-sm text-gray-600">Kelly McGonigal - How to use stress to your advantage</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Why Zebras Don't Get Ulcers</h4>
            <p className="text-sm text-gray-600">Robert Sapolsky - Understanding stress physiology</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900">Burnout</h4>
            <p className="text-sm text-gray-600">Emily & Amelia Nagoski - Completing the stress cycle</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressManagementSection;
