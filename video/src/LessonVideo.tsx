import React from 'react';
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  staticFile,
} from 'remotion';
import type { LessonVideoProps } from './types';
import {
  Background,
  SlideHeader,
  SlideRenderer,
  AvatarBubble,
  ProgressBar,
  SAFE_MARGIN,
  SPACING,
  LAYOUT,
  COLORS,
  FONT_SIZE,
  FONT_WEIGHT,
} from './design';

const normalizeStaticPath = (src: string) =>
  src.startsWith('/') ? src.slice(1) : src;

export const LessonVideo: React.FC<LessonVideoProps> = ({
  plan,
  audioSrc,
  avatarSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Current time in seconds
  const timeSec = frame / fps;
  
  // Find current slide based on timing
  const currentTiming =
    plan.slideTimings.find(
      (timing) => timeSec >= timing.startSec && timeSec < timing.endSec
    ) ?? plan.slideTimings[plan.slideTimings.length - 1];
  
  const currentSlideIndex = currentTiming?.slideIndex ?? 0;
  const slide = plan.slides[currentSlideIndex] ?? plan.slides[0];

  // Calculate frame within current slide for animations
  const slideStartFrame = (currentTiming?.startSec ?? 0) * fps;
  const frameInSlide = frame - slideStartFrame;
  
  // Overall lesson progress (0-1)
  const lessonProgress = frame / durationInFrames;

  return (
    <AbsoluteFill
      style={{
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* Background */}
      <Background variant="default" showVignette showGrid />

      {/* Audio */}
      {audioSrc && <Audio src={staticFile(normalizeStaticPath(audioSrc))} />}

      {/* Main content frame */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          padding: `${SAFE_MARGIN.vertical}px ${SAFE_MARGIN.horizontal}px`,
        }}
      >
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: SPACING.xxl,
            height: LAYOUT.headerHeight,
          }}
        >
          <SlideHeader
            lessonTitle={plan.title}
            sectionLabel={`Lesson ${plan.lessonId.split('-').pop() || '1'}`}
          />
          
          {/* Lesson title badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: SPACING.md,
              padding: `${SPACING.sm}px ${SPACING.lg}px`,
              backgroundColor: COLORS.overlayLight,
              borderRadius: 100,
              border: `1px solid ${COLORS.border}`,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: COLORS.accent,
                boxShadow: `0 0 8px ${COLORS.accent}`,
              }}
            />
            <span
              style={{
                fontSize: FONT_SIZE.caption,
                fontWeight: FONT_WEIGHT.semibold,
                color: COLORS.textSecondary,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {slide.title.length > 30 
                ? slide.title.substring(0, 30) + '...' 
                : slide.title}
            </span>
          </div>
        </header>

        {/* Slide content */}
        <main
          style={{
            flex: 1,
            display: 'flex',
            paddingRight: avatarSrc ? LAYOUT.avatarSize + SPACING.xl : 0,
          }}
        >
          <SlideRenderer
            slide={slide}
            frameInSlide={frameInSlide}
          />
        </main>

        {/* Footer with progress */}
        <footer
          style={{
            paddingTop: SPACING.lg,
            borderTop: `1px solid ${COLORS.border}`,
            height: LAYOUT.footerHeight,
          }}
        >
          <ProgressBar
            currentSlide={currentSlideIndex}
            totalSlides={plan.slides.length}
            lessonProgress={lessonProgress}
          />
        </footer>
      </div>

      {/* Avatar bubble - positioned to not overlap content */}
      {avatarSrc && (
        <AvatarBubble
          src={avatarSrc}
          size={LAYOUT.avatarSize}
          position="bottom-right"
        />
      )}
    </AbsoluteFill>
  );
};
