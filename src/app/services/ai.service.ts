import { Injectable } from '@angular/core';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { environment } from 'src/environments/environment';
import { ApiService } from './api-service';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

export type AiChatContext = {
  uid?: string;
  idNegocio?: string;
  year?: number;
  month?: number;
};

export type AiChatResponse = {
  text: string;
  toolCalls?: Array<{ round?: number; name?: string; status?: string; [key: string]: any }>;
  mode?: 'agent' | 'chat' | string;
  [key: string]: any;
};

export class AiServiceError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryAfterSeconds?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'AiServiceError';
  }
}

const DEFAULT_AI_BASE = 'http://localhost:8080';

@Injectable({ providedIn: 'root' })
export class AiService {
  private readonly aiBaseUrl = (environment as any).aiServiceBaseUrl || DEFAULT_AI_BASE;

  constructor(private apiService: ApiService) {}

  private async resolveAuthToken(explicitToken?: string): Promise<string | undefined> {
    const inlineToken = explicitToken?.trim();
    if (inlineToken) return inlineToken;

    const storedToken = await this.apiService.getToken();
    return storedToken?.trim() || undefined;
  }

  private async resolveContext(context?: AiChatContext): Promise<AiChatContext | undefined> {
    const resolved: AiChatContext = { ...(context || {}) };

    if (!resolved.uid) {
      resolved.uid = (await this.apiService.getUid()) || undefined;
    }

    if (!resolved.idNegocio && resolved.uid) {
      try {
        const businesses = await this.apiService.getBusinessByUserId(resolved.uid);
        const firstBusiness = businesses?.[0];
        resolved.idNegocio = firstBusiness?.['idNegocio'] || firstBusiness?.['id'] || undefined;
      } catch {
        // If we cannot resolve business, do not block chat.
      }
    }

    const now = new Date();
    if (!resolved.year) resolved.year = now.getFullYear();
    if (!resolved.month) resolved.month = now.getMonth() + 1;

    const hasAnyValue = Object.values(resolved).some(
      (v) => v !== undefined && v !== null && String(v).trim() !== ''
    );

    return hasAnyValue ? resolved : undefined;
  }

  // Legacy streaming SSE endpoint (/ai/chat-stream). Does not run agent tools.
  async streamChat(
    messages: ChatMsg[],
    {
      system,
      onToken,
      onDone,
      onError,
      signal,
      authToken,
      context,
      forceClassicChat
    }: {
      system?: string;
      onToken: (t: string) => void;
      onDone?: () => void;
      onError?: (e: any) => void;
      signal?: AbortSignal;
      authToken?: string;
      context?: AiChatContext;
      forceClassicChat?: boolean;
    }
  ) {
    const token = await this.resolveAuthToken(authToken);
    const resolvedContext = await this.resolveContext(context);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return fetchEventSource(`${this.aiBaseUrl}/ai/chat-stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        system,
        context: resolvedContext,
        forceClassicChat
      }),
      signal,
      onmessage: (ev) => {
        if (ev.event === 'done') {
          onDone?.();
          return;
        }

        if (!ev.data) return;

        try {
          const { token: tokenChunk } = JSON.parse(ev.data);
          if (tokenChunk) onToken(tokenChunk);
        } catch {
          // Ignore malformed chunks.
        }
      },
      onerror: (err) => {
        onError?.(err);
        throw err;
      }
    });
  }

  // Main endpoint (/ai/chat) with agent mode and backend tools.
  async chatOnce(
    messages: ChatMsg[],
    opts?: {
      system?: string;
      authToken?: string;
      context?: AiChatContext;
      forceClassicChat?: boolean;
      signal?: AbortSignal;
    }
  ): Promise<AiChatResponse> {
    try {
      const token = await this.resolveAuthToken(opts?.authToken);
      const resolvedContext = await this.resolveContext(opts?.context);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${this.aiBaseUrl}/ai/chat`, {
        method: 'POST',
        headers,
        signal: opts?.signal,
        body: JSON.stringify({
          messages,
          system: opts?.system,
          context: resolvedContext,
          forceClassicChat: opts?.forceClassicChat
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new AiServiceError(
          data?.error || data?.message || `HTTP ${response.status}`,
          response.status,
          Number(data?.retry_after_seconds) || undefined,
          data?.details
        );
      }

      return data as AiChatResponse;
    } catch (error: any) {
      if (error?.name === 'AbortError' || error instanceof AiServiceError) {
        throw error;
      }

      throw new AiServiceError(
        'No se pudo conectar con el servicio de IA. Verifica red y servidor.',
        undefined
      );
    }
  }
}
