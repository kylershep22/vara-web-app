// src/components/celebrations/ConfettiOverlay.jsx
import React, { useEffect, useState } from 'react';

const COLORS = ['#1B5E57', '#E8A838', '#B8CDBA', '#D5E3D1', '#8B5CF6', '#F59E0B'];

function ConfettiPiece({ index }) {
  const color = COLORS[index % COLORS.length];
  const left = Math.random() * 100;
  const delay = Math.random() * 0.8;
  const duration = 1.5 + Math.random() * 1;
  const rotation = Math.random() * 360;
  const size = 6 + Math.random() * 6;

  return (
    <span
      className="absolute animate-confetti"
      style={{
        left: `${left}%`,
        top: '-12px',
        width: size,
        height: size * 0.6,
        backgroundColor: color,
        borderRadius: '2px',
        transform: `rotate(${rotation}deg)`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      }}
    />
  );
}

export default function ConfettiOverlay({ isActive, duration = 3000, pieceCount = 40 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isActive) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: pieceCount }).map((_, i) => (
        <ConfettiPiece key={i} index={i} />
      ))}
    </div>
  );
}
