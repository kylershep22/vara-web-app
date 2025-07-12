import React from 'react';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Wind } from 'lucide-react';

export default function Breathwork() {
  const resources = [
    {
      title: 'Box Breathing (4-4-4-4)',
      description: 'A calming breathing pattern to reduce anxiety and center yourself.',
      duration: '5 min',
      type: 'Audio',
    },
    {
      title: 'Morning Energizer',
      description: 'A breathwork routine to stimulate your energy and clarity.',
      duration: '6 min',
      type: 'Video',
    },
    {
      title: 'Evening Unwind',
      description: 'Wind down with gentle breath awareness.',
      duration: '7 min',
      type: 'Audio',
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Wind size={28} className="text-[#1B5E57]" />
          <h1 className="text-2xl font-semibold text-[#3E3E3E]">Breathwork</h1>
        </div>
        <p className="text-[#9AAE8C] mb-6 max-w-xl">
          Explore guided breathwork techniques to help reduce stress, restore calm, and support your nervous system.
        </p>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((item, i) => (
            <div
              key={i}
              className="bg-white border border-[#D5E3D1] rounded-xl p-4 shadow-sm hover:shadow-md transition"
            >
              <h3 className="text-lg font-semibold text-[#1B5E57] mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
              <div className="text-xs text-gray-500">
                {item.duration} • {item.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
