/**
 * ToastContext
 * Centralized toast management for feature unlock and notification toasts
 *
 * Features:
 * - Queue management for multiple toasts
 * - Sequential display with delay between toasts
 * - Integration with feature discovery system
 * - Generic notification toast for foreground consolidation
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
} from 'react';
import { DiscoverableFeatureId } from '../types/featureDiscovery';
import UnlockToast from '../components/discovery/UnlockToast';
import NotificationToast from '../components/shared/NotificationToast';

interface NotificationToastData {
  title: string;
  body: string;
  onTap?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastContextValue {
  /** Show a feature unlock toast */
  showUnlockToast: (featureId: DiscoverableFeatureId) => void;
  /** Queue multiple toasts (for multiple simultaneous unlocks) */
  queueUnlockToasts: (featureIds: DiscoverableFeatureId[]) => void;
  /** Show a generic notification toast (for foreground consolidation) */
  showNotificationToast: (title: string, body: string, onTap?: () => void, actionLabel?: string, onAction?: () => void) => void;
  /** Dismiss the current toast */
  dismissCurrentToast: () => void;
  /** Check if a toast is currently visible */
  isToastVisible: boolean;
  /** The current feature being shown (if any) */
  currentFeature: DiscoverableFeatureId | null;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TOAST_DISPLAY_DURATION = 3500;
const TOAST_QUEUE_DELAY = 500;

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toastQueue, setToastQueue] = useState<DiscoverableFeatureId[]>([]);
  const [currentFeature, setCurrentFeature] = useState<DiscoverableFeatureId | null>(null);
  const [isToastVisible, setIsToastVisible] = useState(false);
  const processingRef = useRef(false);
  const queueTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Notification toast state (separate from feature unlock queue)
  const [notificationToast, setNotificationToast] = useState<NotificationToastData | null>(null);
  const [isNotificationToastVisible, setIsNotificationToastVisible] = useState(false);

  // Process the unlock toast queue
  const processQueue = useCallback(() => {
    if (processingRef.current || toastQueue.length === 0) {
      return;
    }

    processingRef.current = true;
    const nextFeature = toastQueue[0];

    setToastQueue((prev) => prev.slice(1));
    setCurrentFeature(nextFeature);
    setIsToastVisible(true);
  }, [toastQueue]);

  // Handle unlock toast dismissal
  const handleToastDismiss = useCallback(() => {
    setIsToastVisible(false);
    setCurrentFeature(null);
    processingRef.current = false;

    if (toastQueue.length > 0) {
      queueTimerRef.current = setTimeout(() => {
        processQueue();
      }, TOAST_QUEUE_DELAY);
    }
  }, [toastQueue.length, processQueue]);

  // Start processing when queue has items and no toast is showing
  useEffect(() => {
    if (toastQueue.length > 0 && !isToastVisible && !processingRef.current) {
      processQueue();
    }
  }, [toastQueue.length, isToastVisible, processQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (queueTimerRef.current) {
        clearTimeout(queueTimerRef.current);
      }
    };
  }, []);

  const showUnlockToast = useCallback((featureId: DiscoverableFeatureId) => {
    setToastQueue((prev) => {
      if (prev.includes(featureId)) return prev;
      return [...prev, featureId];
    });
  }, []);

  const queueUnlockToasts = useCallback((featureIds: DiscoverableFeatureId[]) => {
    setToastQueue((prev) => {
      const newFeatures = featureIds.filter((id) => !prev.includes(id));
      return [...prev, ...newFeatures];
    });
  }, []);

  // Show a generic notification toast
  const showNotificationToast = useCallback((title: string, body: string, onTap?: () => void, actionLabel?: string, onAction?: () => void) => {
    // Don't show if an unlock toast is visible
    if (isToastVisible) return;
    setNotificationToast({ title, body, onTap, actionLabel, onAction });
    setIsNotificationToastVisible(true);
  }, [isToastVisible]);

  const handleNotificationToastDismiss = useCallback(() => {
    setIsNotificationToastVisible(false);
    setNotificationToast(null);
  }, []);

  const dismissCurrentToast = useCallback(() => {
    if (isNotificationToastVisible) {
      handleNotificationToastDismiss();
    } else {
      handleToastDismiss();
    }
  }, [isNotificationToastVisible, handleNotificationToastDismiss, handleToastDismiss]);

  const value: ToastContextValue = {
    showUnlockToast,
    queueUnlockToasts,
    showNotificationToast,
    dismissCurrentToast,
    isToastVisible: isToastVisible || isNotificationToastVisible,
    currentFeature,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {currentFeature && (
        <UnlockToast
          featureId={currentFeature}
          visible={isToastVisible}
          onDismiss={handleToastDismiss}
          autoDismissDelay={TOAST_DISPLAY_DURATION}
        />
      )}
      {notificationToast && (
        <NotificationToast
          title={notificationToast.title}
          body={notificationToast.body}
          visible={isNotificationToastVisible}
          onDismiss={handleNotificationToastDismiss}
          onTap={notificationToast.onTap}
          autoDismissDelay={notificationToast.actionLabel ? 4000 : TOAST_DISPLAY_DURATION}
          actionLabel={notificationToast.actionLabel}
          onAction={notificationToast.onAction}
        />
      )}
    </ToastContext.Provider>
  );
};

/**
 * Hook to access toast context
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;
