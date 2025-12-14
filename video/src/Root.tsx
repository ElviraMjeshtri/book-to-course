import './index.css';
import { Composition } from 'remotion';
import { LessonVideo } from './LessonVideo';
import type { LessonVideoPlan, LessonVideoProps } from './types';

// Load Google Fonts via @remotion/google-fonts
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

// Load fonts once at composition level
const { fontFamily: interFamily } = loadInter();
const { fontFamily: jetbrainsFamily } = loadJetBrainsMono();

// Inject font families into CSS custom properties
if (typeof document !== 'undefined') {
  document.documentElement.style.setProperty('--font-sans', interFamily);
  document.documentElement.style.setProperty('--font-mono', jetbrainsFamily);
}

const fps = 30;

const samplePlan: LessonVideoPlan = {
  lessonId: 'demo-1',
  title: 'Introduction to Python Programming',
  totalDurationSec: 20,
  slides: [
    {
      title: 'Welcome to Python',
      bullets: [
        'Learn the fundamentals of Python programming',
        'Build real-world applications',
        'Master data structures and algorithms',
        'Write clean, maintainable code',
      ],
      narration:
        'Welcome to this comprehensive Python course. We will cover everything from basics to advanced topics.',
    },
    {
      title: 'Core Concepts',
      bullets: [
        'Variables and data types',
        'Control flow statements',
        'Functions and modules',
        'Object-oriented programming',
      ],
      codeSnippet: `def greet(name: str) -> str:
    """Return a greeting message."""
    return f"Hello, {name}!"

# Usage
message = greet("World")
print(message)`,
      narration:
        'First, we will cover fundamental programming concepts including variables, control flow, and functions.',
    },
    {
      title: 'Next Steps',
      bullets: [
        'Complete the practice exercises',
        'Join our developer community',
        'Preview the next lesson',
        'Build your first project',
      ],
      narration:
        'Finally, practice the material, connect with peers, and start building your own projects.',
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
    audioSrc: '/demo/audio.mp3',
    // avatarSrc is optional - uncomment if you have a demo avatar video
    // avatarSrc: '/demo/avatar.mp4',
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
          Math.max(1, Math.round(props.plan.totalDurationSec * fps)) ||
          durationInFrames;
        return {
          durationInFrames: dynamicDuration,
          props,
        };
      }}
    />
  );
};
