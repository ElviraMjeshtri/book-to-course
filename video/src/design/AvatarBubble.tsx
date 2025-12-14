import React from 'react';
import { Video, staticFile, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { COLORS, SHADOWS, LAYOUT, SAFE_MARGIN } from './theme';

interface AvatarBubbleProps {
  src: string;
  size?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const normalizeStaticPath = (src: string) =>
  src.startsWith('/') ? src.slice(1) : src;

/**
 * Styled avatar video bubble with border, shadow, and subtle animation
 */
export const AvatarBubble: React.FC<AvatarBubbleProps> = ({ 
  src,
  size = LAYOUT.avatarSize,
  position = 'bottom-right',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  // Entry animation
  const entryProgress = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 80 },
  });
  
  const scale = interpolate(entryProgress, [0, 1], [0.8, 1]);
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Subtle floating animation
  const floatY = Math.sin(frame / 30) * 3;

  // Position mapping
  const positionStyles: Record<string, React.CSSProperties> = {
    'bottom-right': { bottom: SAFE_MARGIN.vertical, right: SAFE_MARGIN.horizontal },
    'bottom-left': { bottom: SAFE_MARGIN.vertical, left: SAFE_MARGIN.horizontal },
    'top-right': { top: SAFE_MARGIN.vertical + 80, right: SAFE_MARGIN.horizontal },
    'top-left': { top: SAFE_MARGIN.vertical + 80, left: SAFE_MARGIN.horizontal },
  };

  const videoSrc = staticFile(normalizeStaticPath(src));

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyles[position],
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        opacity,
        transform: `scale(${scale}) translateY(${floatY}px)`,
        boxShadow: SHADOWS.avatar,
        border: `3px solid ${COLORS.bgCard}`,
        background: COLORS.bgCard,
      }}
    >
      {/* Gradient ring around avatar */}
      <div
        style={{
          position: 'absolute',
          inset: -4,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.accentLight} 50%, ${COLORS.accent} 100%)`,
          zIndex: -1,
          opacity: 0.6,
        }}
      />
      
      {/* Video container */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
        }}
      >
        <Video
          src={videoSrc}
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </div>
      
      {/* Live indicator dot */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          right: 8,
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: COLORS.success,
          border: `3px solid ${COLORS.bgCard}`,
          boxShadow: `0 0 8px ${COLORS.success}`,
        }}
      />
    </div>
  );
};

