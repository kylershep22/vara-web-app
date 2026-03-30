/**
 * Brain State Protocol Definitions
 * Maps each brain state to a recommended protocol.
 * Ported from mobile/src/constants/brainStateProtocols.ts
 */

export const BRAIN_STATES = [
  { state: 'wired', label: 'Wired', description: "Racing thoughts, can't settle", color: '#F87171' },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: '#FBBF24' },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: '#9CA3AF' },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: '#1B5E57' },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: '#10B981' },
];

export const BRAIN_STATE_PROTOCOLS = {
  wired: {
    id: 'extended-exhale',
    brainState: 'wired',
    name: 'Extended Exhale',
    description: 'Longer exhales activate your parasympathetic nervous system, slowing a racing mind.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'breathwork',
    instructions: [
      'Find a comfortable seated position and close your eyes.',
      'Inhale slowly through your nose for 4 seconds.',
      'Exhale slowly through your mouth for 8 seconds.',
      'Repeat this pattern for 5 minutes, letting each exhale feel longer and softer.',
      'When your mind wanders, gently return to the breath count.',
    ],
  },
  foggy: {
    id: 'activating-breathwork',
    brainState: 'foggy',
    name: 'Activating Breathwork',
    description: 'Short, rhythmic breathing increases oxygen flow and wakes up your prefrontal cortex.',
    duration: '4 min',
    durationSeconds: 240,
    category: 'breathwork',
    instructions: [
      'Sit upright with your shoulders back.',
      'Inhale sharply through your nose for 2 seconds.',
      'Exhale forcefully through your mouth for 2 seconds.',
      'Keep a steady, energizing rhythm for 4 minutes.',
      'Finish with one deep breath in and a slow exhale out.',
    ],
  },
  okay: {
    id: 'micro-reset',
    brainState: 'okay',
    name: '90-Second Micro-Reset',
    description: 'A brief pause to reconnect with your senses and sharpen your awareness.',
    duration: '90 sec',
    durationSeconds: 90,
    category: 'reset',
    instructions: [
      'Pause whatever you are doing and sit still.',
      'Name 3 things you can see right now.',
      'Name 2 things you can hear.',
      'Name 1 thing you can feel (texture, temperature, pressure).',
      'Take one slow breath and continue your day.',
    ],
  },
  clear: {
    id: 'gratitude-clarity',
    brainState: 'clear',
    name: 'Gratitude & Clarity Reflection',
    description: 'When your mind is already calm, gratitude deepens that state and builds momentum.',
    duration: '3 min',
    durationSeconds: 180,
    category: 'reflection',
    instructions: [
      'Close your eyes and take three slow breaths.',
      'Think of one thing you are genuinely grateful for today. Stay with it for a moment.',
      'Ask yourself: what is the one thing that matters most today?',
      'Visualize yourself completing that one thing with calm focus.',
      'Open your eyes when you are ready.',
    ],
  },
  energized: {
    id: 'focus-primer',
    brainState: 'energized',
    name: 'Focus Primer',
    description: 'Channel high energy into a single intention before it scatters.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'reflection',
    instructions: [
      'Write down or mentally name the single most important task for this energy.',
      'Close your eyes. Take 5 deep breaths to center your focus.',
      'Visualize the task from start to finish — what does "done" look like?',
      'Set a clear intention: "For the next block of time, I focus only on this."',
      'Open your eyes and begin immediately. Do not check your phone first.',
    ],
  },
};

export function getProtocolForState(state) {
  return BRAIN_STATE_PROTOCOLS[state];
}

export const STATE_RANK = {
  foggy: 1,
  wired: 2,
  okay: 3,
  clear: 4,
  energized: 5,
};
