/**
 * Populate Demo Account with Realistic Data
 * Simpler version using Firebase Web SDK
 *
 * INSTRUCTIONS:
 * 1. Make sure you're logged in as [demo-account-email] in the app
 * 2. Copy this entire script
 * 3. Open your app
 * 4. Open React Native Debugger or browser console (if using Expo web)
 * 5. Paste and run this script
 *
 * OR run via Node.js after installing firebase package in this directory
 */

// This data can be manually entered into Firestore Console or used programmatically

const DEMO_DATA = {
  // User ID: Replace with actual demo user UID from Firebase Console
  userId: 'REPLACE_WITH_DEMO_USER_UID',

  goals: [
    {
      title: 'Run a 10K race',
      primaryFocus: 'fitness',
      refinedFocus: 'Build endurance and cardiovascular health',
      timeframe: '3 months',
      progress: 35,
      status: 'active',
      brainPillars: ['energy', 'resilience'],
      milestones: [
        { id: '1', title: 'Run 5K without stopping', completed: true },
        { id: '2', title: 'Complete 3 runs per week for a month', completed: true },
        { id: '3', title: 'Run 8K distance', completed: false },
        { id: '4', title: 'Complete full 10K', completed: false }
      ]
    },
    {
      title: 'Learn Spanish conversationally',
      primaryFocus: 'learning',
      refinedFocus: 'Achieve conversational fluency for upcoming trip',
      timeframe: '6 months',
      progress: 20,
      status: 'active',
      brainPillars: ['growth', 'focus'],
      milestones: [
        { id: '1', title: 'Complete beginner course', completed: true },
        { id: '2', title: 'Practice 15 minutes daily for 30 days', completed: false },
        { id: '3', title: 'Have first conversation with native speaker', completed: false },
        { id: '4', title: 'Watch a movie in Spanish without subtitles', completed: false }
      ]
    },
    {
      title: 'Improve sleep quality',
      primaryFocus: 'wellness',
      refinedFocus: 'Get consistent 7-8 hours of quality sleep',
      timeframe: '2 months',
      progress: 60,
      status: 'active',
      brainPillars: ['energy', 'resilience', 'focus'],
      milestones: [
        { id: '1', title: 'Establish consistent bedtime routine', completed: true },
        { id: '2', title: 'No screens 1 hour before bed for 2 weeks', completed: true },
        { id: '3', title: 'Track sleep for 30 days', completed: false },
        { id: '4', title: 'Achieve 7+ hours sleep for 14 consecutive nights', completed: false }
      ]
    }
  ],

  habits: [
    {
      name: 'Morning run',
      type: 'daily',
      frequency: 5,
      active: true,
      category: 'fitness',
      streak: 12,
      longestStreak: 23,
      identity: 'A runner',
      identityStatement: "I'm becoming someone who runs regularly",
      fullVersion: 'Run 30 minutes',
      quickStartVersion: 'Run 15 minutes',
      justShowUpVersion: 'Put on running shoes and step outside',
      scalingPhase: 'building_momentum',
      cue: { type: 'time', value: '7:00 AM' },
      implementationIntention: 'When I finish my morning coffee, I will go for a run',
      totalStepsTaken: 47,
      thisWeekSteps: 4
    },
    {
      name: 'Read for 20 minutes',
      type: 'daily',
      frequency: 7,
      active: true,
      category: 'learning',
      streak: 8,
      longestStreak: 15,
      identity: 'A reader',
      identityStatement: "I'm becoming someone who reads daily",
      fullVersion: 'Read for 30 minutes',
      quickStartVersion: 'Read for 15 minutes',
      justShowUpVersion: 'Read one page',
      scalingPhase: 'committed',
      cue: { type: 'time', value: '9:00 PM' },
      implementationIntention: 'When I get into bed, I will read for 20 minutes',
      totalStepsTaken: 62,
      thisWeekSteps: 6
    },
    {
      name: 'Practice Spanish',
      type: 'daily',
      frequency: 5,
      active: true,
      category: 'learning',
      streak: 5,
      longestStreak: 11,
      identity: 'A language learner',
      identityStatement: "I'm becoming fluent in Spanish",
      fullVersion: 'Complete 15-minute lesson',
      quickStartVersion: 'Review 10 flashcards',
      justShowUpVersion: 'Open the app',
      scalingPhase: 'getting_started',
      cue: { type: 'time', value: '12:30 PM' },
      implementationIntention: 'During lunch break, I will practice Spanish for 15 minutes',
      totalStepsTaken: 28,
      thisWeekSteps: 5
    },
    {
      name: 'Meditate',
      type: 'daily',
      frequency: 7,
      active: true,
      category: 'mindfulness',
      streak: 18,
      longestStreak: 18,
      identity: 'A mindful person',
      identityStatement: "I'm becoming someone who starts each day with presence",
      fullVersion: 'Meditate for 15 minutes',
      quickStartVersion: 'Meditate for 5 minutes',
      justShowUpVersion: 'Take 3 deep breaths',
      scalingPhase: 'established',
      cue: { type: 'time', value: '6:30 AM' },
      implementationIntention: 'Right after waking up, I will meditate for 10 minutes',
      totalStepsTaken: 84,
      thisWeekSteps: 7
    },
    {
      name: 'Drink 8 glasses of water',
      type: 'daily',
      frequency: 7,
      active: true,
      category: 'health',
      streak: 6,
      longestStreak: 14,
      identity: 'Someone who prioritizes hydration',
      identityStatement: "I'm becoming someone who takes care of their body",
      fullVersion: 'Drink 8 glasses throughout the day',
      quickStartVersion: 'Drink 6 glasses',
      justShowUpVersion: 'Fill water bottle',
      scalingPhase: 'building_momentum',
      cue: { type: 'location', value: 'Desk' },
      implementationIntention: 'When I sit down at my desk, I will drink a glass of water',
      totalStepsTaken: 35,
      thisWeekSteps: 5
    }
  ],

  tasks: [
    {
      title: 'Schedule dentist appointment',
      description: 'Call Dr. Smith\'s office for 6-month checkup',
      priority: 'high',
      completed: false
    },
    {
      title: 'Finish quarterly report',
      description: 'Complete analysis and submit by Friday',
      priority: 'high',
      completed: false
    },
    {
      title: 'Buy new running shoes',
      description: 'Current pair has over 400 miles',
      priority: 'medium',
      completed: false
    },
    {
      title: 'Meal prep for the week',
      description: 'Prepare healthy lunches for Monday-Friday',
      priority: 'medium',
      completed: true
    },
    {
      title: 'Update LinkedIn profile',
      description: 'Add recent projects and skills',
      priority: 'medium',
      completed: false
    },
    {
      title: 'Organize closet',
      description: 'Donate clothes I haven\'t worn in a year',
      priority: 'low',
      completed: false
    },
    {
      title: 'Research vacation destinations',
      description: 'Look into Spain or Portugal for summer trip',
      priority: 'low',
      completed: false
    },
    {
      title: 'Call Mom',
      description: 'Weekly check-in',
      priority: 'medium',
      completed: true
    }
  ],

  journalEntries: [
    {
      content: "Had an amazing run this morning - finally hit my 5K goal without stopping! The weather was perfect, cool and crisp. I'm noticing that waking up earlier is really making a difference in my energy levels throughout the day. Still struggling with the Spanish practice, but I'm trying not to be too hard on myself. Progress over perfection.",
      mood: 'great',
      tags: ['running', 'goals', 'gratitude'],
      daysAgo: 1
    },
    {
      content: "Feeling a bit tired today. Stayed up too late watching Netflix (again). Need to be more disciplined about my bedtime routine. On the positive side, I did manage to meditate this morning and it helped me feel more centered. Work was stressful with the quarterly report deadline approaching, but I made good progress.",
      mood: 'okay',
      tags: ['sleep', 'work', 'meditation'],
      daysAgo: 3
    },
    {
      content: "Really proud of myself for maintaining my reading habit. Just finished chapter 5 of 'Atomic Habits' and the identity-based habits concept is resonating with me. Started thinking about who I want to become, not just what I want to achieve. Had a great conversation with Sarah about my Spanish learning journey - she recommended some podcasts that I'm excited to try.",
      mood: 'good',
      tags: ['reading', 'learning', 'friendship'],
      daysAgo: 5
    },
    {
      content: "Grateful for small wins today. Even though I was tempted to skip my morning routine, I showed up and did the minimum version of my run (just 10 minutes). It's funny how just showing up makes such a difference. Also had a video call with Mom which always lifts my spirits. She's proud of my wellness journey.",
      mood: 'good',
      tags: ['gratitude', 'family', 'habits'],
      daysAgo: 7
    },
    {
      content: "Today was tough. Woke up late, skipped my run, felt guilty about it all day. But then I remembered the 'never miss twice' rule and made sure to at least do my meditation and reading. Sometimes life happens and that's okay. Tomorrow is a new day to get back on track.",
      mood: 'okay',
      tags: ['reflection', 'self-compassion', 'mindset'],
      daysAgo: 10
    }
  ],

  userProfile: {
    bio: 'Wellness enthusiast working on building sustainable habits. Runner, language learner, and lifelong student. Currently training for my first 10K!',
    privacy: 'public',
    hasCompletedOnboarding: true
  }
};

