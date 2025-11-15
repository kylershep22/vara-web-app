// src/components/fuelRecovery/WellnessVault.jsx

import React, { useState } from 'react';
import { BookOpen, Video, FileText, ExternalLink, Search, Filter } from 'lucide-react';

const WellnessVault = ({ userId }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Curated content library
  const vaultContent = [
    {
      id: 1,
      title: 'The Neuroscience of Sleep and Memory',
      type: 'article',
      category: 'sleep',
      description: 'How sleep consolidates memories and builds cognitive reserve',
      duration: '8 min read',
      url: '#',
      tags: ['sleep', 'memory', 'neuroscience']
    },
    {
      id: 2,
      title: 'Stress as a Tool for Growth',
      type: 'video',
      category: 'stress',
      description: 'Reframing your relationship with stress and building resilience',
      duration: '15 min',
      url: '#',
      tags: ['stress', 'resilience', 'mindset']
    },
    {
      id: 3,
      title: 'Box Breathing Tutorial',
      type: 'video',
      category: 'breathwork',
      description: 'Learn the Navy SEAL breathing technique for stress management',
      duration: '10 min',
      url: '#',
      tags: ['breathwork', 'stress', 'focus']
    },
    {
      id: 4,
      title: 'The Gut-Brain Axis',
      type: 'article',
      category: 'nutrition',
      description: 'Understanding the connection between gut health and mental health',
      duration: '12 min read',
      url: '#',
      tags: ['nutrition', 'gut health', 'mental health']
    },
    {
      id: 5,
      title: 'Movement for Cognitive Function',
      type: 'research',
      category: 'movement',
      description: 'Research summary on exercise and brain-derived neurotrophic factor (BDNF)',
      duration: '6 min read',
      url: '#',
      tags: ['movement', 'exercise', 'BDNF', 'neuroscience']
    },
    {
      id: 6,
      title: 'Heart Rate Variability Explained',
      type: 'article',
      category: 'stress',
      description: 'What HRV tells you about stress, recovery, and nervous system health',
      duration: '10 min read',
      url: '#',
      tags: ['HRV', 'stress', 'recovery', 'nervous system']
    },
    {
      id: 7,
      title: 'Sleep Hygiene Masterclass',
      type: 'video',
      category: 'sleep',
      description: 'Complete guide to optimizing your sleep environment and routine',
      duration: '20 min',
      url: '#',
      tags: ['sleep', 'sleep hygiene', 'recovery']
    },
    {
      id: 8,
      title: 'Wim Hof Method Basics',
      type: 'video',
      category: 'breathwork',
      description: 'Introduction to controlled breathing and cold exposure',
      duration: '18 min',
      url: '#',
      tags: ['breathwork', 'cold exposure', 'resilience']
    },
    {
      id: 9,
      title: 'Omega-3s and Brain Health',
      type: 'research',
      category: 'nutrition',
      description: 'Scientific evidence for EPA/DHA supplementation and cognitive function',
      duration: '8 min read',
      url: '#',
      tags: ['nutrition', 'omega-3', 'supplements', 'brain health']
    },
    {
      id: 10,
      title: 'The Science of Flow States',
      type: 'article',
      category: 'focus',
      description: 'How to access peak performance and deep concentration',
      duration: '14 min read',
      url: '#',
      tags: ['focus', 'flow state', 'performance']
    },
    {
      id: 11,
      title: 'Vagal Tone and Mental Health',
      type: 'article',
      category: 'stress',
      description: 'How to strengthen your vagus nerve for better emotional regulation',
      duration: '10 min read',
      url: '#',
      tags: ['vagal tone', 'nervous system', 'mental health']
    },
    {
      id: 12,
      title: 'Yoga for Brain Health',
      type: 'video',
      category: 'movement',
      description: '30-minute flow designed to improve focus and reduce stress',
      duration: '30 min',
      url: '#',
      tags: ['movement', 'yoga', 'stress', 'flexibility']
    }
  ];

  const categories = [
    { id: 'all', label: 'All Topics', count: vaultContent.length },
    { id: 'sleep', label: 'Sleep', count: vaultContent.filter(c => c.category === 'sleep').length },
    { id: 'stress', label: 'Stress', count: vaultContent.filter(c => c.category === 'stress').length },
    { id: 'breathwork', label: 'Breathwork', count: vaultContent.filter(c => c.category === 'breathwork').length },
    { id: 'movement', label: 'Movement', count: vaultContent.filter(c => c.category === 'movement').length },
    { id: 'nutrition', label: 'Nutrition', count: vaultContent.filter(c => c.category === 'nutrition').length },
    { id: 'focus', label: 'Focus', count: vaultContent.filter(c => c.category === 'focus').length }
  ];

  const types = [
    { id: 'all', label: 'All Types', icon: BookOpen },
    { id: 'article', label: 'Articles', icon: FileText },
    { id: 'video', label: 'Videos', icon: Video },
    { id: 'research', label: 'Research', icon: BookOpen }
  ];

  // Filter content
  const filteredContent = vaultContent.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesSearch = searchQuery === '' ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCategory && matchesType && matchesSearch;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'article': return FileText;
      case 'video': return Video;
      case 'research': return BookOpen;
      default: return BookOpen;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'article': return 'from-blue-500 to-cyan-500';
      case 'video': return 'from-purple-500 to-pink-500';
      case 'research': return 'from-green-500 to-emerald-500';
      default: return 'from-gray-500 to-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-100 rounded-lg">
            <BookOpen className="text-indigo-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-900 mb-2">Wellness Vault</h2>
            <p className="text-indigo-700">
              Curated library of articles, videos, and research on brain health, stress management, recovery, and performance.
              All content is evidence-based and actionable.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Search by title, description, or tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B5E57] focus:border-transparent"
        />
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Category Filter */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Filter size={16} className="text-gray-600" />
            <label className="text-sm font-medium text-gray-700">Filter by Topic</label>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#1B5E57] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat.label} ({cat.count})
              </button>
            ))}
          </div>
        </div>

        {/* Type Filter */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Filter by Type</label>
          <div className="flex flex-wrap gap-2">
            {types.map(type => {
              const Icon = type.icon;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedType === type.id
                      ? 'bg-[#1B5E57] text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} />
                  {type.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        Showing {filteredContent.length} of {vaultContent.length} resources
      </div>

      {/* Content Grid */}
      {filteredContent.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map(item => {
            const Icon = getTypeIcon(item.type);

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-[#1B5E57] hover:shadow-lg transition-all"
              >
                {/* Card Header */}
                <div className={`bg-gradient-to-r ${getTypeColor(item.type)} p-4 rounded-t-xl`}>
                  <div className="flex items-start justify-between mb-2">
                    <Icon className="text-white" size={24} />
                    <span className="text-xs text-white/90 bg-white/20 px-2 py-1 rounded-full capitalize">
                      {item.type}
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-lg leading-snug">{item.title}</h3>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {item.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Duration */}
                  <div className="text-xs text-gray-500 mb-3">{item.duration}</div>

                  {/* View Button */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1B5E57] hover:bg-[#174C46] text-white rounded-lg font-semibold transition-all"
                  >
                    View
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <BookOpen className="mx-auto mb-3 text-gray-300" size={48} />
          <p className="font-medium text-gray-700 mb-1">No resources match your filters</p>
          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Coming Soon Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-1">More Content Coming Soon</h3>
        <p className="text-sm text-blue-700">
          We're constantly adding new articles, videos, and research to the Wellness Vault.
          All links above are placeholders—real content will be added soon!
        </p>
      </div>
    </div>
  );
};

export default WellnessVault;
