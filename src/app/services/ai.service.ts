import { Injectable } from '@angular/core';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

const API_BASE = 'http://localhost:8080'; // cambia por tu dominio en prod

@Injectable({ providedIn: 'root' })
export class AiService {
  // Streaming SSE
  streamChat(
    messages: ChatMsg[],
    {
      system,
      onToken,
      onDone,
      onError,
      signal,
      authToken
    }: {
      system?: string;
      onToken: (t: string) => void;
      onDone?: () => void;
      onError?: (e: any) => void;
      signal?: AbortSignal;
      authToken?: string; // opcional si luego usas Firebase Auth
    }
  ) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    return fetchEventSource(`${API_BASE}/ai/chat-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, system }),
      signal,
      onmessage: (ev) => {
        if (ev.event === 'done') { onDone?.(); return; }
        if (!ev.data) return;
        try {
          const { token } = JSON.parse(ev.data);
          if (token) onToken(token);
        } catch {}
      },
      onerror: (err) => {
        onError?.(err);
        throw err;
      }
    });
  }

  // Endpoint no-stream (útil para depurar en Postman)
  async chatOnce(messages: ChatMsg[], system?: string, authToken?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const r = await fetch(`${API_BASE}/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages, system })
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json() as Promise<{ text: string }>;
  }
}
