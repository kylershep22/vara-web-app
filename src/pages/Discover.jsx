import React from "react";
import { useNavigate } from "react-router-dom";
import SidebarLayout from "../components/layout/SidebarLayout";
import { Wind, Moon, Activity, GraduationCap, Compass } from "lucide-react";

const CATEGORIES = [
  { id: "breathwork", label: "Breathwork", desc: "Guided breathing for calm and clarity", icon: Wind, color: "text-evergreen-teal bg-teal-50 border-teal-200", path: "/library/breathwork" },
  { id: "sleep", label: "Sleep", desc: "Tools for restful, restorative sleep", icon: Moon, color: "text-silver-sage bg-sage-50 border-sage-200", path: "/library/sleep" },
  { id: "movement", label: "Movement", desc: "Body-based practices for energy and focus", icon: Activity, color: "text-amber-600 bg-amber-50 border-amber-200", path: "/library/movement" },
  { id: "masterclass", label: "Masterclass", desc: "Deep dives into wellness science", icon: GraduationCap, color: "text-rose-600 bg-rose-50 border-rose-200", path: "/masterclass" },
];

export default function Discover() {
  const navigate = useNavigate();

  return (
    <SidebarLayout>
      <div className="max-w-3xl mx-auto px-vara-base py-vara-lg">
        <div className="flex items-center gap-3 mb-2">
          <Compass size={28} className="text-evergreen-teal" />
          <h1 className="text-vara-2xl font-semibold text-soft-charcoal">Discover</h1>
        </div>
        <p className="text-vara-sm text-muted-sage-gray mb-vara-lg">
          Science-backed tools for your brain & body
        </p>

        <div className="bg-gradient-to-br from-evergreen-teal to-silver-sage rounded-vara-lg p-vara-lg mb-vara-lg text-white">
          <h2 className="text-lg font-semibold mb-2">Your Wellness Library</h2>
          <p className="text-sm opacity-90">
            Explore breathwork, sleep tools, movement practices, and expert-led masterclasses — all designed to support your daily rhythm.
          </p>
        </div>

        <h3 className="text-vara-base font-semibold text-soft-charcoal mb-4">Browse by Category</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CATEGORIES.map(({ id, label, desc, icon: Icon, color, path }) => (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="text-left bg-white rounded-vara-lg border border-divider p-vara-lg hover:shadow-vara-md transition-all group"
            >
              <div className={`w-12 h-12 rounded-xl ${color} border flex items-center justify-center mb-3`}>
                <Icon size={24} />
              </div>
              <h4 className="font-semibold text-soft-charcoal group-hover:text-evergreen-teal transition-colors">
                {label}
              </h4>
              <p className="text-sm text-muted-sage-gray mt-1">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}
