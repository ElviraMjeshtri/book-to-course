export interface Slide {
  title: string;
  bullets: string[];
  codeSnippet?: string;
  narration: string;
  visualHint?: string; // Description of diagram/visual to show
  imagePath?: string; // Path to image from book
}

export interface SlideTiming {
  slideIndex: number;
  startSec: number;
  endSec: number;
}

export interface LessonVideoPlan {
  lessonId: string;
  title: string;
  slides: Slide[];
  totalDurationSec: number;
  slideTimings: SlideTiming[];
}

export interface LessonVideoProps extends Record<string, unknown> {
  plan: LessonVideoPlan;
  audioSrc: string;
  avatarSrc?: string;
}
