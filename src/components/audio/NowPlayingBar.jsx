import React, { useEffect, useState } from 'react';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { Pause, Play, Music2, X } from 'lucide-react';

const NowPlayingBar = () => {
  const { track, isPlaying, togglePlay, audioRef, setTrack } = useAudioPlayer();

  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Update progress as the audio plays
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      setProgress(audio.currentTime);
    };

    const setAudioDuration = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', setAudioDuration);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', setAudioDuration);
    };
  }, [audioRef, track]);

  const formatTime = (time) =>
    isNaN(time)
      ? '0:00'
      : `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

  const handleSeek = (e) => {
    const audio = audioRef.current;
    const newTime = parseFloat(e.target.value);
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const handleClose = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setTrack(null); // This will hide the bar
  };

  if (!track) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5E3D1] shadow-xl px-4 py-3 z-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-[150px]">
          <Music2 size={20} className="text-[#1B5E57]" />
          <span className="text-sm font-medium text-[#3E3E3E] truncate">{track.title}</span>
        </div>

        {/* Progress Bar + Controls */}
        <div className="flex flex-1 flex-col gap-2 md:gap-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full h-2 appearance-none rounded-full bg-[#D5E3D1] accent-[#1B5E57]"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 min-w-[80px] justify-end">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-[#1B5E57] text-white hover:bg-[#164e48] transition"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleClose}
            className="p-2 text-gray-500 hover:text-red-500 transition"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      <audio ref={audioRef} src={track.src} preload="metadata" />
    </div>
  );
};

export default NowPlayingBar;

