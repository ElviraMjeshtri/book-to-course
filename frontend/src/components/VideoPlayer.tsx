import React, { useState } from "react";

interface VideoPlayerProps {
  src: string;
  title: string;
  lessonId?: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  lessonId,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // Create a clean filename from the title
      const filename = `${lessonId || "lesson"}_${title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.mp4`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab
      window.open(src, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="video-player">
      <div className="video-header">
        <h4>🎬 Generated Video</h4>
        <div className="video-actions">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="video-download-btn"
          >
            {isDownloading ? "Downloading..." : "⬇️ Download"}
          </button>
          <a href={src} target="_blank" rel="noreferrer" className="video-link">
            Open in new tab ↗
          </a>
        </div>
      </div>
      <video controls src={src} className="video-element">
        Your browser does not support the video element.
      </video>
      <p className="video-caption">{title}</p>
    </div>
  );
};
