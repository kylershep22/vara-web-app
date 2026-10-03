/**
 * communityPushRoute (NPM-3a-ii): where a Community push opens, or nowhere.
 *
 * One pure function for every way a Community push is opened: a tap from the
 * background, a tap that cold-starts the app, and a tap on the foreground
 * toast (Kyle's R1-K8, R1-K13, II-D7).
 *
 * OWNERSHIP IS NEVER INFERRED (II-D5, II-D17). It returns a target only for a
 * Community type whose recipientId is a well-formed UID equal to the signed-in
 * UID. A payload with recipientId missing, malformed or another account's
 * opens nothing, and its toast is not shown.
 *
 * The type strings and keys are the server's (functions-notifications,
 * src/community/send.js composePush); the tests read the sender's fixture,
 * functions-notifications/src/__tests__/fixtures/communityPayloads.json.
 */
import { ROUTES } from './routes';

export const COMMUNITY_PUSH_TYPES = {
  directMessage: 'direct_message',
  connectionRequest: 'connection_request',
} as const;

/** The param People reads to open on Requests (II-D14: the list as it is). */
export interface PeopleRequestsParams {
  initialFilter: 'requests';
  /**
   * The notification this came from. A new value on every tap, so People
   * re-selects Requests even when it is already mounted on another tab.
   */
  filterRequestId: string;
}

export interface ChatParams {
  conversationId: string;
  otherUserId: string;
}

export type CommunityPushTarget =
  | { kind: 'chat'; conversationId: string; params: ChatParams }
  | { kind: 'requests'; params: PeopleRequestsParams };

/** Firebase Auth UIDs are 1 to 128 characters; anything else is malformed. */
function isWellFormedUid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 128 &&
    value.trim() === value &&
    !value.includes('/')
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/** True for the two Community push types, whatever else the payload holds. */
export function isCommunityPush(data: unknown): boolean {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  return (
    type === COMMUNITY_PUSH_TYPES.directMessage ||
    type === COMMUNITY_PUSH_TYPES.connectionRequest
  );
}

/**
 * The target for a Community push, or null.
 *
 * @param data the notification's data payload
 * @param signedInUid the UID signed in on this phone now
 * @param notificationId the notification request's identifier
 */
export function communityPushTarget(
  data: unknown,
  signedInUid: string | null | undefined,
  notificationId: string
): CommunityPushTarget | null {
  if (!isCommunityPush(data)) return null;
  const payload = data as Record<string, unknown>;
  if (!isWellFormedUid(payload.recipientId)) return null;
  if (!isWellFormedUid(signedInUid) || payload.recipientId !== signedInUid) return null;

  if (payload.type === COMMUNITY_PUSH_TYPES.directMessage) {
    const { conversationId, senderId } = payload;
    if (!isNonEmptyString(conversationId) || !isWellFormedUid(senderId)) return null;
    if (senderId === signedInUid) return null;
    return {
      kind: 'chat',
      conversationId,
      params: { conversationId, otherUserId: senderId },
    };
  }

  return {
    kind: 'requests',
    params: { initialFilter: 'requests', filterRequestId: notificationId },
  };
}

/**
 * The root-level navigate call for a target: Main, the Community tab, then
 * Chat or People. `initial: false` keeps the Community stack's own first
 * screen beneath, so Back from Chat or People lands in Community.
 */
export function navigationArgsFor(
  target: CommunityPushTarget
): [string, { screen: string; params: { screen: string; params: object; initial: false } }] {
  const screen = target.kind === 'chat' ? ROUTES.Chat : ROUTES.People;
  return [
    ROUTES.Main,
    { screen: ROUTES.Community, params: { screen, params: target.params, initial: false } },
  ];
}
