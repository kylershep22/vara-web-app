/**
 * HabitCompletionSheet
 * Bottom sheet shown when a user checks off a habit.
 *
 * Routes to StandardSheet or ConnectionSheet based on habit.category.
 * Uses EnhancedModal for consistent bottom-sheet behavior.
 */

import React, { useCallback } from 'react';
import { EnhancedModal } from '../shared/EnhancedModal';
import { StandardSheet } from './StandardSheet';
import { ConnectionSheet } from './ConnectionSheet';
import type { HabitCompletionSheetProps } from './types';

export { type HabitCompletionSheetProps } from './types';

export const HabitCompletionSheet: React.FC<HabitCompletionSheetProps> = (props) => {
  const { habit, visible, onDismiss } = props;

  const isConnection = habit.category === 'Connection';

  // Sheet title varies by variant — but we keep it minimal since the
  // inner sheets render their own styled headers.
  const title = isConnection ? 'Connection check-in' : 'Habit check-in';

  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={handleDismiss}
      title={title}
      maxHeightPercent="auto"
      hasInputs={false}
      showKeyboardToolbar={false}
    >
      {isConnection ? (
        <ConnectionSheet {...props} />
      ) : (
        <StandardSheet {...props} />
      )}
    </EnhancedModal>
  );
};

export default HabitCompletionSheet;
