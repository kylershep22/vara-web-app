import React, { createContext, useContext, useRef, useState } from 'react';

const VideoPlayerContext = createContext();

export const VideoPlayerProvider = ({ children }) => {
  const videoRef = useRef(null);
  const [videoData, setVideoData] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playVideo = (title, src) => {
    setVideoData({ title, src });
    setTimeout(() => {
      videoRef.current?.play();
      setIsPlaying(true);
    }, 100);
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
  };

  const closeVideo = () => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
    setVideoData(null);
    setIsPlaying(false);
  };

  return (
    <VideoPlayerContext.Provider value={{ videoData, playVideo, togglePlay, isPlaying, videoRef, closeVideo }}>
      {children}
    </VideoPlayerContext.Provider>
  );
};

export const useVideoPlayer = () => useContext(VideoPlayerContext);
