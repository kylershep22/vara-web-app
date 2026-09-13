/**
 * Shared Components
 * Exports components used across multiple screens
 */

// The text primitives (UI Standards 5.1). Exported here for discoverability,
// but the codemod points every consumer at the module directly: a barrel import
// in a file the barrel also reaches is how the SDK 54 circular-import problems
// started, and `Text` is imported by almost every file in the app.
export { default as Text, AnimatedText, NestedTextContext, resolveFontFamily } from './Text';
export type { TextProps } from './Text';
export { default as TextInput } from './TextInput';
export type { TextInputProps } from './TextInput';

export { default as ErrorBoundary } from './ErrorBoundary';
export { PriorityBadge } from './PriorityBadge';
export { ProgressBar } from './ProgressBar';
export { AnimatedProgressBar, CompactProgressBar } from './AnimatedProgressBar';
export { EnhancedModal, ModalFooterActions } from './EnhancedModal';
export { KeyboardAwareScrollView, useKeyboardContext } from './KeyboardAwareScrollView';
export { Tag } from './Tag';
export type { TagVariant } from './Tag';
export { BaseCard } from './BaseCard';
export { InlineCreateButton } from './InlineCreateButton';
export { FeatureGate, LockedFeaturePreview, LockedBadge } from './FeatureGate';
export { OfflineIndicator } from './OfflineIndicator';
export { Badge } from './Badge';
export type { BadgeVariant } from './Badge';
export { CommunityAvatar } from './CommunityAvatar';
export { ScreenHeader, BAND_STRONG_SCRIM } from './ScreenHeader';
export { SpotIllustration } from './SpotIllustration';
export { ComingSoonCard } from './ComingSoonCard';
export type { ComingSoonCardProps } from './ComingSoonCard';
