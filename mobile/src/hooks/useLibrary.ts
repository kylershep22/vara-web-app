/**
 * Library Hooks
 * Custom hooks for accessing wellness library content
 */

import { useState, useEffect } from 'react';
import {
  getBreathworkSessions,
  getAllSleepContent,
  getSleepSoundsWithUrls,
  getSleepStoriesWithUrls,
  subscribeToMovementContent,
  listMasterclasses,
  getUserMasterclassProgressList,
  BreathworkSession,
  SleepContent,
  MovementContent,
  Masterclass,
  MasterclassProgress,
} from '../services/firebase/library.service';
import { useAuth } from '../context/AuthContext';

// =====================
// Breathwork Hook
// =====================

export function useBreathwork() {
  const [sessions, setSessions] = useState<BreathworkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      const data = getBreathworkSessions();
      setSessions(data);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, []);

  return { sessions, loading, error };
}

// =====================
// Sleep Hook
// =====================

export function useSleep() {
  const [sleepContent, setSleepContent] = useState<{
    sounds: SleepContent[];
    stories: SleepContent[];
    meditations: SleepContent[];
  }>({
    sounds: [],
    stories: [],
    meditations: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSleepContent = async () => {
      try {
        setLoading(true);
        // Fetch sounds and stories with authenticated URLs
        const [sounds, stories] = await Promise.all([
          getSleepSoundsWithUrls(),
          getSleepStoriesWithUrls(),
        ]);

        // Get meditations (currently empty, can add getMeditationsWithUrls later)
        const allContent = getAllSleepContent();

        setSleepContent({
          sounds,
          stories,
          meditations: allContent.meditations,
        });
        setLoading(false);
      } catch (err) {
        console.error('Error loading sleep content:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchSleepContent();
  }, []);

  return {
    sounds: sleepContent.sounds,
    stories: sleepContent.stories,
    meditations: sleepContent.meditations,
    loading,
    error,
  };
}

// =====================
// Movement Hook
// =====================

export function useMovement(category?: string) {
  const [content, setContent] = useState<MovementContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);

    // Subscribe to Firestore movement content (real-time)
    const unsubscribe = subscribeToMovementContent(
      (data) => {
        setContent(data);
        setLoading(false);
        setError(null);
      },
      category
    );

    return () => {
      unsubscribe();
    };
  }, [category]);

  return { content, loading, error };
}

// =====================
// Masterclass Hook
// =====================

export function useMasterclasses(filters?: {
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  topic?: string;
}) {
  const [masterclasses, setMasterclasses] = useState<Masterclass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMasterclasses = async () => {
      try {
        setLoading(true);
        const data = await listMasterclasses(filters);
        setMasterclasses(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching masterclasses:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchMasterclasses();
  }, [filters?.difficulty, filters?.topic]);

  return { masterclasses, loading, error };
}

// =====================
// Masterclass Progress Hook
// =====================

export function useMasterclassProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<MasterclassProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProgress([]);
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        setLoading(true);
        const data = await getUserMasterclassProgressList(user.uid);
        setProgress(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching masterclass progress:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchProgress();
  }, [user]);

  return { progress, loading, error };
}

// =====================
// All Library Content (for Discover hub)
// =====================

export function useLibraryContent() {
  const { sessions: breathwork, loading: breathworkLoading } = useBreathwork();
  const { sounds, loading: sleepLoading } = useSleep();
  const { content: movement, loading: movementLoading } = useMovement();
  const { masterclasses, loading: masterclassLoading } = useMasterclasses();

  const loading = breathworkLoading || sleepLoading || movementLoading || masterclassLoading;

  return {
    breathwork,
    sleepSounds: sounds,
    movement,
    masterclasses,
    loading,
  };
}
