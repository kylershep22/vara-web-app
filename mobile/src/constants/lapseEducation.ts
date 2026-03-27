/**
 * Plain-language explanations for why habits drop off.
 * Shown inside the WelcomeBackCard when a user returns after 48+ hours.
 * Rules: No em dashes. No jargon. Friend explaining over coffee.
 */

export const LAPSE_EDUCATION_MESSAGES = [
  'When your brain is stretched thin from poor sleep, extra stress, or too many demands, it drops the newest habits first. It\'s not a willpower failure, it\'s energy management. The habits will come back easier than you think.',

  'Habits feel hardest to restart because your brain treats them as optional when it\'s under pressure. The things that fell off were probably the first things your brain let go of to conserve energy. That\'s normal.',

  'Most people think falling off track means they need more discipline. Usually it means something else was draining their energy. When that settles, the habits come back.',

  'Your brain has a limited budget for effort each day. When life gets heavier, it pulls from the newest accounts first, which are usually your habits. Coming back isn\'t starting over. The foundation is still there.',

  'The pattern of starting and stopping isn\'t a character flaw. It\'s your brain doing exactly what brains do under strain. The fact that you\'re here again says more than the gap.',
];

/**
 * Get a lapse education message. Rotates per lapse occurrence.
 * Uses a counter stored in AsyncStorage so the user sees a different
 * message each time they return after a lapse.
 */
export function getLapseMessage(lapseCount: number): string {
  return LAPSE_EDUCATION_MESSAGES[lapseCount % LAPSE_EDUCATION_MESSAGES.length];
}
