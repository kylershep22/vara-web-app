import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../../constants';

interface HeartIconProps {
  filled: boolean;
  size?: number;
}

export const HeartIcon: React.FC<HeartIconProps> = ({ filled, size = 14 }) => {
  // Design spec: 14x13 base, viewBox 0 0 14 13
  const aspectRatio = 13 / 14;
  const height = size * aspectRatio;

  return (
    <Svg width={size} height={height} viewBox="0 0 14 13" fill="none">
      <Path
        d="M7 12C7 12 1 8 1 4C1 2.3 2.3 1 4 1C5.1 1 6.1 1.6 7 2.5C7.9 1.6 8.9 1 10 1C11.7 1 13 2.3 13 4C13 8 7 12 7 12Z"
        fill={filled ? Colors.evergreenTeal : 'none'}
        stroke={filled ? Colors.evergreenTeal : Colors.softCharcoal}
        strokeWidth={filled ? 1.2 : 1.3}
        strokeLinejoin="round"
      />
    </Svg>
  );
};
