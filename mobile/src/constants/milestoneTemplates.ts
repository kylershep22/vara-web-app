/**
 * Milestone Templates
 * Suggested milestones organized by goal focus area and timeframe
 */

export interface MilestoneTemplate {
  title: string;
  targetProgress: number; // 0-100
}

export interface MilestoneTemplateSet {
  [timeframe: string]: MilestoneTemplate[];
}

export interface MilestoneTemplatesConfig {
  [focusArea: string]: MilestoneTemplateSet;
}

/**
 * Milestone templates organized by focus area and timeframe
 * Each milestone has a title and target progress percentage
 */
export const MILESTONE_TEMPLATES: MilestoneTemplatesConfig = {
  'Physical Health & Fitness': {
    '21 days': [
      { title: 'Complete your first week', targetProgress: 33 },
      { title: 'Build momentum in week 2', targetProgress: 66 },
      { title: 'Celebrate 21-day commitment', targetProgress: 100 },
    ],
    '30 days': [
      { title: 'Establish your routine (Week 1)', targetProgress: 25 },
      { title: 'Find your rhythm (Week 2)', targetProgress: 50 },
      { title: 'Push through the plateau (Week 3)', targetProgress: 75 },
      { title: 'Complete the month!', targetProgress: 100 },
    ],
    '90 days': [
      { title: 'Build the foundation (Month 1)', targetProgress: 33 },
      { title: 'Strengthen the habit (Month 2)', targetProgress: 66 },
      { title: 'Make it a lifestyle (Month 3)', targetProgress: 100 },
    ],
    '6 months': [
      { title: 'First month complete', targetProgress: 17 },
      { title: 'Quarter way there', targetProgress: 25 },
      { title: 'Halfway milestone', targetProgress: 50 },
      { title: 'Three quarters done', targetProgress: 75 },
      { title: 'Six months achieved!', targetProgress: 100 },
    ],
    '1 year': [
      { title: 'First month complete', targetProgress: 8 },
      { title: 'Quarter 1 done', targetProgress: 25 },
      { title: 'Halfway there!', targetProgress: 50 },
      { title: 'Quarter 3 complete', targetProgress: 75 },
      { title: 'One year achieved!', targetProgress: 100 },
    ],
  },

  'Mental & Emotional Wellness': {
    '21 days': [
      { title: 'Start building awareness', targetProgress: 33 },
      { title: 'Deepen your practice', targetProgress: 66 },
      { title: 'Establish your foundation', targetProgress: 100 },
    ],
    '30 days': [
      { title: 'Begin your journey', targetProgress: 25 },
      { title: 'Notice the changes', targetProgress: 50 },
      { title: 'Embrace the growth', targetProgress: 75 },
      { title: 'Celebrate your progress', targetProgress: 100 },
    ],
    '90 days': [
      { title: 'Plant the seeds', targetProgress: 33 },
      { title: 'Nurture growth', targetProgress: 66 },
      { title: 'Harvest the benefits', targetProgress: 100 },
    ],
    '6 months': [
      { title: 'Build awareness', targetProgress: 17 },
      { title: 'Develop consistency', targetProgress: 33 },
      { title: 'Halfway reflection', targetProgress: 50 },
      { title: 'Deepen understanding', targetProgress: 75 },
      { title: 'Integration complete', targetProgress: 100 },
    ],
    '1 year': [
      { title: 'Foundation built', targetProgress: 25 },
      { title: 'Midway check-in', targetProgress: 50 },
      { title: 'Advanced practice', targetProgress: 75 },
      { title: 'Transformation achieved', targetProgress: 100 },
    ],
  },

  'Lifestyle & Personal Growth': {
    '21 days': [
      { title: 'Take the first steps', targetProgress: 33 },
      { title: 'Build momentum', targetProgress: 66 },
      { title: 'New habit formed', targetProgress: 100 },
    ],
    '30 days': [
      { title: 'Start the change', targetProgress: 25 },
      { title: 'Overcome initial resistance', targetProgress: 50 },
      { title: 'See the results', targetProgress: 75 },
      { title: 'Month of growth complete', targetProgress: 100 },
    ],
    '90 days': [
      { title: 'Lay the groundwork', targetProgress: 33 },
      { title: 'Build the structure', targetProgress: 66 },
      { title: 'Achieve your goal', targetProgress: 100 },
    ],
    '6 months': [
      { title: 'Vision set', targetProgress: 17 },
      { title: 'Progress visible', targetProgress: 33 },
      { title: 'Halfway milestone', targetProgress: 50 },
      { title: 'Near the finish', targetProgress: 83 },
      { title: 'Goal achieved', targetProgress: 100 },
    ],
    '1 year': [
      { title: 'Journey begun', targetProgress: 25 },
      { title: 'Significant progress', targetProgress: 50 },
      { title: 'Almost there', targetProgress: 75 },
      { title: 'Year of growth complete', targetProgress: 100 },
    ],
  },

  'Sleep & Recovery': {
    '21 days': [
      { title: 'Establish bedtime routine', targetProgress: 33 },
      { title: 'Improve sleep quality', targetProgress: 66 },
      { title: 'Better sleep achieved', targetProgress: 100 },
    ],
    '30 days': [
      { title: 'Set your sleep schedule', targetProgress: 25 },
      { title: 'Consistent wake times', targetProgress: 50 },
      { title: 'Quality sleep improving', targetProgress: 75 },
      { title: 'Sleep transformation complete', targetProgress: 100 },
    ],
    '90 days': [
      { title: 'Build sleep hygiene', targetProgress: 33 },
      { title: 'Improve your environment', targetProgress: 66 },
      { title: 'Restful sleep mastered', targetProgress: 100 },
    ],
    '6 months': [
      { title: 'Routine established', targetProgress: 25 },
      { title: 'Consistent patterns', targetProgress: 50 },
      { title: 'Recovery improved', targetProgress: 75 },
      { title: 'Sleep health achieved', targetProgress: 100 },
    ],
    '1 year': [
      { title: 'Foundation set', targetProgress: 25 },
      { title: 'Habits solidified', targetProgress: 50 },
      { title: 'Long-term consistency', targetProgress: 75 },
      { title: 'Sleep mastery achieved', targetProgress: 100 },
    ],
  },
};

