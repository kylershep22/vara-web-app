/**
 * All plain-language brain health copy used across the app.
 * Rules: No em dashes. No scientific jargon. Written like a friend explaining something.
 */

// BrainHealthInsightStrip - 6 rotating messages on dashboard
export const INSIGHT_STRIP_MESSAGES = [
  'Your brain can only hold a few things in focus at once. Removing distractions doesn\'t just help you concentrate, it changes how deeply your brain processes what\'s in front of you.',
  'Your brain builds habits by strengthening connections between neurons. Every time you repeat a habit, that connection gets a little stronger.',
  'Small changes stick better when they match your brain\'s natural energy patterns. That\'s why timing matters almost as much as effort.',
  'Rest isn\'t the opposite of productivity. Your brain does some of its most important work during downtime, including locking in what you learned today.',
  'Consistency doesn\'t require perfection. Showing up most days matters more than never missing one.',
  'Habits are easier to maintain when they work with your brain\'s natural rhythms instead of fighting them.',
];

// BrainHealthEducationCard - 10 facts with tips, rewritten to plain language
export const EDUCATION_CARD_ITEMS = [
  {
    pillar: 'energy',
    icon: 'lightning-bolt',
    label: 'Energy',
    title: 'Power Your Brain',
    fact: 'Your brain uses about 20% of your energy every day, even though it\'s tiny compared to the rest of your body. That\'s why mental exhaustion is real.',
    tip: 'Try a quick movement break to boost blood flow and mental clarity.',
    route: 'Movement',
  },
  {
    pillar: 'energy',
    icon: 'power-sleep',
    label: 'Energy',
    title: 'Rest for Success',
    fact: 'During deep sleep, your brain cleans itself out about 10 times faster than when you\'re awake. That\'s why a bad night hits so hard the next day.',
    tip: 'Aim for 7 to 9 hours of quality sleep for your brain to do its best work.',
    route: 'Sleep',
  },
  {
    pillar: 'focus',
    icon: 'target',
    label: 'Focus',
    title: 'Master Your Focus',
    fact: 'The part of your brain responsible for focus is one of the last areas to fully mature. That means focus is a skill you can keep building your whole life.',
    tip: 'Work in 90-minute blocks with breaks to keep your concentration sharp.',
    route: 'Focus',
  },
  {
    pillar: 'focus',
    icon: 'meditation',
    label: 'Focus',
    title: 'Train Attention',
    fact: 'About 8 weeks of regular mindfulness practice can physically change your brain in ways that show up on scans. Small daily effort adds up.',
    tip: 'Try 5 minutes of focused breathing to strengthen your attention.',
    route: 'Breathwork',
  },
  {
    pillar: 'growth',
    icon: 'brain',
    label: 'Growth',
    title: 'Grow Your Brain',
    fact: 'Your brain can form new connections throughout your entire life. It never stops adapting and growing.',
    tip: 'Learn something new today. Even 15 minutes of learning stimulates brain growth.',
    route: 'Masterclass',
  },
  {
    pillar: 'growth',
    icon: 'book-open-variant',
    label: 'Growth',
    title: 'Learn to Thrive',
    fact: 'Challenging your mind regularly builds a reserve of brain capacity that protects you over time.',
    tip: 'Journal your thoughts. Writing strengthens the connections in your brain.',
    route: 'Journal',
  },
  {
    pillar: 'resilience',
    icon: 'shield-check',
    label: 'Resilience',
    title: 'Build Resilience',
    fact: 'There\'s a major nerve connecting your brain and body that helps manage your stress response. You can actually train it to work better.',
    tip: 'Deep breathing activates your calm-down system in seconds.',
    route: 'Breathwork',
  },
  {
    pillar: 'resilience',
    icon: 'heart-pulse',
    label: 'Resilience',
    title: 'Stress Mastery',
    fact: 'A moderate amount of stress can actually sharpen your memory and focus. The key is recovery afterward.',
    tip: 'Try reframing challenges as growth opportunities for your brain.',
    route: 'BrainHealth',
  },
  {
    pillar: 'connection',
    icon: 'account-group',
    label: 'Connection',
    title: 'Social Brain Health',
    fact: 'Strong social connections can reduce your risk of cognitive decline by up to 50%. Your brain is wired to thrive on connection.',
    tip: 'Reach out to someone today. Social interaction is fuel for your brain.',
    route: 'Community',
  },
  {
    pillar: 'connection',
    icon: 'account-heart',
    label: 'Connection',
    title: 'The Power of Connection',
    fact: 'The bonding chemicals your brain releases during good conversations improve memory and learning.',
    tip: 'Quality conversations matter more than quantity for brain health.',
    route: 'Community',
  },
];

// HabitCompletionSheet "Did you know?" micro-insights by category
export const COMPLETION_INSIGHTS: Record<string, string[]> = {
  'Sleep': [
    'Even one extra hour of sleep can improve your focus and decision-making the next day.',
    'Your brain processes and organizes memories while you sleep. Good rest tonight means clearer thinking tomorrow.',
    'Sleep is when your brain clears out the waste from the day. Think of it as your nightly reset.',
  ],
  'Focus & Clarity': [
    'Short focus sessions build your brain\'s attention capacity over time, like reps at the gym.',
    'Your brain gets better at focusing the more you practice it. Each session is training.',
    'Taking breaks between focus sessions actually helps your brain work better, not worse.',
  ],
  'Movement': [
    'Movement sends growth signals to your brain that help with learning and memory for hours after.',
    'Even a short walk increases blood flow to your brain and can improve your mood within minutes.',
    'Regular movement helps your brain create new connections more easily.',
  ],
  'Mindfulness': [
    'A few minutes of mindfulness can calm your nervous system for the rest of the day.',
    'Mindfulness practice makes your brain better at catching stress before it spirals.',
    'Your brain\'s ability to focus improves with regular mindfulness, even in small doses.',
  ],
  'Connection': [
    'Meaningful conversations activate the same brain areas involved in reward and motivation.',
    'Your brain is wired for connection. Social interaction isn\'t a luxury, it\'s a need.',
    'Positive social moments help your brain recover from stress faster.',
  ],
  'General': [
    'Every time you complete a habit, your brain makes it a little easier to do it next time.',
    'Your brain responds to patterns more than perfection. Showing up most days is what matters.',
    'Building a habit is like wearing a path through a field. Each time, the path gets clearer.',
  ],
};

/**
 * Get a "Did you know?" insight for a habit completion, based on category.
 * Rotates daily so users don't see the same message twice in a row.
 */
export function getCompletionInsight(category?: string): string {
  const pool = COMPLETION_INSIGHTS[category || 'General'] || COMPLETION_INSIGHTS['General'];
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return pool[dayOfYear % pool.length];
}
