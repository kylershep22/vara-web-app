/**
 * Populate Demo Account with Realistic Data
 * Run this script to populate the demo@varawellness.app account with believable demo data
 *
 * Usage: node scripts/populate-demo-data.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../../backend/vara-4a99f-firebase-adminsdk-ggpjd-9f8d3d2fb9.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Demo account email
const DEMO_EMAIL = 'demo@varawellness.app';

/**
 * Get demo user ID from auth
 */
async function getDemoUserId() {
  try {
    const userRecord = await admin.auth().getUserByEmail(DEMO_EMAIL);
    console.log('✅ Found demo user:', userRecord.uid);
    return userRecord.uid;
  } catch (error) {
    console.error('❌ Error finding demo user:', error.message);
    throw new Error('Demo user not found. Please create the account first.');
  }
}

/**
 * Create realistic goals
 */
async function createGoals(userId) {
  console.log('\n📋 Creating goals...');

  const goals = [
    {
      title: 'Run a 10K race',
      primaryFocus: 'fitness',
      refinedFocus: 'Build endurance and cardiovascular health',
      timeframe: '3 months',
      progress: 35,
      status: 'active',
      brainPillars: ['energy', 'resilience'],
      milestones: [
        { id: '1', title: 'Run 5K without stopping', completed: true, completedAt: admin.firestore.Timestamp.now() },
        { id: '2', title: 'Complete 3 runs per week for a month', completed: true, completedAt: admin.firestore.Timestamp.now() },
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
        { id: '1', title: 'Complete beginner course', completed: true, completedAt: admin.firestore.Timestamp.now() },
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
        { id: '1', title: 'Establish consistent bedtime routine', completed: true, completedAt: admin.firestore.Timestamp.now() },
        { id: '2', title: 'No screens 1 hour before bed for 2 weeks', completed: true, completedAt: admin.firestore.Timestamp.now() },
        { id: '3', title: 'Track sleep for 30 days', completed: false },
        { id: '4', title: 'Achieve 7+ hours sleep for 14 consecutive nights', completed: false }
      ]
    }
  ];

  for (const goal of goals) {
    const docRef = await db.collection('goals').add({
      ...goal,
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`  ✓ Created goal: ${goal.title} (${docRef.id})`);
  }
}

/**
 * Create realistic habits with completion data
 */
async function createHabits(userId) {
  console.log('\n🎯 Creating habits...');

  const habits = [
    {
      name: 'Morning run',
      type: 'daily',
      frequency: 5,
      active: true,
      category: 'fitness',
      streak: 12,
      longestStreak: 23,
      bestStreak: 23,
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
      bestStreak: 15,
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
      bestStreak: 11,
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
      bestStreak: 18,
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
      bestStreak: 14,
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
  ];

  for (const habit of habits) {
    const habitRef = await db.collection('habits').add({
      ...habit,
      title: habit.name, // Web app compatibility
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });

    console.log(`  ✓ Created habit: ${habit.name} (${habitRef.id})`);

    // Create completion data for the last 14 days
    await createHabitCompletions(habitRef.id, userId, habit.streak);
  }
}

/**
 * Create habit completions for the last N days based on streak
 */
async function createHabitCompletions(habitId, userId, streak) {
  const today = new Date();

  // Create completions for the current streak
  for (let i = 0; i < streak; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    await db.collection('habits').doc(habitId)
      .collection('completions').doc(dateStr)
      .set({
        habitId,
        userId,
        date: dateStr,
        completed: true,
        versionCompleted: i < 3 ? 'full' : (Math.random() > 0.5 ? 'full' : 'quick_start'),
        satisfaction: Math.random() > 0.3 ? 'great' : 'good',
        completedAt: admin.firestore.Timestamp.fromDate(date)
      });
  }

  console.log(`    • Added ${streak} completions`);
}

/**
 * Create realistic tasks
 */
async function createTasks(userId) {
  console.log('\n✅ Creating tasks...');

  const tasks = [
    // High priority
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
      completed: false,
      dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000))
    },

    // Medium priority
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
      completed: true,
      completedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
    },
    {
      title: 'Update LinkedIn profile',
      description: 'Add recent projects and skills',
      priority: 'medium',
      completed: false
    },

    // Low priority
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
      completed: true,
      completedAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
    }
  ];

  for (const task of tasks) {
    await db.collection('tasks').add({
      ...task,
      userId,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`  ✓ Created task: ${task.title}`);
  }
}

