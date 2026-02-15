/**
 * Brain Health Vocabulary Hook
 * Manages user preference for scientific vs plain language
 */

import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../context/AuthContext';
import {
  BRAIN_HEALTH_TRANSLATIONS,
  INPUT_LABEL_TRANSLATIONS,
  ACTION_TRANSLATIONS,
  BrainHealthTranslation,
  getTranslation,
  getActionLabel,
} from '../constants/brainHealth';

const PREFERENCE_KEY = 'brain_health_show_science';

interface UseBrainHealthVocabularyReturn {
  /** Whether to show scientific terminology (true) or plain language (false) */
  showScience: boolean;
  /** Toggle between scientific and plain language */
  toggleVocabulary: () => Promise<void>;
  /** Set vocabulary preference directly */
  setShowScience: (show: boolean) => Promise<void>;
  /** Get translated title and description for a component */
  getComponentText: (key: string) => { title: string; description: string; learnMore?: string };
  /** Get translated input label */
  getInputLabel: (key: string) => { title: string; description: string };
  /** Get translated action/button label */
  getActionText: (key: string) => string;
  /** Whether preference is still loading */
  loading: boolean;
}

export const useBrainHealthVocabulary = (): UseBrainHealthVocabularyReturn => {
  const { user } = useAuth();
  const [showScience, setShowScienceState] = useState(false); // Default: plain language
  const [loading, setLoading] = useState(true);

  // Load preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const key = user ? `${PREFERENCE_KEY}_${user.uid}` : PREFERENCE_KEY;
        const stored = await SecureStore.getItemAsync(key);
        if (stored !== null) {
          setShowScienceState(stored === 'true');
        }
      } catch (error) {
        console.error('Error loading brain health vocabulary preference:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, [user]);

  // Save preference
  const setShowScience = useCallback(async (show: boolean) => {
    try {
      const key = user ? `${PREFERENCE_KEY}_${user.uid}` : PREFERENCE_KEY;
      await SecureStore.setItemAsync(key, show.toString());
      setShowScienceState(show);
    } catch (error) {
      console.error('Error saving brain health vocabulary preference:', error);
    }
  }, [user]);

  // Toggle preference
  const toggleVocabulary = useCallback(async () => {
    await setShowScience(!showScience);
  }, [showScience, setShowScience]);

  // Get component text
  const getComponentText = useCallback((key: string) => {
    return getTranslation(key, showScience, BRAIN_HEALTH_TRANSLATIONS);
  }, [showScience]);

  // Get input label
  const getInputLabel = useCallback((key: string) => {
    const translation = getTranslation(key, showScience, INPUT_LABEL_TRANSLATIONS);
    return { title: translation.title, description: translation.description };
  }, [showScience]);

  // Get action text
  const getActionText = useCallback((key: string) => {
    return getActionLabel(key, showScience);
  }, [showScience]);

  return {
    showScience,
    toggleVocabulary,
    setShowScience,
    getComponentText,
    getInputLabel,
    getActionText,
    loading,
  };
};

export default useBrainHealthVocabulary;
