import "./index.css";
import { Composition } from "remotion";
import { LessonVideo } from "./LessonVideo";
import type { LessonVideoPlan, LessonVideoProps } from "./types";

const fps = 30;

const samplePlan: LessonVideoPlan = {
  lessonId: "demo-1",
  title: "Sample Lesson Overview",
  totalDurationSec: 20,
  slides: [
    {
      title: "Welcome",
      bullets: ["Introduce the course", "Set expectations", "Share outcomes"],
      narration:
        "Welcome to this sample lesson. We'll outline what you will learn and the goals for this journey.",
    },
    {
      title: "Key Concepts",
      bullets: ["Variables & Types", "Control Flow", "Functions"],
      codeSnippet: `def greet(name: str) -> None:\n    print(f"Hello, {name}")`,
      narration:
        "First we cover fundamental programming concepts such as variables, control flow, and functions with a short code sample.",
    },
    {
      title: "Next Steps",
      bullets: ["Practice exercises", "Join the community", "Preview lesson 2"],
      narration:
        "Finally, you'll practice the material, connect with peers, and preview what's coming next.",
    },
  ],
  slideTimings: [
    { slideIndex: 0, startSec: 0, endSec: 7 },
    { slideIndex: 1, startSec: 7, endSec: 14 },
    { slideIndex: 2, startSec: 14, endSec: 20 },
  ],
};

export const RemotionRoot: React.FC = () => {
  const durationInFrames = fps * samplePlan.totalDurationSec;
  const defaultProps: LessonVideoProps = {
    plan: samplePlan,
    audioSrc: "/demo/audio.mp3",
    avatarSrc: "/demo/avatar.mp4",
  };

  return (
  <Composition
    id="LessonVideo"
    component={LessonVideo}
      durationInFrames={durationInFrames}
    fps={fps}
    width={1920}
    height={1080}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }) => {
        const dynamicDuration =
          Math.max(1, Math.round(props.plan.totalDurationSec * fps)) || durationInFrames;
        return {
          durationInFrames: dynamicDuration,
          props,
        };
    }}
  />
);
};
