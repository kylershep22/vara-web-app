import React, { createContext, useContext, useState, useRef } from 'react';

const AudioPlayerContext = createContext();

export const AudioPlayerProvider = ({ children }) => {
  const audioRef = useRef(null);
  const [track, setTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const playTrack = (title, src) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    setTrack({ title, src });
    setTimeout(() => {
      audioRef.current?.play();
      setIsPlaying(true);
    }, 100); // delay ensures <audio> is updated
  };

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <AudioPlayerContext.Provider value={{ track, isPlaying, playTrack, togglePlay, audioRef, setTrack }}>
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => useContext(AudioPlayerContext);