console.log('📋 Demo Data Structure Ready!');
console.log('\n=== MANUAL ENTRY GUIDE ===\n');
console.log('Follow these steps to populate the demo account:\n');

console.log('1. Go to Firebase Console (https://console.firebase.google.com)');
console.log('2. Select project: your-project-id');
console.log('3. Go to Authentication → Users');
console.log('4. Find [demo-account-email] and COPY THE UID\n');

console.log('5. Go to Firestore Database');
console.log('6. Update the users collection document for this UID:\n');
console.log(JSON.stringify(DEMO_DATA.userProfile, null, 2));

console.log('\n7. Create documents in the "goals" collection (create 3 documents):');
DEMO_DATA.goals.forEach((goal, i) => {
  console.log(`\n--- Goal ${i + 1} ---`);
  console.log(JSON.stringify(goal, null, 2));
});

console.log('\n\n8. Create documents in the "habits" collection (create 5 documents):');
DEMO_DATA.habits.forEach((habit, i) => {
  console.log(`\n--- Habit ${i + 1} ---`);
  console.log(JSON.stringify({
    ...habit,
    title: habit.name, // Add for web compatibility
    bestStreak: habit.longestStreak // Add for web compatibility
  }, null, 2));
});

console.log('\n\n9. Create documents in the "tasks" collection (create 8 documents):');
DEMO_DATA.tasks.forEach((task, i) => {
  console.log(`\n--- Task ${i + 1} ---`);
  console.log(JSON.stringify(task, null, 2));
});

console.log('\n\n10. Create documents in the "journalEntries" collection (create 5 documents):');
DEMO_DATA.journalEntries.forEach((entry, i) => {
  console.log(`\n--- Journal Entry ${i + 1} ---`);
  console.log(JSON.stringify({
    content: entry.content,
    text: entry.content, // Add for web compatibility
    mood: entry.mood,
    tags: entry.tags
  }, null, 2));
  console.log(`Note: Set createdAt to ${entry.daysAgo} days ago`);
});

console.log('\n\n✅ For each document, make sure to:');
console.log('   - Add field: userId = [the demo user UID you copied]');
console.log('   - Add field: createdAt = [timestamp - use "current timestamp" or set specific date]');
console.log('   - Add field: updatedAt = [timestamp - use "current timestamp" or set specific date]');

console.log('\n\n📝 EASIER ALTERNATIVE: Use the app itself!');
console.log('   1. Log in as [demo-account-email]');
console.log('   2. Create the goals, habits, tasks, and journal entries manually through the UI');
console.log('   3. This ensures everything is formatted correctly and integrates with the app\n');
