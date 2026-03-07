/**
 * Content Moderation Types
 * Types for post reporting, hiding, and user muting
 */

import { Timestamp } from 'firebase/firestore';

export type PostReportReason =
  | 'spam'
  | 'harmful_language'
  | 'inappropriate'
  | 'unsafe'
  | 'other';

export interface PostReportReasonOption {
  id: PostReportReason;
  label: string;
  description: string;
}

export const REPORT_REASONS: PostReportReasonOption[] = [
  { id: 'spam', label: 'Spam or misleading content', description: 'Promotional, repetitive, or deceptive' },
  { id: 'harmful_language', label: 'Unkind or harmful language', description: 'Hurtful, shaming, or aggressive tone' },
  { id: 'inappropriate', label: 'Inappropriate or off-topic', description: "Doesn't belong in this community" },
  { id: 'unsafe', label: 'Feels unsafe or threatening', description: 'Concerning behavior or language' },
  { id: 'other', label: 'Something else', description: "Doesn't fit the categories above" },
];

export interface PostReport {
  id: string;
  postId: string;
  reporterId: string;
  reportedUserId: string;
  reason: PostReportReason;
  detail: string | null;
  status: 'pending' | 'reviewing' | 'resolved_action_taken' | 'resolved_dismissed';
  createdAt: Timestamp;
}

export interface HiddenPost {
  id: string;
  userId: string;
  postId: string;
  createdAt: Timestamp;
}

export interface MutedUser {
  id: string;
  muterId: string;
  mutedUserId: string;
  createdAt: Timestamp;
}
