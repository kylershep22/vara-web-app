/**
 * useNotificationOptIn
 * Manages the delayed notification permission prompt.
 * Permission is only requested after the user's first meaningful action
 * (routine interaction, first habit logged, or first reflection saved).
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROMPT_SHOWN_KEY = '@vara_notif_prompt_shown';
const PROMPT_DISMISSED_AT_KEY = '@vara_notif_prompt_dismissed_at';
const PROMPT_DISMISS_COUNT_KEY = '@vara_notif_prompt_dismiss_count';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const MAX_DISMISSALS = 2;

interface UseNotificationOptInReturn {
  /** Whether the opt-in prompt should be shown */
  shouldShowPrompt: boolean;
  /** Mark the prompt as shown (user saw it) */
  markPromptShown: () => Promise<void>;
  /** Mark the prompt as dismissed ("Maybe later") */
  markPromptDismissed: () => Promise<void>;
  /** Mark that the user opted in (never show again) */
  markOptedIn: () => Promise<void>;
  /** Whether loading state from AsyncStorage */
  loading: boolean;
}

export function useNotificationOptIn(): UseNotificationOptInReturn {
  const [shouldShowPrompt, setShouldShowPrompt] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkPromptState();
  }, []);

  const checkPromptState = async () => {
    try {
      const [shown, dismissedAt, dismissCount] = await Promise.all([
        AsyncStorage.getItem(PROMPT_SHOWN_KEY),
        AsyncStorage.getItem(PROMPT_DISMISSED_AT_KEY),
        AsyncStorage.getItem(PROMPT_DISMISS_COUNT_KEY),
      ]);

      // Already opted in
      if (shown === 'opted_in') {
        setShouldShowPrompt(false);
        setLoading(false);
        return;
      }

      const count = dismissCount ? parseInt(dismissCount, 10) : 0;

      // Permanently hidden after max dismissals
      if (count >= MAX_DISMISSALS) {
        setShouldShowPrompt(false);
        setLoading(false);
        return;
      }

      // Within cooldown period
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt, 10);
        if (elapsed < COOLDOWN_MS) {
          setShouldShowPrompt(false);
          setLoading(false);
          return;
        }
      }

      // Ready to show
      setShouldShowPrompt(true);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const markPromptShown = useCallback(async () => {
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'shown');
  }, []);

  const markPromptDismissed = useCallback(async () => {
    const currentCount = await AsyncStorage.getItem(PROMPT_DISMISS_COUNT_KEY);
    const count = currentCount ? parseInt(currentCount, 10) + 1 : 1;
    await AsyncStorage.setItem(PROMPT_DISMISSED_AT_KEY, String(Date.now()));
    await AsyncStorage.setItem(PROMPT_DISMISS_COUNT_KEY, String(count));
    setShouldShowPrompt(false);
  }, []);

  const markOptedIn = useCallback(async () => {
    await AsyncStorage.setItem(PROMPT_SHOWN_KEY, 'opted_in');
    setShouldShowPrompt(false);
  }, []);

  return { shouldShowPrompt, markPromptShown, markPromptDismissed, markOptedIn, loading };
}
