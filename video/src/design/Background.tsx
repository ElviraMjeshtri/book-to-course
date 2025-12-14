import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';
import { GRADIENTS, COLORS } from './theme';

interface BackgroundProps {
  variant?: 'default' | 'radial' | 'minimal';
  showVignette?: boolean;
  showNoise?: boolean;
  showGrid?: boolean;
}

/**
 * Subtle animated background with gradient and vignette
 */
export const Background: React.FC<BackgroundProps> = ({
  variant = 'default',
  showVignette = true,
  showNoise = false,
  showGrid = true,
}) => {
  const frame = useCurrentFrame();
  
  // Subtle gradient shift animation
  const gradientShift = interpolate(frame, [0, 300], [0, 10], {
    extrapolateRight: 'extend',
  });

  const getBackground = () => {
    switch (variant) {
      case 'radial':
        return GRADIENTS.backgroundRadial;
      case 'minimal':
        return COLORS.bgPrimary;
      default:
        return GRADIENTS.background;
    }
  };

  return (
    <AbsoluteFill>
      {/* Base gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: getBackground(),
        }}
      />
      
      {/* Subtle grid pattern */}
      {showGrid && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            opacity: 0.5,
          }}
        />
      )}
      
      {/* Animated gradient orb */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          right: '20%',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
          transform: `translate(${gradientShift}px, ${gradientShift * 0.5}px)`,
          filter: 'blur(60px)',
        }}
      />
      
      {/* Secondary orb */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '10%',
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)',
          transform: `translate(${-gradientShift * 0.5}px, ${gradientShift * 0.3}px)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Noise texture overlay - using background color instead of background-image */}
      {showNoise && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.02,
            backgroundColor: 'rgba(255,255,255,0.03)',
          }}
        />
      )}
      
      {/* Vignette overlay */}
      {showVignette && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: GRADIENTS.vignette,
            pointerEvents: 'none',
          }}
        />
      )}
    </AbsoluteFill>
  );
};

