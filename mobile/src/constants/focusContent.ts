/**
 * Focus Page Content
 * User-facing copy, rotating tips, ambient-sound config, and small formatting
 * helpers for the Focus page.
 *
 * Relocated verbatim from the former `src/tokens/design-tokens.ts` during the
 * token-system consolidation. This is copy/config/content — not design tokens —
 * so it lives separately from `./designTokens`.
 */

// ===========================================
// FOCUS TIPS
// Rotating tips for BrainHealthTip component
// ===========================================
export const FocusTips = [
  "Working in focused blocks with breaks helps your brain sustain attention more naturally. Even short sessions support long-term clarity.",
  "Your brain cycles between focused and diffuse states. Both are essential for deep work and creative thinking.",
  "Reducing distractions helps your brain direct more resources toward the task at hand. Even small changes can make a difference.",
  "Single-tasking supports deeper processing. When your brain isn't switching, it can build stronger connections.",
  "After sustained focus, your brain benefits from a brief pause. Rest helps consolidate what you've been working on.",
  "Focus often improves when mental load is reduced. Simplifying what your brain has to manage can help attention feel more natural.",
  "Your brain uses more energy during focused work than most other activities. Supporting it with breaks is part of the process, not a sign of weakness.",
  "Naming your task before you begin helps your brain orient toward it. Intention supports follow-through.",
] as const;

// ===========================================
// AMBIENT SOUNDS
// ===========================================
export const AmbientSounds = [
  { id: 'soft-rain', label: 'Soft Rain', emoji: '🌧' },
  { id: 'forest', label: 'Forest', emoji: '🌿' },
  { id: 'ocean-waves', label: 'Ocean Waves', emoji: '🌊' },
  { id: 'white-noise', label: 'White Noise', emoji: '〰' },
] as const;

// ===========================================
// COPY STRINGS
// All user-facing strings for the Focus page
// ===========================================
export const FocusCopy = {
  // Page level
  pageTitle: 'Focus',
  pomodoroSubtitle: 'Protected time for one thing at a time.',
  routinesSubtitle: 'Build routines that support your brain',
  tabPomodoro: 'Focus',
  tabRoutines: 'Routines',

  // Pomodoro tab
  taskInputLabel: 'What are you focusing on?',
  taskInputPlaceholder: 'e.g., Writing, deep reading, design work...',
  durationChipsLabel: 'Session length',
  sessionCompleteLine1: 'Session complete.',
  sessionCompleteLine2: 'Nicely done. Rest if it feels right.',
  reflectionPrompt: 'How did that focus feel?',
  breakCtaTakeBreak: 'Take a break',
  breakCtaStartAnother: 'Start another',
  breakCtaDoneForNow: 'Done for now',
  breakCompleteLine1: "Break's over",
  breakCompleteLine2: 'Ready for another session?',
  breakCtaPrimary: 'Begin another',
  breakCtaTertiary: 'Done for now',
  ambientPanelLabel: 'Ambient sound',
  loading: 'Taking a moment...',

  // Routines tab
  startCta: 'Begin at your own pace',
  reminderLink: 'Set a gentle reminder',
  addActivityLabel: 'Add an activity',
  editButton: 'Edit',
  emptyHeadline: 'A fresh start',
  emptyBody: "Create a routine for this time of day, whenever you're ready.",
  emptyCta: 'Create a routine',

  // Active routine player
  progressLabel: (current: number, total: number) => `Activity ${current} of ${total}`,
  upNextLabel: 'UP NEXT',
  previousLabel: 'Previous',
  restartLabel: 'Restart',
  skipLabel: 'Skip',
  endConfirmationTitle: 'End routine?',
  endConfirmationPrimary: 'End',
  endConfirmationSecondary: 'Keep going',
  completeHeadline: 'Routine complete',
  completeBody: 'Well done. Take a moment before moving on.',
  completeCtaPrimary: 'Done',
  completeCtaSecondary: 'Adjust this routine',

  // Focus completion notification (B-3c.2). Fires when a focus block's time
  // elapses while the app is backgrounded or closed. Calm and outcome-neutral:
  // no urgency, no "time's up", no deficit framing.
  focusCompleteNotificationTitle: 'Your focus block is complete',
  focusCompleteNotificationBody: 'Come back when you\'re ready.',

  // Notifications
  morningReminder: 'Your morning routine is ready whenever you are.',
  eveningReminder: 'A quiet moment for your evening routine, if it feels right.',
  bedtimeReminder: 'Your bedtime routine is here when you\'re ready to wind down.',
  reengagement: 'Vara is here whenever you\'re ready.',

  // Errors
  audioLoadError: 'Sound couldn\'t load. Try again when ready.',
  notificationPermissionDenied: 'Notification access wasn\'t granted. You can enable it in Settings whenever you like.',
  genericError: 'Something went wrong on our end. Sorry about that.',
  networkError: 'Something didn\'t connect. Try again when ready.',
} as const;

// Completion messages with variety (within spec voice/tone)
export const CompletionMessages = [
  'Well done. Take a moment before moving on.',
  'Nicely done. Give yourself a moment to transition.',
  'You showed up. That matters.',
  'Another routine complete. Rest easy.',
] as const;

// Summary format helper
export const formatSummary = (minutes: number, activities: number) => ({
  duration: `${minutes} min total`,
  count: `${activities} ${activities === 1 ? 'activity' : 'activities'}`,
});
