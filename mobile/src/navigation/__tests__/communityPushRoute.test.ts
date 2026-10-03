/**
 * communityPushRoute (NPM-3a-ii): the one router for Community taps and
 * toasts. R1-K8; Kyle's II-D5, II-D7, II-D14 and II-D17.
 *
 * The type strings and keys are read from the sender's own fixture,
 * functions-notifications/src/__tests__/fixtures/communityPayloads.json,
 * which the sender's tests assert composePush produces. A rename on either
 * side fails one of the two suites. Each test names the mutation it catches.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import {
  COMMUNITY_PUSH_TYPES,
  communityPushTarget,
  isCommunityPush,
  navigationArgsFor,
} from '../communityPushRoute';
import { ROUTES } from '../routes';

const SERVER_PAYLOADS = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', '..', '..', 'functions-notifications', 'src', '__tests__', 'fixtures', 'communityPayloads.json'),
    'utf8'
  )
) as Record<'direct_message' | 'connection_request', Record<string, string>>;

const DM = SERVER_PAYLOADS.direct_message;
const REQUEST = SERVER_PAYLOADS.connection_request;
const ME = DM.recipientId;

describe('the payloads the server sends', () => {
  test('the router keys on the server\'s type strings', () => {
    // Mutation caught: a type string renamed on this side only.
    expect(COMMUNITY_PUSH_TYPES.directMessage).toBe(DM.type);
    expect(COMMUNITY_PUSH_TYPES.connectionRequest).toBe(REQUEST.type);
    expect(isCommunityPush(DM)).toBe(true);
    expect(isCommunityPush(REQUEST)).toBe(true);
    expect(isCommunityPush({ type: 'daily_reminder', category: 'daily_rhythm' })).toBe(false);
  });

  test('a direct message opens Chat with the conversation and the sender as the other user', () => {
    // Mutations caught: otherUserId from messageId or recipientId; conversationId dropped.
    expect(communityPushTarget(DM, ME, 'n1')).toEqual({
      kind: 'chat',
      conversationId: DM.conversationId,
      params: { conversationId: DM.conversationId, otherUserId: DM.senderId },
    });
  });

  test('a connection request opens People with the Requests param, carrying the notification', () => {
    // Mutation caught: the param or its per-tap id dropped.
    expect(communityPushTarget(REQUEST, ME, 'n2')).toEqual({
      kind: 'requests',
      params: { initialFilter: 'requests', filterRequestId: 'n2' },
    });
  });
});

describe('ownership is never inferred (II-D17)', () => {
  const malformed: [string, unknown][] = [
    ['missing', undefined],
    ['null', null],
    ['empty', ''],
    ['a number', 42],
    ['padded with spaces', ` ${ME}`],
    ['containing a slash', `${ME}/x`],
    ['longer than a UID can be', 'u'.repeat(129)],
  ];
  test.each(malformed)('recipientId %s: no target, for either type', (_label, value) => {
    // Mutations caught: the well-formedness check dropped or loosened.
    expect(communityPushTarget({ ...DM, recipientId: value }, ME, 'n')).toBeNull();
    expect(communityPushTarget({ ...REQUEST, recipientId: value }, ME, 'n')).toBeNull();
  });

  test('another account\'s recipientId: no target', () => {
    // Mutation caught: the equality check dropped.
    expect(communityPushTarget(DM, 'uid-someone-else', 'n')).toBeNull();
    expect(communityPushTarget(REQUEST, 'uid-someone-else', 'n')).toBeNull();
  });

  test('nobody signed in: no target', () => {
    // Mutation caught: a missing signed-in uid treated as a match.
    expect(communityPushTarget(DM, null, 'n')).toBeNull();
    expect(communityPushTarget({ ...DM, recipientId: undefined }, undefined, 'n')).toBeNull();
  });

  test('a direct message without a conversation or a valid sender: no target', () => {
    expect(communityPushTarget({ ...DM, conversationId: '' }, ME, 'n')).toBeNull();
    expect(communityPushTarget({ ...DM, senderId: undefined }, ME, 'n')).toBeNull();
    expect(communityPushTarget({ ...DM, senderId: ME }, ME, 'n')).toBeNull();
  });

  test('not a Community payload: no target', () => {
    expect(communityPushTarget({ type: 'routine-reminder', recipientId: ME }, ME, 'n')).toBeNull();
    expect(communityPushTarget(undefined, ME, 'n')).toBeNull();
  });
});

describe('the navigate call', () => {
  test('Main, the Community tab, then the screen, with the stack root kept beneath', () => {
    // Mutation caught: initial: false dropped (Back from Chat would leave Community).
    const chat = communityPushTarget(DM, ME, 'n')!;
    expect(navigationArgsFor(chat)).toEqual([
      ROUTES.Main,
      { screen: ROUTES.Community, params: { screen: ROUTES.Chat, params: chat.params, initial: false } },
    ]);
    const requests = communityPushTarget(REQUEST, ME, 'n')!;
    expect(navigationArgsFor(requests)[1].params.screen).toBe(ROUTES.People);
  });
});
