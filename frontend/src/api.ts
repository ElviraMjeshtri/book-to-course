import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

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

