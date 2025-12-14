import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { 
  COLORS, 
  SPACING, 
  FONT_SIZE, 
  FONT_WEIGHT, 
  LAYOUT,
  RADIUS,
  GRADIENTS,
} from './theme';

interface ProgressBarProps {
  currentSlide: number;
  totalSlides: number;
  lessonProgress?: number; // 0-1 for overall lesson progress
}

/**
 * Bottom progress bar showing slide count and lesson progress
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ 
  currentSlide, 
  totalSlides,
  lessonProgress = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Animate progress bar fill
  const animatedProgress = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 100 },
    from: 0,
    to: lessonProgress,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: SPACING.xl,
        opacity,
      }}
    >
      {/* Slide dots indicator */}
      <div
        style={{
          display: 'flex',
          gap: SPACING.sm,
          alignItems: 'center',
        }}
      >
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i === currentSlide ? 28 : 8,
              height: 8,
              borderRadius: RADIUS.full,
              backgroundColor: i === currentSlide 
                ? COLORS.accent 
                : i < currentSlide 
                  ? COLORS.accentLight 
                  : COLORS.border,
              transition: 'all 0.3s ease',
              boxShadow: i === currentSlide ? `0 0 12px ${COLORS.accent}60` : 'none',
            }}
          />
        ))}
      </div>
      
      {/* Progress bar */}
      <div
        style={{
          flex: 1,
          height: LAYOUT.progressBarHeight,
          backgroundColor: COLORS.border,
          borderRadius: RADIUS.full,
          overflow: 'hidden',
          maxWidth: 400,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${animatedProgress * 100}%`,
            background: GRADIENTS.accent,
            borderRadius: RADIUS.full,
          }}
        />
      </div>
      
      {/* Slide counter */}
      <span
        style={{
          fontSize: FONT_SIZE.caption,
          fontWeight: FONT_WEIGHT.medium,
          color: COLORS.textMuted,
          minWidth: 60,
          textAlign: 'right',
        }}
      >
        {currentSlide + 1} / {totalSlides}
      </span>
    </div>
  );
};

interface SlideDotsProps {
  current: number;
  total: number;
}

/**
 * Simple dot-based slide indicator
 */
export const SlideDots: React.FC<SlideDotsProps> = ({ current, total }) => (
  <div
    style={{
      display: 'flex',
      gap: SPACING.sm,
      alignItems: 'center',
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === current ? 24 : 8,
          height: 8,
          borderRadius: RADIUS.full,
          backgroundColor: i === current ? COLORS.accent : COLORS.border,
          boxShadow: i === current ? `0 0 10px ${COLORS.accent}50` : 'none',
        }}
      />
    ))}
  </div>
);

