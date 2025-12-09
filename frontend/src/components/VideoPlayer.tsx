import React from "react";

interface VideoPlayerProps {
  src: string;
  title: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, title }) => {
  return (
    <div className="video-player">
      <div className="video-header">
        <h4>🎬 Generated Video</h4>
        <a href={src} target="_blank" rel="noreferrer" className="video-link">
          Open in new tab ↗
        </a>
      </div>
      <video controls src={src} className="video-element">
        Your browser does not support the video element.
      </video>
      <p className="video-caption">{title}</p>
    </div>
  );
};

