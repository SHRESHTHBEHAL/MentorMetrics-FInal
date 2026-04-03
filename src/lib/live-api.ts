const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export interface CoachingTip {
  text: string;
  category: "pace" | "clarity" | "energy" | "posture" | "engagement";
  timestamp: string;
}

export interface LiveSessionStatus {
  session_id: string;
  status: string;
  coaching_tips: CoachingTip[];
  started_at: string;
  chunk_count: number;
}

export async function startLiveSession(): Promise<{ session_id: string; status: string; message: string }> {
  const response = await fetch(`${API_BASE_URL}/api/live/start`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Failed to start live session");
  }
  return response.json();
}

export async function uploadAudioChunk(
  sessionId: string,
  chunk: Blob,
  chunkIndex: number
): Promise<{ status: string; chunk_index: number; transcript_length: number }> {
  const formData = new FormData();
  formData.append("file", chunk, `chunk_${chunkIndex}.webm`);
  formData.append("chunk_index", String(chunkIndex));

  const response = await fetch(`${API_BASE_URL}/api/live/segment/${sessionId}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload audio chunk");
  }
  return response.json();
}

export function subscribeToCoachingTips(
  sessionId: string,
  onTip: (tip: CoachingTip) => void,
  onConnected?: () => void,
  onEnded?: () => void
): EventSource {
  const eventSource = new EventSource(`${API_BASE_URL}/api/live/stream/${sessionId}`);

  eventSource.addEventListener("connected", (event) => {
    console.log("SSE Connected:", event);
    onConnected?.();
  });

  eventSource.addEventListener("coaching_tip", (event) => {
    try {
      const tip = JSON.parse(event.data) as CoachingTip;
      onTip(tip);
    } catch (e) {
      console.error("Failed to parse coaching tip:", e);
    }
  });

  eventSource.addEventListener("session_ended", (event) => {
    console.log("Session ended:", event);
    onEnded?.();
    eventSource.close();
  });

  eventSource.addEventListener("heartbeat", () => {
    // Connection is alive
  });

  eventSource.onerror = (error) => {
    console.error("SSE Error:", error);
    eventSource.close();
  };

  return eventSource;
}

export async function stopLiveSession(sessionId: string): Promise<{
  session_id: string;
  status: string;
  duration_seconds: number;
  total_tips: number;
  category_breakdown: Record<string, number>;
  transcript_preview: string;
}> {
  const response = await fetch(`${API_BASE_URL}/api/live/stop/${sessionId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to stop live session");
  }
  return response.json();
}

export async function getLiveSessionStatus(sessionId: string): Promise<LiveSessionStatus> {
  const response = await fetch(`${API_BASE_URL}/api/live/status/${sessionId}`);

  if (!response.ok) {
    throw new Error("Failed to get session status");
  }
  return response.json();
}
