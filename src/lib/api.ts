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
  user_id: string;
  mentor_name: string;
  filename: string;
  status: string;
  stages_completed?: string[];
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
  user_id: string;
  mentor_name: string;
  filename: string;
  file_url: string;
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
    milestones: {
      timestamp: number;
      label: string;
      commentary: string;
    }[];
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

export async function getSessions(userId: string, mentorName?: string): Promise<Session[]> {
  const params = new URLSearchParams({ user_id: userId });
  if (mentorName) {
    params.set("mentor_name", mentorName);
  }
  const query = `?${params.toString()}`;
  const response = await fetchApi<{sessions: Session[]}>(`/api/sessions/list${query}`);
  return response.sessions;
}

export async function getSessionStatus(sessionId: string): Promise<{
  session_id: string;
  status: string;
  stages_completed: string[];
  data_points_scanned?: number;
  latency_ms?: number;
  node_load?: number;
  logs?: string[];
}> {
  return fetchApi(`/api/sessions/${sessionId}`);
}

export async function getResults(sessionId: string): Promise<SessionResults> {
  return fetchApi(`/api/results/${sessionId}`);
}

export async function uploadVideo(file: File, mentorName: string, userId: string): Promise<{ session_id: string }> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mentor_name", mentorName);
  formData.append("user_id", userId);

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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chatWithCoach(
  sessionId: string,
  message: string,
  history: ChatMessage[]
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, message, history }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Chat request failed");
  }
  const data = await response.json();
  return data.reply;
}

export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error("Failed to delete session");
  }
}

export function getExportUrl(sessionId: string): string {
  return `${API_BASE_URL}/api/export/${sessionId}`;
}
