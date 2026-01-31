/**
 * MediaItem Component
 * Renders either an image or video based on media type
 */

import React from 'react';
import { TouchableOpacity, Image } from 'react-native';
import { VideoPlayer } from './VideoPlayer';

interface MediaItemProps {
  media: { url: string; type: 'image' | 'video' };
  style?: any;
  onPress?: () => void;
}

export const MediaItem: React.FC<MediaItemProps> = ({
  media,
  style,
  onPress,
}) => {
  if (media.type === 'video') {
    return <VideoPlayer uri={media.url} style={style} />;
  }

  // If no onPress handler, just show the image directly
  if (!onPress) {
    return <Image source={{ uri: media.url }} style={style} resizeMode="cover" />;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <Image source={{ uri: media.url }} style={style} resizeMode="cover" />
    </TouchableOpacity>
  );
};
