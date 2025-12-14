import React from 'react';
import { interpolate } from 'remotion';
import type { Slide } from '../types';
import { SlideTitle, BulletList } from './Text';
import { MediaCard, CodeCard } from './MediaCard';
import { LAYOUT, ANIMATION } from './theme';

interface SlideRendererProps {
  slide: Slide;
  frameInSlide: number;
}

/**
 * Renders a slide with appropriate layout based on content
 * - Two-column layout if image/code present
 * - Centered text layout otherwise
 */
export const SlideRenderer: React.FC<SlideRendererProps> = ({
  slide,
  frameInSlide,
}) => {
  
  const hasVisual = slide.imagePath || slide.codeSnippet;
  
  // Entry/exit animation
  const opacity = interpolate(
    frameInSlide,
    [0, ANIMATION.fadeInDuration],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  const translateY = interpolate(
    frameInSlide,
    [0, ANIMATION.slideEntryDuration],
    [15, 0],
    { extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        gap: LAYOUT.twoColumnGap,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      {/* Text content - left side or centered */}
      <div
        style={{
          flex: hasVisual ? 1 : undefined,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: hasVisual ? undefined : LAYOUT.maxTextWidth,
          margin: hasVisual ? undefined : '0 auto',
        }}
      >
        <SlideTitle frameInSlide={frameInSlide}>
          {slide.title}
        </SlideTitle>
        
        {slide.bullets.length > 0 && (
          <BulletList
            bullets={slide.bullets}
            frameInSlide={frameInSlide}
          />
        )}
      </div>
      
      {/* Visual content - right side */}
      {hasVisual && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {slide.imagePath ? (
            <MediaCard
              src={slide.imagePath}
              caption={slide.visualHint}
              frameInSlide={frameInSlide}
            />
          ) : slide.codeSnippet ? (
            <CodeCard
              code={slide.codeSnippet}
              language="python"
              frameInSlide={frameInSlide}
            />
          ) : null}
        </div>
      )}
    </div>
  );
};

interface SlideTransitionProps {
  children: React.ReactNode;
  slideKey: string | number;
  frameInSlide: number;
  slideDuration: number;
}

/**
 * Wrapper that adds fade transitions between slides
 */
export const SlideTransition: React.FC<SlideTransitionProps> = ({
  children,
  slideKey,
  frameInSlide,
  slideDuration,
}) => {
  const fps = 30; // Standard
  const transitionFrames = 10;
  
  // Fade in at start
  const fadeIn = interpolate(
    frameInSlide,
    [0, transitionFrames],
    [0, 1],
    { extrapolateRight: 'clamp' }
  );
  
  // Fade out at end
  const endFrame = slideDuration * fps;
  const fadeOut = interpolate(
    frameInSlide,
    [endFrame - transitionFrames, endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      key={slideKey}
      style={{
        flex: 1,
        display: 'flex',
        opacity: Math.max(0.01, opacity), // Prevent complete disappearance
      }}
    >
      {children}
    </div>
  );
};

