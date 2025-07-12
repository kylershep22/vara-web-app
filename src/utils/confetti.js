import confetti from "canvas-confetti";

// Style guide brand colors
const styleColors = [
  "#1B5E57", // Deep green
  "#B8CDBA", // Soft mint
  "#D5E3D1", // Pale sage
  "#F4C542", // Gold
  "#F5B971", // Peach
  "#9AAE8C"  // Moss green
];

// 🎉 Fire a full-screen burst of confetti
export const triggerConfetti = () => {
  confetti({
    particleCount: 120,
    startVelocity: 25,
    spread: 80,
    ticks: 300,
    gravity: 0.7,
    origin: { x: 0.5, y: 0.6 },
    colors: styleColors,
    zIndex: 9999,
  });
};

