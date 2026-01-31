/**
 * Brain Health Mapping
 * Maps habit categories to neurochemical impacts and brain health pillars
 * Based on neuroscience research
 */

/**
 * @typedef {Object} NeurochemicalImpact
 * @property {string} name - Name of the neurochemical/impact (e.g., "Dopamine", "Energy")
 * @property {'increase'|'decrease'} direction - Whether the impact increases or decreases
 * @property {string} icon - Icon name for visual representation
 */

/**
 * @typedef {Object} HabitBrainMapping
 * @property {NeurochemicalImpact[]} neurochemicals - List of neurochemical impacts
 * @property {Array<'growth'|'energy'|'focus'|'resilience'|'connection'>} pillars - Brain health pillars supported
 * @property {string} description - Human-readable description of brain health benefits
 */

/**
 * Habit Category to Brain Health Mappings
 * Key: habit category (lowercase)
 * Value: neurochemical impacts and supported brain pillars
 */
export const HABIT_BRAIN_MAPPING = {
  // Physical Activity & Movement
  fitness: {
    neurochemicals: [
      { name: 'Energy', direction: 'increase', icon: 'lightning-bolt' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
      { name: 'Stress', direction: 'decrease', icon: 'shield-alert' },
    ],
    pillars: ['energy', 'resilience', 'growth'],
    description: 'Boosts vitality, strengthens your brain, reduces stress',
  },

  exercise: {
    neurochemicals: [
      { name: 'Blood Flow', direction: 'increase', icon: 'heart' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
    ],
    pillars: ['energy', 'focus'],
    description: 'Enhances mental clarity and memory',
  },

  movement: {
    neurochemicals: [
      { name: 'Blood Flow', direction: 'increase', icon: 'heart' },
      { name: 'Alertness', direction: 'increase', icon: 'eye' },
    ],
    pillars: ['energy', 'focus'],
    description: 'Improves attention and sharpness',
  },

  // Sleep & Rest
  sleep: {
    neurochemicals: [
      { name: 'Recovery', direction: 'increase', icon: 'sleep' },
      { name: 'Memory', direction: 'increase', icon: 'brain' },
    ],
    pillars: ['energy', 'growth'],
    description: 'Recharges your brain, consolidates learning',
  },

  rest: {
    neurochemicals: [
      { name: 'Stress', direction: 'decrease', icon: 'shield-check' },
      { name: 'Recovery', direction: 'increase', icon: 'heart-pulse' },
    ],
    pillars: ['energy', 'resilience'],
    description: 'Activates rest and recovery',
  },

  // Mindfulness & Meditation
  mindfulness: {
    neurochemicals: [
      { name: 'Calm', direction: 'increase', icon: 'meditation' },
      { name: 'Stress', direction: 'decrease', icon: 'shield-check' },
      { name: 'Attention', direction: 'increase', icon: 'eye' },
    ],
    pillars: ['resilience', 'focus', 'growth'],
    description: 'Strengthens attention, reduces reactivity',
  },

  meditation: {
    neurochemicals: [
      { name: 'Calm', direction: 'increase', icon: 'meditation' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
    ],
    pillars: ['resilience', 'focus'],
    description: 'Calms your mind, enhances focus',
  },

  // Nutrition & Hydration
  nutrition: {
    neurochemicals: [
      { name: 'Brain Fuel', direction: 'increase', icon: 'food' },
      { name: 'Clarity', direction: 'increase', icon: 'lightbulb' },
    ],
    pillars: ['energy'],
    description: 'Fuels your brain with essential nutrients',
  },

  hydration: {
    neurochemicals: [
      { name: 'Blood Flow', direction: 'increase', icon: 'water' },
      { name: 'Clarity', direction: 'increase', icon: 'lightbulb' },
    ],
    pillars: ['energy', 'focus'],
    description: 'Optimizes brain function and clarity',
  },

  // Learning & Cognitive
  learning: {
    neurochemicals: [
      { name: 'Memory', direction: 'increase', icon: 'brain' },
      { name: 'Motivation', direction: 'increase', icon: 'lightbulb' },
    ],
    pillars: ['growth', 'focus'],
    description: 'Builds new skills, strengthens memory',
  },

  creativity: {
    neurochemicals: [
      { name: 'Inspiration', direction: 'increase', icon: 'palette' },
      { name: 'Insight', direction: 'increase', icon: 'lightbulb' },
    ],
    pillars: ['growth', 'focus'],
    description: 'Enhances creative thinking and problem-solving',
  },

  // Social Connection
  social: {
    neurochemicals: [
      { name: 'Bonding', direction: 'increase', icon: 'heart' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
      { name: 'Stress', direction: 'decrease', icon: 'shield-check' },
    ],
    pillars: ['connection', 'resilience'],
    description: 'Builds relationships, reduces stress, boosts wellbeing',
  },

  connection: {
    neurochemicals: [
      { name: 'Bonding', direction: 'increase', icon: 'heart' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
    ],
    pillars: ['connection', 'resilience'],
    description: 'Strengthens relationships and emotional health',
  },

  // Self-Care & Stress Management
  'self-care': {
    neurochemicals: [
      { name: 'Stress', direction: 'decrease', icon: 'spa' },
      { name: 'Mood', direction: 'increase', icon: 'emoticon-happy' },
    ],
    pillars: ['resilience', 'energy'],
    description: 'Reduces stress, promotes recovery',
  },

  // Productivity & Focus
  productivity: {
    neurochemicals: [
      { name: 'Motivation', direction: 'increase', icon: 'check-circle' },
      { name: 'Attention', direction: 'increase', icon: 'eye' },
    ],
    pillars: ['focus', 'growth'],
    description: 'Enhances sustained attention and drive',
  },

  // Health & Wellness (general)
  health: {
    neurochemicals: [
      { name: 'Vitality', direction: 'increase', icon: 'heart-pulse' },
      { name: 'Inflammation', direction: 'decrease', icon: 'shield-check' },
    ],
    pillars: ['energy', 'resilience'],
    description: 'Supports overall health and resilience',
  },
};

/**
 * Get neurochemical impacts for a habit category
 * Returns default mapping if category not found
 * @param {string} category - The habit category
 * @returns {NeurochemicalImpact[]}
 */
export function getNeurochemicalTags(category) {
  if (!category) return [];

  const normalized = category.toLowerCase().trim();
  const mapping = HABIT_BRAIN_MAPPING[normalized];

  return mapping?.neurochemicals || [];
}

/**
 * Get brain pillars supported by a habit category
 * @param {string} category - The habit category
 * @returns {Array<'growth'|'energy'|'focus'|'resilience'|'connection'>}
 */
export function getBrainPillars(category) {
  if (!category) return [];

  const normalized = category.toLowerCase().trim();
  const mapping = HABIT_BRAIN_MAPPING[normalized];

  return mapping?.pillars || [];
}

/**
 * Get brain health description for a habit category
 * @param {string} category - The habit category
 * @returns {string}
 */
export function getBrainHealthDescription(category) {
  if (!category) return '';

  const normalized = category.toLowerCase().trim();
  const mapping = HABIT_BRAIN_MAPPING[normalized];

  return mapping?.description || '';
}

/**
 * Get full brain health mapping for a habit category
 * @param {string} category - The habit category
 * @returns {HabitBrainMapping|undefined}
 */
export function getHabitBrainMapping(category) {
  if (!category) return undefined;

  const normalized = category.toLowerCase().trim();
  return HABIT_BRAIN_MAPPING[normalized];
}

/**
 * Format neurochemical impact as display text
 * Examples: "↑ Dopamine", "↓ Cortisol"
 * @param {NeurochemicalImpact} impact - The neurochemical impact object
 * @returns {string}
 */
export function formatNeurochemicalTag(impact) {
  const arrow = impact.direction === 'increase' ? '↑' : '↓';
  return `${arrow} ${impact.name}`;
}

/**
 * Get all available habit categories
 * @returns {string[]}
 */
export function getAllHabitCategories() {
  return Object.keys(HABIT_BRAIN_MAPPING);
}

/**
 * Check if a category has brain health mapping
 * @param {string} category - The habit category
 * @returns {boolean}
 */
export function hasBrainHealthMapping(category) {
  if (!category) return false;
  const normalized = category.toLowerCase().trim();
  return normalized in HABIT_BRAIN_MAPPING;
}
