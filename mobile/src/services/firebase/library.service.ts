/**
 * Library Service
 * Central service for all wellness library content (breathwork, sleep, movement, masterclass)
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../config/firebase';

// =====================
// Type Definitions
// =====================

export interface BreathworkSession {
  id: string;
  title: string;
  description: string;
  duration: string; // "5 min"
  type: 'Audio' | 'Video' | 'Guided' | 'Timer';
  purpose: 'Relax' | 'Sleep' | 'Focus' | 'Energy';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  breathingPattern: string; // e.g., "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s"
  featured?: boolean;
  audioUrl?: string;
  videoUrl?: string;
  instructions?: string;
}

export interface SleepContent {
  id: string;
  title: string;
  description: string;
  duration: string; // "3:43 min"
  type: 'Brainwave' | 'Nature' | 'Story' | 'Meditation';
  audioUrl: string;
  category: 'sounds' | 'stories' | 'meditations';
}

export interface MovementContent {
  id: string;
  title: string;
  description: string;
  duration: string;
  category: string; // "Yoga", "Stretching", "Cardio", etc.
  type: 'video';
  videoSrc: string;
  thumbnail?: string;
}

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  topics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  thumbnail?: string;
  publishedAt: Timestamp;
}

export interface MasterclassProgress {
  id: string;
  userId: string;
  masterclassId: string;
  completed: boolean;
  progress: number; // 0-1
  lastWatchedAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// =====================
// Static Breathwork Sessions
// =====================

export const BREATHWORK_SESSIONS: BreathworkSession[] = [
  {
    id: '1',
    title: 'Box Breathing (4-4-4-4)',
    description: 'A calming breathing pattern to reduce anxiety and center yourself. Used by Navy SEALs to stay calm under pressure.',
    duration: '5 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 4s → Hold 4s → Exhale 4s → Hold 4s',
    featured: true,
    instructions: 'Inhale for 4 counts, hold for 4 counts, exhale for 4 counts, hold for 4 counts. Repeat this cycle for 5 minutes.',
  },
  {
    id: '2',
    title: 'Morning Energizer',
    description: 'A breathwork routine to stimulate your energy and clarity. Perfect for starting your day with focus and vitality.',
    duration: '6 min',
    type: 'Guided',
    purpose: 'Focus',
    difficulty: 'intermediate',
    breathingPattern: 'Quick inhale → Passive exhale × 30, then hold',
    featured: true,
    instructions: 'Sharp inhales through the nose, passive exhales through the mouth. 30 breaths, followed by a breath hold.',
  },
  {
    id: '3',
    title: 'Evening Unwind',
    description: 'Wind down with gentle breath awareness. Prepares your body and mind for restful sleep. This practice gradually slows your heart rate and activates your parasympathetic nervous system.',
    duration: '7 min',
    type: 'Guided',
    purpose: 'Sleep',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 4s → Hold 7s → Exhale 8s',
    featured: true,
    instructions: '4-7-8 breathing: Inhale for 4 counts, hold for 7 counts, exhale slowly for 8 counts.',
  },
  {
    id: '4',
    title: 'Stress Relief (4-7-8)',
    description: 'A calming breathing pattern that extends your exhale to quickly reduce stress and activate your relaxation response.',
    duration: '4 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 4s → Hold 7s → Exhale 8s',
    instructions: 'Inhale quietly through your nose for 4 counts, hold for 7 counts, exhale completely through your mouth for 8 counts.',
  },
  {
    id: '6',
    title: 'Coherent Breathing',
    description: 'Breathe at a rate of 5 breaths per minute to achieve heart-brain coherence and deep calm.',
    duration: '8 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 6s → Exhale 6s',
    instructions: 'Inhale for 6 seconds, exhale for 6 seconds. Maintain this rhythm throughout the session.',
  },
  {
    id: '7',
    title: 'Power Breath',
    description: 'An invigorating breathing technique to boost your energy and mental alertness. Great for afternoon slumps or before workouts.',
    duration: '5 min',
    type: 'Guided',
    purpose: 'Energy',
    difficulty: 'intermediate',
    breathingPattern: 'Sharp inhale → Forceful exhale × 20, rest, repeat',
    instructions: 'Rapid, rhythmic breathing through the nose. 20 breaths per round, 3 rounds with 30-second rest between.',
  },
  {
    id: '8',
    title: 'Kapalabhati (Skull Shining)',
    description: 'Traditional yogic breathing to cleanse and energize. Activates your core and clears mental fog.',
    duration: '8 min',
    type: 'Guided',
    purpose: 'Energy',
    difficulty: 'intermediate',
    breathingPattern: 'Passive inhale → Forceful exhale × 30',
    instructions: 'Passive inhale, forceful exhale through the nose using abdominal muscles. 30 breaths per round.',
  },
  {
    id: '9',
    title: 'Deep Sleep Preparation',
    description: 'A gentle, extended exhale practice to activate your rest-and-digest system. Perfect for the last 10 minutes before bed.',
    duration: '10 min',
    type: 'Guided',
    purpose: 'Sleep',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 4s → Extended exhale 8s',
    instructions: 'Breathe in for 4 seconds, breathe out slowly for 8 seconds. Focus on making each exhale smooth and complete.',
  },
  {
    id: '10',
    title: 'Focus Flow',
    description: 'Balanced breathing to enhance concentration and mental clarity. Ideal before important meetings or deep work sessions.',
    duration: '6 min',
    type: 'Timer',
    purpose: 'Focus',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 5s → Exhale 5s',
    instructions: 'Equal duration inhale and exhale. Breathe in for 5 seconds, out for 5 seconds. Keep attention on the breath.',
  },
  {
    id: 'double-breath-reset',
    title: 'Double Breath Reset',
    description: 'A calming technique using a double inhale followed by an extended exhale. Activates your body\'s natural relaxation response in under a minute.',
    duration: '1 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'Inhale 2s → Quick inhale 1s → Long exhale 6s → Rest 1s',
    featured: false,
    instructions: 'Breathe in through your nose for 2 seconds. Take a quick second inhale through your nose (1 second). Exhale slowly through your mouth for 6 seconds. Rest for 1 second, then repeat. Continue for 60 seconds.',
  },
  {
    id: 'wide-gaze-calm',
    title: 'Wide Gaze Calm',
    description: 'A simple visual technique that shifts your nervous system from alert to calm by softening and expanding your gaze. No breathing required.',
    duration: '1 min',
    type: 'Guided',
    purpose: 'Relax',
    difficulty: 'beginner',
    breathingPattern: 'No breathing pattern, visual focus exercise',
    featured: false,
    instructions: 'Find a spot ahead of you and let your eyes rest on it. Without moving your eyes, begin to notice what is in your peripheral vision. Slowly expand your awareness to the edges of your visual field. Hold this wide, soft gaze for 60 seconds. Notice any shift in how calm or alert you feel.',
  },
];

// =====================
// Static Sleep Content
// =====================

// Sleep sounds with storage paths (URLs fetched dynamically)
const SLEEP_SOUNDS_BASE: Omit<SleepContent, 'audioUrl'>[] = [
  {
    id: '1',
    title: 'Delta waves',
    duration: '3:43 min',
    type: 'Brainwave',
    description: 'Deep sleep waves to support stage 3 & 4 sleep.',
    category: 'sounds',
  },
  {
    id: '2',
    title: 'Calming melody',
    duration: '3:27 min',
    type: 'Nature',
    description: 'Gentle rainfall sounds to help your mind wind down.',
    category: 'sounds',
  },
  {
    id: '3',
    title: 'Surreal forest',
    duration: '2:01 min',
    type: 'Nature',
    description: 'Soft forest ambience to ease you toward sleep.',
    category: 'sounds',
  },
];

// Storage paths mapping
const SLEEP_AUDIO_PATHS: Record<string, string> = {
  // Sounds
  '1': 'sleep-audio/DeltaWaves.mp3',
  '2': 'sleep-audio/CalmingMelody.mp3',
  '3': 'sleep-audio/SurrealForest.mp3',
  // Stories
  'story-1': 'sleep-audio/The Warmth.wav',
  'story-2': 'sleep-audio/A Sky Full of Drift.wav',
  'story-3': 'sleep-audio/The Stone Path Home.wav',
};

// Cached URLs to avoid repeated fetches
const audioUrlCache: Record<string, string> = {};

/**
 * Get authenticated download URL for sleep audio
 */
