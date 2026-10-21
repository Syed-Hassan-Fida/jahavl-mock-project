import { API_URL } from "@/lib/api";

export const LIVE_URL = process.env.NEXT_PUBLIC_LIVE_URL ?? "http://127.0.0.1:8002";

export type LiveEvent = {
  id: number;
  name: "message" | "ticket" | "notification" | string;
  payload: {
    message?: { id: number; body: string; sender_id: number; recipient_id: number; created_at?: string; has_attachment?: boolean; attachment?: { name: string; bytes?: number | null } | null };
    ticket?: { id: number; subject: string; status: string };
    event?: { id: number; body: string; author: string; status?: string };
    notification?: { id: number; title: string; body: string; read_at: string | null };
  };
};

const CURSOR = "jah_live_cursor";
let subscribers = 0;
let stopStream: (() => void) | null = null;

export function idempotencyKey(): string {
  return crypto.randomUUID();
}

export function startLive(): () => void {
  subscribers += 1;
  if (!stopStream) {
    stopStream = connect();
  }
  return () => {
    subscribers -= 1;
    if (subscribers <= 0) {
      stopStream?.();
      stopStream = null;
      subscribers = 0;
    }
  };
}

function connect(): () => void {
  let stopped = false;
  const run = async () => {
    let after = await cursor();
    while (!stopped) {
      const token = localStorage.getItem("jah_token");
      if (!token) return;
      try {
        const response = await fetch(`${LIVE_URL}/api/v1/live?after=${after}`, {
          headers: { Accept: "text/event-stream", Authorization: `Bearer ${token}` },
        });
        if (!response.ok || !response.body) throw new Error("live unavailable");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!stopped) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const frames = buffer.split("\n\n");
          buffer = frames.pop() ?? "";
          for (const frame of frames) {
            const id = frame.match(/^id: (\d+)/m)?.[1];
            const data = frame.match(/^data: (.*)$/m)?.[1];
            if (!id || !data) continue;
            after = Number(id);
            sessionStorage.setItem(CURSOR, String(after));
            const event = JSON.parse(data) as LiveEvent;
            window.dispatchEvent(new CustomEvent("jah-live", { detail: event }));
          }
        }
      } catch {
        if (!stopped) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  };
  run();
  return () => {
    stopped = true;
  };
}

async function cursor(): Promise<number> {
  const saved = sessionStorage.getItem(CURSOR);
  if (saved) return Number(saved);
  const token = localStorage.getItem("jah_token");
  if (!token) return 0;
  const response = await fetch(`${API_URL}/api/v1/live/events?after=0`, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return 0;
  const body = (await response.json()) as { events: { id: number }[] };
  const last = body.events.at(-1)?.id ?? 0;
  sessionStorage.setItem(CURSOR, String(last));
  return last;
}
