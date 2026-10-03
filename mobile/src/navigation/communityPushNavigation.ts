/**
 * communityPushNavigation (NPM-3a-ii): the navigation-container side of a
 * Community push, for NotificationProvider. The decision of WHERE a push
 * opens is communityPushRoute's; this only reads and drives the container.
 */
import { navigationRef } from './AppNavigator';
import { navigationArgsFor, type CommunityPushTarget } from './communityPushRoute';
import { ROUTES } from './routes';

/**
 * Resolve once the root navigator holds Main (bounded), for a cold-start
 * Community tap (NPM-3a-ii). On a cold start the root can be the auth,
 * email-verification or onboarding navigator first; a tap that cannot reach
 * Main within the bound is dropped.
 */
export async function waitForMainRoute(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  const hasMain = () =>
    navigationRef.isReady() &&
    !!navigationRef.getRootState()?.routeNames?.includes(ROUTES.Main);
  while (!hasMain()) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return true;
}

/** Open a Community push's target (NPM-3a-ii). The one place that navigates for one. */
export function openCommunityTarget(target: CommunityPushTarget): void {
  if (!navigationRef.isReady()) return;
  const navigate = navigationRef.navigate as (name: string, params?: object) => void;
  navigate(...navigationArgsFor(target));
}

/** Whether the conversation is the screen on top now (R1-K13: hidden while you are in it). */
export function isCurrentConversation(conversationId: string): boolean {
  if (!navigationRef.isReady()) return false;
  const route = navigationRef.getCurrentRoute();
  const params = route?.params as { conversationId?: unknown } | undefined;
  return route?.name === ROUTES.Chat && params?.conversationId === conversationId;
}
