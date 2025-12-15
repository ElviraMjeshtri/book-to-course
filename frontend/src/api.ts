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

export interface ModelInfo {
  name: string;
  description: string;
  cost: string;
  speed: string;
}

export interface ProviderModels {
  name: string;
  has_api_key: boolean;
  models: Record<string, ModelInfo>;
}

export interface AvailableModelsResponse {
  [provider: string]: ProviderModels;
}

export interface CurrentConfigResponse {
  provider: string;
  model: string;
  model_info: ModelInfo;
  has_api_key: boolean;
}

export interface UpdateConfigRequest {
  provider: string;
  model: string;
  api_key?: string;
}

export interface UpdateConfigResponse {
  success: boolean;
  message: string;
  config: CurrentConfigResponse;
}

export interface TestConnectionResponse {
  success: boolean;
  message: string;
  response?: string;
  provider: string;
  model: string;
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

// ============================================================================
// Configuration API
// ============================================================================

export async function getAvailableModels(): Promise<AvailableModelsResponse> {
  const response = await api.get<AvailableModelsResponse>("/config/models");
  return response.data;
}

export async function getCurrentConfig(): Promise<CurrentConfigResponse> {
  const response = await api.get<CurrentConfigResponse>("/config/current");
  return response.data;
}

export async function updateModelConfig(
  request: UpdateConfigRequest
): Promise<UpdateConfigResponse> {
  const response = await api.post<UpdateConfigResponse>("/config/model", request);
  return response.data;
}

export async function testConnection(): Promise<TestConnectionResponse> {
  const response = await api.post<TestConnectionResponse>("/config/test");
  return response.data;
}

// ============================================================================
// TTS Configuration API
// ============================================================================

export interface TTSModelInfo {
  name: string;
  description: string;
}

export interface TTSProviderInfo {
  name: string;
  description: string;
  cost: string;
  models: Record<string, TTSModelInfo>;
  voices: Record<string, string>;
  has_api_key: boolean;
}

export interface AvailableTTSResponse {
  [provider: string]: TTSProviderInfo;
}

export interface CurrentTTSConfigResponse {
  provider: string;
  model: string;
  voice: string;
  provider_info: {
    name: string;
    description: string;
  };
  has_api_key: boolean;
}

export interface UpdateTTSConfigRequest {
  provider: string;
  model: string;
  voice: string;
  api_key?: string;
}

export interface UpdateTTSConfigResponse {
  success: boolean;
  message: string;
  config: CurrentTTSConfigResponse;
}

export interface TestTTSConnectionResponse {
  success: boolean;
  message: string;
  provider: string;
  model: string;
  voice: string;
}

export async function getAvailableTTS(): Promise<AvailableTTSResponse> {
  const response = await api.get<AvailableTTSResponse>("/config/tts");
  return response.data;
}

export async function getCurrentTTSConfig(): Promise<CurrentTTSConfigResponse> {
  const response = await api.get<CurrentTTSConfigResponse>("/config/tts/current");
  return response.data;
}

export async function updateTTSConfig(
  request: UpdateTTSConfigRequest
): Promise<UpdateTTSConfigResponse> {
  const response = await api.post<UpdateTTSConfigResponse>("/config/tts", request);
  return response.data;
}

export async function testTTSConnection(): Promise<TestTTSConnectionResponse> {
  const response = await api.post<TestTTSConnectionResponse>("/config/tts/test");
  return response.data;
}
