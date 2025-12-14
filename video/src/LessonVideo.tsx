import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Audio,
  Video,
  Img,
  staticFile,
  interpolate,
  spring,
} from "remotion";
import type { LessonVideoProps } from "./types";

const normalizeStaticPath = (src: string) =>
  src.startsWith("/") ? src.slice(1) : src;

// Slide progress indicator
const SlideProgress: React.FC<{ current: number; total: number }> = ({
  current,
  total,
}) => (
  <div
    style={{
      display: "flex",
      gap: 8,
      alignItems: "center",
    }}
  >
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === current ? 32 : 12,
          height: 4,
          borderRadius: 2,
          backgroundColor: i === current ? "#3b82f6" : "rgba(148,163,184,0.3)",
          transition: "all 0.3s ease",
        }}
      />
    ))}
  </div>
);

// Bullet point component with animation
const BulletPoint: React.FC<{
  text: string;
  index: number;
  frame: number;
  fps: number;
}> = ({ text, index, frame, fps }) => {
  const delay = index * 8; // Stagger bullets
  const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const translateX = interpolate(frame, [delay, delay + 10], [-20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <li
      style={{
        marginBottom: 20,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          backgroundColor: "#3b82f6",
          marginTop: 12,
          flexShrink: 0,
        }}
      />
      <span style={{ fontSize: 32, lineHeight: 1.4, fontWeight: 500 }}>
        {text}
      </span>
    </li>
  );
};

// Code block component
const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
  <div
    style={{
      backgroundColor: "#1e293b",
      borderRadius: 16,
      padding: 28,
      border: "1px solid rgba(148,163,184,0.15)",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        display: "flex",
        gap: 8,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: "#ef4444",
        }}
      />
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: "#eab308",
        }}
      />
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          backgroundColor: "#22c55e",
        }}
      />
    </div>
    <pre
      style={{
        margin: 0,
        fontSize: 20,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        color: "#e2e8f0",
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
      }}
    >
      {code}
    </pre>
  </div>
);

// Image display component for book diagrams
const SlideImage: React.FC<{ src: string; frame: number; fps: number }> = ({
  src,
  frame,
  fps,
}) => {
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 15], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Normalize path for staticFile (remove leading slash if present)
  const imageSrc = staticFile(normalizeStaticPath(src));

  return (
    <div
      style={{
        backgroundColor: "#1e293b",
        borderRadius: 16,
        padding: 16,
        border: "1px solid rgba(148,163,184,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${scale})`,
        maxHeight: "100%",
        overflow: "hidden",
      }}
    >
      <Img
        src={imageSrc}
        style={{
          maxWidth: "100%",
          maxHeight: 400,
          objectFit: "contain",
          borderRadius: 8,
        }}
      />
    </div>
  );
};

export const LessonVideo: React.FC<LessonVideoProps> = ({
  plan,
  audioSrc,
  avatarSrc,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const timeSec = frame / fps;
  const currentTiming =
    plan.slideTimings.find(
      (timing) => timeSec >= timing.startSec && timeSec < timing.endSec
    ) ?? plan.slideTimings[plan.slideTimings.length - 1];
  const currentSlideIndex = currentTiming?.slideIndex ?? 0;
  const slide = plan.slides[currentSlideIndex] ?? plan.slides[0];

  // Calculate frame within current slide for animations
  const slideStartFrame = (currentTiming?.startSec ?? 0) * fps;
  const frameInSlide = frame - slideStartFrame;

  // Title animation
  const titleScale = spring({
    frame: frameInSlide,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "white",
        fontFamily:
          "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      }}
    >
      {/* Audio */}
      {audioSrc && <Audio src={staticFile(normalizeStaticPath(audioSrc))} />}

      {/* Main content area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "60px 80px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 40,
          }}
        >
          <div>
            <p
              style={{
                fontSize: 18,
                color: "#3b82f6",
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              {plan.title}
            </p>
          </div>
          <SlideProgress
            current={currentSlideIndex}
            total={plan.slides.length}
          />
        </div>

        {/* Slide content */}
        <div style={{ flex: 1, display: "flex", gap: 60 }}>
          {/* Left side - Title and bullets */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <h1
              style={{
                fontSize: 64,
                fontWeight: 700,
                margin: "0 0 40px 0",
                lineHeight: 1.1,
                transform: `scale(${titleScale})`,
                transformOrigin: "left center",
              }}
            >
              {slide.title}
            </h1>

            <ul
              style={{
                listStyle: "none",
                margin: 0,
                padding: 0,
                flex: 1,
              }}
            >
              {slide.bullets.map((bullet, idx) => (
                <BulletPoint
                  key={`${currentSlideIndex}-${idx}`}
                  text={bullet}
                  index={idx}
                  frame={frameInSlide}
                  fps={fps}
                />
              ))}
            </ul>
          </div>

          {/* Right side - Image, Code, or visual */}
          {(slide.imagePath || slide.codeSnippet) && (
            <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
              {slide.imagePath ? (
                <SlideImage
                  src={slide.imagePath}
                  frame={frameInSlide}
                  fps={fps}
                />
              ) : slide.codeSnippet ? (
                <CodeBlock code={slide.codeSnippet} />
              ) : null}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: 20,
            borderTop: "1px solid rgba(148,163,184,0.1)",
          }}
        >
          <p
            style={{
              fontSize: 16,
              color: "rgba(148,163,184,0.6)",
              margin: 0,
            }}
          >
            Slide {currentSlideIndex + 1} of {plan.slides.length}
          </p>
        </div>
      </div>

      {/* Avatar bubble */}
      {avatarSrc && (
        <div
          style={{
            position: "absolute",
            bottom: 60,
            right: 60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            overflow: "hidden",
            border: "4px solid rgba(59,130,246,0.5)",
            boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
          }}
        >
          <Video src={staticFile(normalizeStaticPath(avatarSrc))} muted />
        </div>
      )}
    </AbsoluteFill>
  );
};
