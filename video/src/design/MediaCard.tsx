import React from 'react';
import { Img, staticFile, interpolate, spring, useVideoConfig } from 'remotion';
import { 
  COLORS, 
  SHADOWS, 
  RADIUS, 
  SPACING, 
  ANIMATION,
  FONT_SIZE,
  FONT_WEIGHT,
  GRADIENTS,
} from './theme';

interface MediaCardProps {
  src: string;
  caption?: string;
  frameInSlide: number;
}

const normalizeStaticPath = (src: string) =>
  src.startsWith('/') ? src.slice(1) : src;

/**
 * Styled image/diagram card with rounded corners, shadow, and optional caption
 */
export const MediaCard: React.FC<MediaCardProps> = ({ 
  src, 
  caption,
  frameInSlide,
}) => {
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(
    frameInSlide, 
    [5, 5 + ANIMATION.slideEntryDuration], 
    [0, 1], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame: Math.max(0, frameInSlide - 5),
    fps,
    config: { ...ANIMATION.springConfig, damping: 18 },
  });
  
  const translateY = interpolate(
    frameInSlide, 
    [5, 5 + ANIMATION.slideEntryDuration], 
    [20, 0], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const imageSrc = staticFile(normalizeStaticPath(src));

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    >
      {/* Card container */}
      <div
        style={{
          backgroundColor: COLORS.bgCard,
          borderRadius: RADIUS.xl,
          padding: SPACING.lg,
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.lg,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shine effect */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: GRADIENTS.cardShine,
            pointerEvents: 'none',
          }}
        />
        
        {/* Image */}
        <Img
          src={imageSrc}
          style={{
            maxWidth: '100%',
            maxHeight: 420,
            objectFit: 'contain',
            borderRadius: RADIUS.lg,
            display: 'block',
          }}
        />
      </div>
      
      {/* Caption */}
      {caption && (
        <p
          style={{
            marginTop: SPACING.md,
            fontSize: FONT_SIZE.caption,
            fontWeight: FONT_WEIGHT.medium,
            color: COLORS.textMuted,
            textAlign: 'center',
          }}
        >
          {caption}
        </p>
      )}
    </div>
  );
};

interface CodeCardProps {
  code: string;
  language?: string;
  frameInSlide: number;
}

/**
 * Styled code block with syntax highlighting appearance
 */
export const CodeCard: React.FC<CodeCardProps> = ({ 
  code, 
  language,
  frameInSlide,
}) => {
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(
    frameInSlide, 
    [5, 5 + ANIMATION.slideEntryDuration], 
    [0, 1], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame: Math.max(0, frameInSlide - 5),
    fps,
    config: ANIMATION.springConfig,
  });

  return (
    <div
      style={{
        opacity,
        transform: `scale(${scale})`,
        width: '100%',
      }}
    >
      <div
        style={{
          backgroundColor: '#0d1117',
          borderRadius: RADIUS.xl,
          border: `1px solid ${COLORS.border}`,
          boxShadow: SHADOWS.lg,
          overflow: 'hidden',
        }}
      >
        {/* Window controls bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: SPACING.sm,
            padding: `${SPACING.md}px ${SPACING.lg}px`,
            backgroundColor: '#161b22',
            borderBottom: `1px solid ${COLORS.border}`,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#28c840' }} />
          {language && (
            <span
              style={{
                marginLeft: 'auto',
                fontSize: FONT_SIZE.caption,
                color: COLORS.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {language}
            </span>
          )}
        </div>
        
        {/* Code content */}
        <pre
          style={{
            margin: 0,
            padding: SPACING.xl,
            fontSize: 18,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Monaco', monospace",
            color: '#e6edf3',
            lineHeight: 1.7,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {code}
        </pre>
      </div>
    </div>
  );
};

