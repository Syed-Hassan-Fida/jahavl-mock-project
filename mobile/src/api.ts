import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

export const API_URL = "https://jahavl.hivelyhr.com";
export const WEB_URL = "https://jahavl.hivelyhr.com";

export function media(path?: string | null) {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${WEB_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export type LiveEvent = {
  id: number;
  name: string;
  payload: {
    message?: { id: number; body: string; sender_id: number; recipient_id: number };
    ticket?: { id: number; subject: string; status: string };
    event?: { id: number; body: string; author: string };
    notification?: { id: number; title: string; body: string; read_at?: string | null };
  };
};

const listeners = new Set<(event: LiveEvent) => void>();
let cursor = 0;
let polling = false;

export function onLive(listener: (event: LiveEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function startLivePolling() {
  if (polling) return () => undefined;
  polling = true;
  let stopped = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  api<{ events: LiveEvent[] }>("/api/v1/live/events?after=0")
    .then((body) => {
      if (stopped) return;
      cursor = body.events.at(-1)?.id ?? 0;
      timer = setInterval(() => {
        api<{ events: LiveEvent[] }>(`/api/v1/live/events?after=${cursor}`)
          .then((next) => {
            for (const event of next.events) {
              if (event.id <= cursor) continue;
              cursor = event.id;
              listeners.forEach((listener) => listener(event));
            }
          })
          .catch(() => undefined);
      }, 1500);
    })
    .catch(() => undefined);
  return () => {
    stopped = true;
    polling = false;
    if (timer) clearInterval(timer);
  };
}

export function idempotencyKey() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

let token = "";

export function setToken(value: string) {
  token = value;
}

export function getToken() {
  return token;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, { ...init, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const errors = body.errors as Record<string, string[]> | undefined;
    throw new Error(body.message || errors?.[Object.keys(errors)[0]]?.[0] || "Request failed");
  }
  return body as T;
}

export type Upload = { uri: string; name: string; type: string };

export function formBody(fields: Record<string, string>, file?: Upload) {
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== "") body.append(key, value);
  });
  if (file) {
    body.append("file", { uri: file.uri, name: file.name, type: file.type } as unknown as Blob);
  }
  return body;
}

export async function openPdf(id: number) {
  const response = await fetch(`${API_URL}/api/v1/quotes/${id}/pdf`, {
    headers: { Accept: "application/pdf", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (!response.ok) throw new Error("The PDF was not created.");
  const file = new File(Paths.cache, `jah-quote-${id}.pdf`);
  file.write(new Uint8Array(await response.arrayBuffer()));
  if (!(await Sharing.isAvailableAsync())) throw new Error("This device cannot open the PDF.");
  await Sharing.shareAsync(file.uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Quote PDF" });
}

export function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}
