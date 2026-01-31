/**
 * ImageViewer Component
 * Full-screen image viewer with pinch zoom, double-tap zoom, and swipe navigation
 */

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

interface ImageViewerProps {
  visible: boolean;
  images: Array<{ url: string; type: 'image' | 'video' }>;
  initialIndex: number;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  visible,
  images,
  initialIndex,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Filter to only show images (not videos)
  const imageOnly = images.filter(m => m.type === 'image');

  // Reset index when initialIndex changes
  useEffect(() => {
    setCurrentIndex(initialIndex);
    resetZoom();
  }, [initialIndex, visible]);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
      }
    });

  // Double-tap gesture to toggle zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
      }
    });

  // Pan gesture when zoomed
  const panGesture = Gesture.Pan()
    .enabled(scale.value > 1)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    doubleTapGesture,
    panGesture
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const handleSwipeLeft = () => {
    if (currentIndex < imageOnly.length - 1) {
      setCurrentIndex(currentIndex + 1);
      resetZoom();
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      resetZoom();
    }
  };

  const resetZoom = () => {
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
  };

  if (imageOnly.length === 0) return null;

  return (
    <Modal
      visible={visible}
      transparent
      onRequestClose={onClose}
      animationType="fade"
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.counter}>
            {currentIndex + 1} of {imageOnly.length}
          </Text>
          <IconButton
            icon="close"
            iconColor="#fff"
            size={28}
            onPress={onClose}
          />
        </View>

        {/* Image */}
        <GestureDetector gesture={composedGesture}>
          <Animated.Image
            source={{ uri: imageOnly[currentIndex].url }}
            style={[styles.image, animatedStyle]}
            resizeMode="contain"
          />
        </GestureDetector>

        {/* Navigation arrows (if multiple images) */}
        {imageOnly.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={styles.leftArrow}
                onPress={handleSwipeRight}
              >
                <IconButton icon="chevron-left" iconColor="#fff" size={40} />
              </TouchableOpacity>
            )}
            {currentIndex < imageOnly.length - 1 && (
              <TouchableOpacity
                style={styles.rightArrow}
                onPress={handleSwipeLeft}
              >
                <IconButton icon="chevron-right" iconColor="#fff" size={40} />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  counter: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  image: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  leftArrow: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -20,
  },
  rightArrow: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -20,
  },
});