/**
 * Default milestones for goals without specific templates
 */
export const DEFAULT_MILESTONES: { [timeframe: string]: MilestoneTemplate[] } = {
  '21 days': [
    { title: 'Week 1 complete', targetProgress: 33 },
    { title: 'Week 2 complete', targetProgress: 66 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ],
  '30 days': [
    { title: '25% complete', targetProgress: 25 },
    { title: 'Halfway there!', targetProgress: 50 },
    { title: '75% complete', targetProgress: 75 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ],
  '90 days': [
    { title: 'Month 1 complete', targetProgress: 33 },
    { title: 'Month 2 complete', targetProgress: 66 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ],
  '6 months': [
    { title: '25% complete', targetProgress: 25 },
    { title: 'Halfway there!', targetProgress: 50 },
    { title: '75% complete', targetProgress: 75 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ],
  '1 year': [
    { title: 'Quarter 1 complete', targetProgress: 25 },
    { title: 'Halfway there!', targetProgress: 50 },
    { title: 'Quarter 3 complete', targetProgress: 75 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ],
};

/**
 * Get suggested milestones for a goal based on focus area and timeframe
 * Falls back to default milestones if specific templates aren't available
 */
export function getSuggestedMilestones(
  focusArea: string,
  timeframe: string
): MilestoneTemplate[] {
  // Try to get specific templates for this focus area and timeframe
  const focusTemplates = MILESTONE_TEMPLATES[focusArea];
  if (focusTemplates && focusTemplates[timeframe]) {
    return focusTemplates[timeframe];
  }

  // Fall back to default milestones for this timeframe
  if (DEFAULT_MILESTONES[timeframe]) {
    return DEFAULT_MILESTONES[timeframe];
  }

  // Ultimate fallback: simple 4-milestone structure
  return [
    { title: '25% complete', targetProgress: 25 },
    { title: 'Halfway there!', targetProgress: 50 },
    { title: '75% complete', targetProgress: 75 },
    { title: 'Goal achieved!', targetProgress: 100 },
  ];
}

/**
 * Convert milestone templates to Milestone objects for storage
 */
export function templatesToMilestones(
  templates: MilestoneTemplate[]
): Array<{
  id: string;
  title: string;
  targetProgress: number;
  completed: boolean;
  isUserDefined: boolean;
}> {
  return templates.map((template, index) => ({
    id: `milestone_${Date.now()}_${index}`,
    title: template.title,
    targetProgress: template.targetProgress,
    completed: false,
    isUserDefined: false,
  }));
}
