import React, { useEffect, useState } from 'react';
import { useVideoPlayer } from '../../context/VideoPlayerContext';
import { Pause, Play, X, Video, Maximize2 } from 'lucide-react';

export default function VideoPlayerBar() {
  const { videoData, videoRef, togglePlay, isPlaying, closeVideo } = useVideoPlayer();
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateProgress = () => setProgress(video.currentTime);
    const setVideoDuration = () => setDuration(video.duration);

    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', setVideoDuration);

    return () => {
      video.removeEventListener('timeupdate', updateProgress);
      video.removeEventListener('loadedmetadata', setVideoDuration);
    };
  }, [videoRef, videoData]);

  const formatTime = (time) =>
    isNaN(time) ? '0:00' : `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;

  const handleSeek = (e) => {
    const video = videoRef.current;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setProgress(newTime);
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (video && video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  if (!videoData) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#D5E3D1] shadow-lg px-4 py-3 z-50">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Track Info */}
        <div className="flex items-center gap-3 min-w-[150px]">
          <Video size={20} className="text-[#1B5E57]" />
          <span className="text-sm font-medium text-[#3E3E3E] truncate">{videoData.title}</span>
        </div>

        {/* Progress Bar */}
        <div className="flex flex-col w-full md:flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className="w-full h-2 accent-[#1B5E57] rounded-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 min-w-[80px] justify-end">
          <button
            onClick={togglePlay}
            className="p-2 rounded-full bg-[#1B5E57] text-white hover:bg-[#164e48] transition"
            title="Play/Pause"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={handleFullscreen}
            className="p-2 text-[#1B5E57] hover:text-black transition"
            title="Fullscreen"
          >
            <Maximize2 size={16} />
          </button>
          <button
            onClick={closeVideo}
            className="p-2 text-gray-500 hover:text-red-500 transition"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <video
        ref={videoRef}
        src={videoData.src}
        preload="metadata"
        className="hidden"
        controls
      />
    </div>
  );
}

