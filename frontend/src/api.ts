import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export interface LessonOutline {
  id: string;
  title: string;
  summary: string;
  key_points: string[];
}

export interface CourseOutline {
  course_title: string;
  target_audience: string;
  lessons: LessonOutline[];
}

export interface UploadBookResponse {
  book_id: string;
  pages_processed: number;
  message: string;
}

export interface GenerateOutlineResponse {
  book_id: string;
  outline: CourseOutline;
}

export interface ScriptResponse {
  book_id: string;
  lesson_id: string;
  script: string;
  script_length: number;
}

export interface QuizOptions {
  [key: string]: string;
}

export interface QuizQuestion {
  question: string;
  options: QuizOptions;
  correct_answer: string;
  explanation: string;
}

export interface QuizResponse {
  book_id: string;
  lesson_id: string;
  questions: QuizQuestion[];
}

export interface GenerateVideoResponse {
  video_url: string;
  book_id: string;
  lesson_index: number;
}

export async function uploadBook(file: File): Promise<UploadBookResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<UploadBookResponse>("/books/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}

export async function generateOutline(bookId: string): Promise<GenerateOutlineResponse> {
  const response = await api.post<GenerateOutlineResponse>(
    `/books/${bookId}/outline`
  );
  return response.data;
}

export async function generateLessonScript(
  bookId: string,
  lessonId: string
): Promise<ScriptResponse> {
  const response = await api.post<ScriptResponse>(
    `/books/${bookId}/lessons/${lessonId}/script`
  );
  return response.data;
}

export async function generateLessonQuiz(
  bookId: string,
  lessonId: string
): Promise<QuizResponse> {
  const response = await api.post<QuizResponse>(
    `/books/${bookId}/lessons/${lessonId}/quiz`
  );
  return response.data;
}

export async function generateLessonVideo(
  bookId: string,
  lessonIndex: number
): Promise<GenerateVideoResponse> {
  const response = await api.post<GenerateVideoResponse>(
    `/books/${bookId}/lessons/${lessonIndex}/video`
  );
  return response.data;
}