async function getSleepAudioUrl(id: string): Promise<string> {
  // Return cached URL if available
  if (audioUrlCache[id]) {
    return audioUrlCache[id];
  }

  const storagePath = SLEEP_AUDIO_PATHS[id];
  if (!storagePath) {
    throw new Error(`No storage path found for sleep sound ID: ${id}`);
  }

  try {
    const storageRef = ref(storage, storagePath);
    const url = await getDownloadURL(storageRef);
    audioUrlCache[id] = url; // Cache for future use
    return url;
  } catch (error) {
    console.error('Error getting sleep audio URL:', error);
    throw new Error('Failed to load audio. Please try again.');
  }
}

/**
 * Get sleep sounds with authenticated URLs
 */
export async function getSleepSoundsWithUrls(): Promise<SleepContent[]> {
  const sounds = await Promise.all(
    SLEEP_SOUNDS_BASE.map(async (sound) => {
      try {
        const audioUrl = await getSleepAudioUrl(sound.id);
        return { ...sound, audioUrl };
      } catch (error) {
        console.error(`Error loading audio for ${sound.title}:`, error);
        return { ...sound, audioUrl: '' };
      }
    })
  );
  return sounds;
}

// For backward compatibility - returns sounds with empty URLs
export const SLEEP_SOUNDS: SleepContent[] = SLEEP_SOUNDS_BASE.map(sound => ({
  ...sound,
  audioUrl: '',
}));

