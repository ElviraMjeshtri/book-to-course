import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { 
  COLORS, 
  FONT_SIZE, 
  FONT_WEIGHT, 
  LINE_HEIGHT, 
  SPACING, 
  ANIMATION,
  LAYOUT,
} from './theme';

interface SlideHeaderProps {
  lessonTitle: string;
  sectionLabel?: string;
}

/**
 * Top header showing lesson title and section
 */
export const SlideHeader: React.FC<SlideHeaderProps> = ({ 
  lessonTitle, 
  sectionLabel 
}) => {
  const frame = useCurrentFrame();
  
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: SPACING.md,
        opacity,
      }}
    >
      {sectionLabel && (
        <>
          <span
            style={{
              fontSize: FONT_SIZE.caption,
              fontWeight: FONT_WEIGHT.semibold,
              color: COLORS.accent,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            {sectionLabel}
          </span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: COLORS.textMuted,
            }}
          />
        </>
      )}
      <span
        style={{
          fontSize: FONT_SIZE.body,
          fontWeight: FONT_WEIGHT.medium,
          color: COLORS.textSecondary,
        }}
      >
        {lessonTitle}
      </span>
    </div>
  );
};

interface SlideTitleProps {
  children: React.ReactNode;
  frameInSlide: number;
}

/**
 * Main slide title with spring animation
 */
export const SlideTitle: React.FC<SlideTitleProps> = ({ children, frameInSlide }) => {
  const { fps } = useVideoConfig();
  
  const scale = spring({
    frame: frameInSlide,
    fps,
    config: ANIMATION.springConfig,
  });
  
  const opacity = interpolate(frameInSlide, [0, ANIMATION.fadeInDuration], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <h1
      style={{
        fontSize: FONT_SIZE.display,
        fontWeight: FONT_WEIGHT.bold,
        color: COLORS.textPrimary,
        margin: 0,
        marginBottom: SPACING.xl,
        lineHeight: LINE_HEIGHT.tight,
        maxWidth: LAYOUT.maxTextWidth,
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'left center',
      }}
    >
      {children}
    </h1>
  );
};

interface BodyTextProps {
  children: React.ReactNode;
  size?: 'normal' | 'large';
}

/**
 * Body text paragraph
 */
export const BodyText: React.FC<BodyTextProps> = ({ children, size = 'normal' }) => (
  <p
    style={{
      fontSize: size === 'large' ? FONT_SIZE.bodyLarge : FONT_SIZE.body,
      fontWeight: FONT_WEIGHT.regular,
      color: COLORS.textSecondary,
      margin: 0,
      lineHeight: LINE_HEIGHT.relaxed,
      maxWidth: LAYOUT.maxTextWidth,
    }}
  >
    {children}
  </p>
);

interface BulletItemProps {
  text: string;
  index: number;
  frameInSlide: number;
  accentColor?: string;
}

/**
 * Single animated bullet point
 */
export const BulletItem: React.FC<BulletItemProps> = ({ 
  text, 
  index, 
  frameInSlide,
  accentColor = COLORS.accent,
}) => {
  const { fps } = useVideoConfig();
  const delay = index * ANIMATION.bulletStagger;
  
  const opacity = interpolate(
    frameInSlide, 
    [delay, delay + ANIMATION.fadeInDuration], 
    [0, 1], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const translateX = interpolate(
    frameInSlide, 
    [delay, delay + ANIMATION.fadeInDuration], 
    [-24, 0], 
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const scale = spring({
    frame: Math.max(0, frameInSlide - delay),
    fps,
    config: { ...ANIMATION.springConfig, stiffness: 150 },
  });

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: SPACING.lg,
        marginBottom: SPACING.lg,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      {/* Bullet dot */}
      <div
        style={{
          width: 10,
          height: 10,
          borderRadius: '50%',
          backgroundColor: accentColor,
          marginTop: 10,
          flexShrink: 0,
          transform: `scale(${scale})`,
          boxShadow: `0 0 12px ${accentColor}40`,
        }}
      />
      {/* Bullet text */}
      <span
        style={{
          fontSize: FONT_SIZE.h4,
          fontWeight: FONT_WEIGHT.medium,
          color: COLORS.textPrimary,
          lineHeight: LINE_HEIGHT.normal,
          flex: 1,
        }}
      >
        {text}
      </span>
    </li>
  );
};

interface BulletListProps {
  bullets: string[];
  frameInSlide: number;
  maxItems?: number;
}

/**
 * Animated bullet list
 */
export const BulletList: React.FC<BulletListProps> = ({ 
  bullets, 
  frameInSlide,
  maxItems = 5,
}) => {
  // Limit bullets to prevent overflow
  const visibleBullets = bullets.slice(0, maxItems);
  const hasMore = bullets.length > maxItems;

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {visibleBullets.map((bullet, idx) => (
        <BulletItem
          key={idx}
          text={bullet}
          index={idx}
          frameInSlide={frameInSlide}
        />
      ))}
      {hasMore && (
        <li
          style={{
            fontSize: FONT_SIZE.body,
            color: COLORS.textMuted,
            marginTop: SPACING.sm,
            fontStyle: 'italic',
          }}
        >
          + {bullets.length - maxItems} more...
        </li>
      )}
    </ul>
  );
};

interface CaptionProps {
  children: React.ReactNode;
}

/**
 * Small caption text
 */
export const Caption: React.FC<CaptionProps> = ({ children }) => (
  <span
    style={{
      fontSize: FONT_SIZE.caption,
      fontWeight: FONT_WEIGHT.regular,
      color: COLORS.textMuted,
      lineHeight: LINE_HEIGHT.normal,
    }}
  >
    {children}
  </span>
);