/**
 * Create realistic journal entries
 */
async function createJournalEntries(userId) {
  console.log('\n📝 Creating journal entries...');

  const entries = [
    {
      content: "Had an amazing run this morning - finally hit my 5K goal without stopping! The weather was perfect, cool and crisp. I'm noticing that waking up earlier is really making a difference in my energy levels throughout the day. Still struggling with the Spanish practice, but I'm trying not to be too hard on myself. Progress over perfection.",
      mood: 'great',
      tags: ['running', 'goals', 'gratitude'],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))
    },
    {
      content: "Feeling a bit tired today. Stayed up too late watching Netflix (again). Need to be more disciplined about my bedtime routine. On the positive side, I did manage to meditate this morning and it helped me feel more centered. Work was stressful with the quarterly report deadline approaching, but I made good progress.",
      mood: 'okay',
      tags: ['sleep', 'work', 'meditation'],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000))
    },
    {
      content: "Really proud of myself for maintaining my reading habit. Just finished chapter 5 of 'Atomic Habits' and the identity-based habits concept is resonating with me. Started thinking about who I want to become, not just what I want to achieve. Had a great conversation with Sarah about my Spanish learning journey - she recommended some podcasts that I'm excited to try.",
      mood: 'good',
      tags: ['reading', 'learning', 'friendship'],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000))
    },
    {
      content: "Grateful for small wins today. Even though I was tempted to skip my morning routine, I showed up and did the minimum version of my run (just 10 minutes). It's funny how just showing up makes such a difference. Also had a video call with Mom which always lifts my spirits. She's proud of my wellness journey.",
      mood: 'good',
      tags: ['gratitude', 'family', 'habits'],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    },
    {
      content: "Today was tough. Woke up late, skipped my run, felt guilty about it all day. But then I remembered the 'never miss twice' rule and made sure to at least do my meditation and reading. Sometimes life happens and that's okay. Tomorrow is a new day to get back on track.",
      mood: 'okay',
      tags: ['reflection', 'self-compassion', 'mindset'],
      createdAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() - 10 * 24 * 60 * 60 * 1000))
    }
  ];

  for (const entry of entries) {
    await db.collection('journalEntries').add({
      ...entry,
      text: entry.content, // Web app compatibility
      userId,
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log(`  ✓ Created journal entry (${entry.mood} mood)`);
  }
}

/**
 * Update user profile with additional info
 */
async function updateUserProfile(userId) {
  console.log('\n👤 Updating user profile...');

  await db.collection('users').doc(userId).update({
    bio: 'Wellness enthusiast working on building sustainable habits. Runner, language learner, and lifelong student. Currently training for my first 10K!',
    privacy: 'public',
    hasCompletedOnboarding: true,
    updatedAt: admin.firestore.Timestamp.now()
  });

  console.log('  ✓ Profile updated');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting demo data population...\n');
  console.log('Demo account:', DEMO_EMAIL);

  try {
    // Get demo user ID
    const userId = await getDemoUserId();

    // Populate all data
    await createGoals(userId);
    await createHabits(userId);
    await createTasks(userId);
    await createJournalEntries(userId);
    await updateUserProfile(userId);

    console.log('\n✅ Demo data population complete!');
    console.log('\nYou can now log in with:');
    console.log(`  Email: ${DEMO_EMAIL}`);
    console.log('  Password: Demo2026!');
    console.log('\nThe account now has:');
    console.log('  • 3 realistic goals with milestones');
    console.log('  • 5 active habits with completion history');
    console.log('  • 8 tasks (mix of completed/pending)');
    console.log('  • 5 journal entries with different moods');
    console.log('  • Updated user profile\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