// Sleep stories with storage paths (URLs fetched dynamically)
const SLEEP_STORIES_BASE: Omit<SleepContent, 'audioUrl'>[] = [
  {
    id: 'story-1',
    title: 'The Warmth',
    duration: '10 min',
    type: 'Story',
    description: 'A soothing story to ease you into peaceful sleep.',
    category: 'stories',
  },
  {
    id: 'story-2',
    title: 'A Sky Full of Drift',
    duration: '9:17 min',
    type: 'Story',
    description: 'A gentle journey through an open sky to quiet the mind.',
    category: 'stories',
  },
  {
    id: 'story-3',
    title: 'The Stone Path Home',
    duration: '10:36 min',
    type: 'Story',
    description: 'A calming walk along a familiar path toward rest.',
    category: 'stories',
  },
];

/**
 * Get sleep stories with authenticated URLs
 */
export async function getSleepStoriesWithUrls(): Promise<SleepContent[]> {
  const stories = await Promise.all(
    SLEEP_STORIES_BASE.map(async (story) => {
      try {
        const audioUrl = await getSleepAudioUrl(story.id);
        return { ...story, audioUrl };
      } catch (error) {
        console.error(`Error loading audio for ${story.title}:`, error);
        return { ...story, audioUrl: '' };
      }
    })
  );
  return stories;
}

// For backward compatibility - returns stories with empty URLs
export const SLEEP_STORIES: SleepContent[] = SLEEP_STORIES_BASE.map(story => ({
  ...story,
  audioUrl: '',
}));

export const SLEEP_MEDITATIONS: SleepContent[] = [
  // Placeholder - add when audio files are uploaded to Firebase Storage
];

// =====================
// Breathwork Functions
// =====================

export function getBreathworkSessions(): BreathworkSession[] {
  return BREATHWORK_SESSIONS;
}

export function getBreathworkSession(id: string): BreathworkSession | null {
  return BREATHWORK_SESSIONS.find(session => session.id === id) || null;
}

// =====================
// Sleep Functions
// =====================

export function getSleepSounds(): SleepContent[] {
  return SLEEP_SOUNDS;
}

export function getSleepStories(): SleepContent[] {
  return SLEEP_STORIES;
}

export function getSleepMeditations(): SleepContent[] {
  return SLEEP_MEDITATIONS;
}

export function getAllSleepContent(): {
  sounds: SleepContent[];
  stories: SleepContent[];
  meditations: SleepContent[];
} {
  return {
    sounds: SLEEP_SOUNDS,
    stories: SLEEP_STORIES,
    meditations: SLEEP_MEDITATIONS,
  };
}

export function getSleepContentById(id: string): SleepContent | null {
  const allContent = [...SLEEP_SOUNDS, ...SLEEP_STORIES, ...SLEEP_MEDITATIONS];
  return allContent.find(content => content.id === id) || null;
}

// =====================
// Movement Content Functions (Firestore)
// =====================

/**
 * Get all movement content from Firestore
 */
