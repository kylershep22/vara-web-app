import React from 'react';
import { StyleSheet, View, Image, ImageStyle, ViewStyle, StyleProp } from 'react-native';
import { Text } from 'react-native-paper';
import { Colors } from '../../constants';

interface CommunityAvatarProps {
  name?: string;
  photoURL?: string | null;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

const AVATAR_COLORS = [
  Colors.evergreenTeal,
  '#5B8A72',
  '#7A9E7E',
  '#4A7C6F',
  '#3D7068',
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || '?').toUpperCase();
}

export const CommunityAvatar: React.FC<CommunityAvatarProps> = ({
  name = '',
  photoURL,
  size = 36,
  style,
}) => {
  const bgColor = name ? getColorFromName(name) : Colors.evergreenTeal;
  const fontSize = Math.round(size * 0.36);

  if (photoURL) {
    return (
      <Image
        source={{ uri: photoURL }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size,
          } as ImageStyle,
          style as ImageStyle,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size,
          backgroundColor: bgColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ color: Colors.white, fontSize, fontWeight: '600' }}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

export default CommunityAvatar;
