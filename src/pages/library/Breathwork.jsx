import React from 'react';
import { Link } from 'react-router-dom';
import SidebarLayout from '../../components/layout/SidebarLayout';
import { Wind } from 'lucide-react';

export default function Breathwork() {
  const resources = [
    {
      id: 'box-breathing',
      title: 'Box Breathing (4-4-4-4)',
      description: 'A calming breathing pattern to reduce anxiety and center yourself.',
      duration: '5 min',
      type: 'Audio',
    },
    {
      id: 'morning-energizer',
      title: 'Morning Energizer',
      description: 'A breathwork routine to stimulate your energy and clarity.',
      duration: '6 min',
      type: 'Video',
    },
    {
      id: 'evening-unwind',
      title: 'Evening Unwind',
      description: 'Wind down with gentle breath awareness.',
      duration: '7 min',
      type: 'Audio',
    },
  ];

  return (
    <SidebarLayout>
      <div className="px-vara-base py-vara-lg max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-vara-base">
          <Wind size={28} className="text-evergreen-teal" />
          <h1 className="text-vara-2xl font-semibold text-evergreen-teal tracking-tight">Breathwork</h1>
        </div>
        <p className="text-muted-sage-gray mb-vara-lg max-w-xl">
          Explore guided breathwork techniques to help reduce stress, restore calm, and support your nervous system.
        </p>

        {/* Resource Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-vara-lg">
          {resources.map((item) => (
            <Link
              key={item.id}
              to={`/library/breathwork/${item.id}`}
              className="bg-white border border-divider rounded-vara-lg p-vara-base shadow-vara-sm hover:shadow-vara-md transition block"
            >
              <h3 className="text-vara-lg font-semibold text-evergreen-teal mb-1">{item.title}</h3>
              <p className="text-vara-sm text-muted-sage-gray mb-2">{item.description}</p>
              <div className="text-vara-xs text-muted-sage-gray">
                {item.duration} • {item.type}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