export async function getMovementContent(category?: string): Promise<MovementContent[]> {
  if (!db) return [];
  try {
    let q;
    if (category) {
      q = query(
        collection(db, 'movementContent'),
        where('category', '==', category),
        orderBy('title', 'asc')
      );
    } else {
      q = query(
        collection(db, 'movementContent'),
        orderBy('title', 'asc')
      );
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MovementContent[];
  } catch (error) {
    console.error('Error getting movement content:', error);
    throw error;
  }
}

/**
 * Subscribe to movement content updates (real-time)
 */
export function subscribeToMovementContent(
  callback: (content: MovementContent[]) => void,
  category?: string
): () => void {
  if (!db) return () => {};
  let q;
  if (category) {
    q = query(
      collection(db, 'movementContent'),
      where('category', '==', category),
      orderBy('title', 'asc')
    );
  } else {
    q = query(
      collection(db, 'movementContent'),
      orderBy('title', 'asc')
    );
  }

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const content = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MovementContent[];
      callback(content);
    },
    (error) => {
      console.error('Error subscribing to movement content:', error);
    }
  );

  return unsubscribe;
}

/**
 * Get a single movement content item by ID
 */
export async function getMovementContentById(id: string): Promise<MovementContent | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'movementContent', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as MovementContent;
    }

    return null;
  } catch (error) {
    console.error('Error getting movement content by ID:', error);
    throw error;
  }
}

// =====================
// Masterclass Functions (Firestore)
// =====================

/**
 * Get all masterclasses with optional filters
 */
export async function listMasterclasses(filters?: {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
}): Promise<Masterclass[]> {
  if (!db) return [];
  try {
    let q = query(
      collection(db, 'masterclasses'),
      orderBy('publishedAt', 'desc')
    );

    // Apply difficulty filter if provided
    if (filters?.difficulty) {
      q = query(q, where('difficulty', '==', filters.difficulty));
    }

    // Apply topic filter if provided (array-contains)
    if (filters?.topic) {
      q = query(q, where('topics', 'array-contains', filters.topic));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Masterclass[];
  } catch (error) {
    console.error('Error listing masterclasses:', error);
    throw error;
  }
}

/**
 * Get a single masterclass by ID
 */
export async function getMasterclass(id: string): Promise<Masterclass | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, 'masterclasses', id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as Masterclass;
    }

    return null;
  } catch (error) {
    console.error('Error getting masterclass:', error);
    throw error;
  }
}

/**
 * Get user's progress for a specific masterclass
 */
export async function getUserMasterclassProgress(
  userId: string,
  masterclassId: string
): Promise<MasterclassProgress | null> {
  if (!db) return null;
  try {
    const q = query(
      collection(db, 'masterclassProgress'),
      where('userId', '==', userId),
      where('masterclassId', '==', masterclassId)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const docData = snapshot.docs[0];
    return {
      id: docData.id,
      ...docData.data(),
    } as MasterclassProgress;
  } catch (error) {
    console.error('Error getting masterclass progress:', error);
    throw error;
  }
}

/**
 * Update or create masterclass progress
 */
export async function updateMasterclassProgress(
  userId: string,
  masterclassId: string,
  progressData: Partial<MasterclassProgress>
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    // Check if progress exists
    const existing = await getUserMasterclassProgress(userId, masterclassId);

    if (existing) {
      // Update existing progress
      const docRef = doc(db, 'masterclassProgress', existing.id);
      await updateDoc(docRef, {
        ...progressData,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new progress
      await addDoc(collection(db, 'masterclassProgress'), {
        userId,
        masterclassId,
        completed: false,
        progress: 0,
        ...progressData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastWatchedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating masterclass progress:', error);
    throw error;
  }
}

/**
 * Get all masterclass progress for a user
 */
export async function getUserMasterclassProgressList(userId: string): Promise<MasterclassProgress[]> {
  if (!db) return [];
  try {
    const q = query(
      collection(db, 'masterclassProgress'),
      where('userId', '==', userId),
      orderBy('lastWatchedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MasterclassProgress[];
  } catch (error) {
    console.error('Error getting user masterclass progress list:', error);
    throw error;
  }
}

/**
 * Mark masterclass as completed
 */
export async function completeMasterclass(userId: string, masterclassId: string): Promise<void> {
  await updateMasterclassProgress(userId, masterclassId, {
    completed: true,
    progress: 1,
  });
}
