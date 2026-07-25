// TEMPORARY dev harness for VideoPlayerModal (focus-video-player slice).
//
// The Focus hub does not yet have a Learn card to launch the player from —
// that arrives in a later slice. This screen exists only so the modal is
// walkable before then, and SHOULD BE DELETED once the hub invokes the player
// for real.
//
// Reachable only when __DEV__ is true: the route is registered inside the
// __DEV__ block in AppNavigator, so neither the route nor this component ships
// in a release build (TestFlight or production).
//
// Two clips on purpose — one landscape, one portrait — so the walk proves the
// player handles whatever aspect ratio real content arrives in.

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { VideoPlayerModal } from '../../components/video/VideoPlayerModal';

interface TestClip {
  label: string;
  detail: string;
  storagePath: string;
}

// Storage paths only — the player itself knows nothing about these.
const TEST_CLIPS: TestClip[] = [
  {
    label: 'Test 1 — landscape',
    detail: 'focus-video/video-player-test-1.mp4 · ~125 MB',
    storagePath: 'focus-video/video-player-test-1.mp4',
  },
  {
    label: 'Test 2 — portrait',
    detail: 'focus-video/video-player-test-2.mp4 · ~242 MB',
    storagePath: 'focus-video/video-player-test-2.mp4',
  },
  {
    label: 'Missing file (error state)',
    detail: 'focus-video/does-not-exist.mp4',
    storagePath: 'focus-video/does-not-exist.mp4',
  },
];

export function VideoPlayerTestScreen() {
  const [activePath, setActivePath] = useState<string | null>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);

  const open = (clip: TestClip) => {
    setActivePath(clip.storagePath);
    setTitle(clip.label);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Dev: Video Player</Text>
        <Text style={styles.note}>
          Temporary harness. Both clips stream from Firebase Storage under
          focus-video/. Neither test file was encoded with +faststart, so a slow
          first frame is expected and is not a player fault — see
          docs/video-encoding-recipe.md.
        </Text>

        {TEST_CLIPS.map((clip) => (
          <TouchableOpacity
            key={clip.storagePath}
            style={styles.card}
            onPress={() => open(clip)}
            accessibilityRole="button"
            accessibilityLabel={`Play ${clip.label}`}
            testID={`dev-video-${clip.storagePath}`}
          >
            <Text style={styles.cardLabel}>{clip.label}</Text>
            <Text style={styles.cardDetail}>{clip.detail}</Text>
          </TouchableOpacity>
        ))}

        <View style={styles.checklist}>
          <Text style={styles.checklistHeading}>Walk checklist</Text>
          {[
            'Both clips fit the frame — letterboxed / pillarboxed, never stretched or cropped',
            'Play, pause, scrub, and seek land where expected',
            'Fullscreen rotates to landscape and restores portrait on exit',
            'Close via the X and via hardware back (Android)',
            'Missing-file entry shows a calm error with a working retry',
            'Reduce Motion on → modal cross-fades instead of sliding',
            'VoiceOver / TalkBack: scrubber is adjustable and announces position',
          ].map((line) => (
            <Text key={line} style={styles.checklistItem}>
              {'•'}  {line}
            </Text>
          ))}
        </View>
      </ScrollView>

      <VideoPlayerModal
        visible={activePath !== null}
        storagePath={activePath}
        title={title}
        onClose={() => setActivePath(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  heading: {
    ...TextStyles.h2,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  note: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.lg,
  },
  card: {
    minHeight: 48,
    padding: Spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },
  cardLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  cardDetail: {
    ...TextStyles.caption,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  checklist: {
    marginTop: Spacing.lg,
    padding: Spacing.base,
    borderRadius: 12,
    backgroundColor: Colors.dewSage,
  },
  checklistHeading: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.xs,
  },
  checklistItem: {
    ...TextStyles.caption,
    color: Colors.softCharcoal,
    marginTop: 4,
  },
});

export default VideoPlayerTestScreen;
