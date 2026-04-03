const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export interface Session {
  id: string;
  filename: string;
  status: string;
  created_at: string;
  mentor_score?: number;
  file_url: string;
}

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface SessionResults {
  session_id: string;
  status: string;
  filename: string;
  scores?: {
    engagement: number;
    communication_clarity: number;
    technical_correctness: number;
    pacing_structure: number;
    interactive_quality: number;
    mentor_score: number;
  };
  report?: {
    summary: string;
    strengths: string[];
    improvements: string[];
    actionable_tips: string[];
  };
  transcript?: {
    text: string;
    segments: TranscriptSegment[];
  };
  audio?: {
    wpm: number;
    silence_ratio: number;
    clarity_score: number;
  };
  visual?: {
    face_visibility_score: number;
    gaze_forward_score: number;
    gesture_score: number;
  };
}

export async function getSessions(): Promise<Session[]> {
  return fetchApi<Session[]>("/api/sessions/list");
}

export async function getSessionStatus(sessionId: string): Promise<any> {
  return fetchApi(`/api/sessions/${sessionId}`);
}

export async function getResults(sessionId: string): Promise<SessionResults> {
  return fetchApi(`/api/results/${sessionId}`);
}

export async function uploadVideo(file: File): Promise<{ session_id: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}

export async function startProcessing(sessionId: string): Promise<void> {
  await fetchApi(`/api/process/${sessionId}`, { method: "POST" });
}
