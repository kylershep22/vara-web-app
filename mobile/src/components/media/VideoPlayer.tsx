/**
 * VideoPlayer Component
 * Reusable video player with native controls
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

interface VideoPlayerProps {
  uri: string;
  style?: any;
  autoPlay?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  style,
  autoPlay = false,
}) => {
  const player = useVideoPlayer(uri, (player) => {
    if (autoPlay) {
      player.play();
    }
  });

  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      allowsFullscreen
      allowsPictureInPicture
      nativeControls
    />
  );
};

const styles = StyleSheet.create({
  video: {
    width: '100%',
    height: '100%',
  },
});
