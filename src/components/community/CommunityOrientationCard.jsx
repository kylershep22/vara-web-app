import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Trophy, MessageCircle, ArrowRight, X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const CONCEPTS = [
  { icon: Users, label: "Groups", desc: "Ongoing shared spaces for connection" },
  { icon: Trophy, label: "Challenges", desc: "Time-bound intentions to try together" },
  { icon: MessageCircle, label: "Posts & Check-ins", desc: "Share moments from your journey" },
];

export default function CommunityOrientationCard({ userId, onDismiss }) {
  const navigate = useNavigate();

  async function dismiss() {
    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), { community_orientation_seen: true });
      } catch { /* non-critical */ }
    }
    onDismiss();
  }

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg mb-6 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-sage-gray hover:text-soft-charcoal"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold text-soft-charcoal mb-2">Welcome to Community</h2>
      <p className="text-sm text-muted-sage-gray mb-4">
        A space to share, encourage, and build alongside people on similar paths.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {CONCEPTS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2 p-3 bg-dew-sage-light rounded-lg">
            <Icon size={18} className="text-evergreen-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-soft-charcoal">{label}</p>
              <p className="text-xs text-muted-sage-gray">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => { dismiss(); navigate("/community/groups"); }}
          className="flex items-center gap-1 text-sm font-medium text-evergreen-teal hover:underline"
        >
          Find a group to start <ArrowRight size={14} />
        </button>
        <button onClick={dismiss} className="text-sm text-muted-sage-gray hover:text-soft-charcoal">
          Skip for now
        </button>
      </div>
    </div>
  );
}
