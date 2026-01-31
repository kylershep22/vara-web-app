/**
 * Brain Health Pillars
 * Defines the 5 core brain health pillars with colors, icons, and descriptions
 * Based on neuroscience principles
 */

export const BRAIN_PILLARS = {
  growth: {
    id: 'growth',
    name: 'Growth',
    fullName: 'Neuroplasticity',
    color: '#1B5E57', // Evergreen Teal
    lightColor: '#E8F5E9',
    icon: 'TrendingUp',
    description: 'Learning, adaptation, and trying new things',
    longDescription: 'Neuroplasticity is your brain\'s ability to rewire itself through new experiences, learning, and stepping outside your comfort zone. Every time you do something challenging or uncomfortable, you strengthen this pillar.',
    benefits: [
      'Builds new neural pathways',
      'Enhances learning capacity',
      'Improves cognitive flexibility',
      'Strengthens memory formation'
    ],
    practices: [
      'Learn new skills',
      'Try unfamiliar activities',
      'Embrace discomfort (AMCC challenges)',
      'Practice creative thinking',
      'Engage in novel experiences'
    ]
  },

  energy: {
    id: 'energy',
    name: 'Energy',
    fullName: 'Neuroenergy',
    color: '#F59E0B', // Sunrise Amber
    lightColor: '#FFF3E0',
    icon: 'Zap',
    description: 'Sleep, nutrition, and vitality',
    longDescription: 'Neuroenergy powers your brain\'s performance through quality sleep, proper hydration, nutrition, oxygen flow, and physical movement. Your brain uses 20% of your body\'s energy - fuel it right.',
    benefits: [
      'Optimizes cognitive performance',
      'Improves mental clarity',
      'Enhances focus and concentration',
      'Supports memory consolidation'
    ],
    practices: [
      'Get 7-9 hours of quality sleep',
      'Stay hydrated (8+ glasses water)',
      'Eat brain-healthy foods',
      'Exercise for blood flow',
      'Manage caffeine timing'
    ]
  },

  focus: {
    id: 'focus',
    name: 'Focus',
    fullName: 'Neurofocus',
    color: '#3B82F6', // Blue
    lightColor: '#E3F2FD',
    icon: 'Target',
    description: 'Attention, concentration, and clarity',
    longDescription: 'Neurofocus is your ability to direct and sustain attention on what matters. Through deliberate practice and understanding your ultradian rhythms, you can train your brain to enter deep focus states.',
    benefits: [
      'Extends attention span',
      'Improves working memory',
      'Enhances task completion',
      'Reduces mental wandering'
    ],
    practices: [
      'Use 90-minute focus protocols',
      'Practice soda-straw attention',
      'Minimize distractions',
      'Take strategic breaks',
      'Time tasks with circadian rhythm'
    ]
  },

  resilience: {
    id: 'resilience',
    name: 'Resilience',
    fullName: 'Neuroresilience',
    color: '#8B5CF6', // Purple
    lightColor: '#F3E5F5',
    icon: 'Shield',
    description: 'Stress management and recovery',
    longDescription: 'Neuroresilience is your capacity to handle stress, regulate emotions, and bounce back from challenges. Your AMCC (anterior mid-cingulate cortex) - the "willpower center" - grows stronger when you do hard things.',
    benefits: [
      'Reduces stress reactivity',
      'Improves emotional regulation',
      'Enhances stress tolerance',
      'Speeds recovery time'
    ],
    practices: [
      'Do one hard thing daily (AMCC)',
      'Practice physiological sighs',
      'Use panoramic vision',
      'Embrace discomfort deliberately',
      'Build stress exposure gradually'
    ]
  },

  connection: {
    id: 'connection',
    name: 'Connection',
    fullName: 'Neurosocial Health',
    color: '#EC4899', // Pink
    lightColor: '#FCE4EC',
    icon: 'Users',
    description: 'Social bonds and belonging',
    longDescription: 'Neurosocial health reflects the profound impact of relationships on brain function. Meaningful connections activate reward systems, reduce stress hormones, and provide the sense of belonging essential for wellbeing.',
    benefits: [
      'Reduces loneliness and isolation',
      'Buffers against stress',
      'Improves mood and motivation',
      'Enhances overall life satisfaction'
    ],
    practices: [
      'Nurture close relationships',
      'Engage in meaningful conversations',
      'Join community groups',
      'Practice active listening',
      'Contribute to something larger'
    ]
  }
};

/**
 * Get pillar by ID
 */
export function getPillar(pillarId) {
  return BRAIN_PILLARS[pillarId];
}

/**
 * Get all pillar IDs
 */
export function getAllPillarIds() {
  return Object.keys(BRAIN_PILLARS);
}

/**
 * Get pillar display name
 */
export function getPillarName(pillarId) {
  return BRAIN_PILLARS[pillarId]?.name || pillarId;
}

/**
 * Get pillar color
 */
export function getPillarColor(pillarId) {
  return BRAIN_PILLARS[pillarId]?.color || '#6B7280';
}

/**
 * Get pillar light color (for backgrounds)
 */
export function getPillarLightColor(pillarId) {
  return BRAIN_PILLARS[pillarId]?.lightColor || '#F3F4F6';
}

/**
 * Validate pillar ID
 */
export function isValidPillar(pillarId) {
  return pillarId in BRAIN_PILLARS;
}
