import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AiService, AiServiceError, ChatMsg } from 'src/app/services/ai.service';
import { addIcons } from 'ionicons';
import { sparkles, person, send, stop, refresh } from 'ionicons/icons';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class ChatPage implements OnInit, OnDestroy {
  messages: ChatMsg[] = [];
  text = '';
  loading = false;
  private abortCtrl?: AbortController;
  private readonly storageKey = 'ia_chat_history_v1';

  constructor(private ai: AiService) {
    addIcons({ sparkles, person, send, stop, refresh });
  }

  ngOnInit(): void {
    this.loadMessagesFromLocalStorage();
  }

  async send(): Promise<void> {
    const value = this.text.trim();
    if (!value) return;
    this.text = '';

    this.messages.push({ role: 'user', content: value });
    this.messages.push({ role: 'assistant', content: 'Pensando...' });
    const idx = this.messages.length - 1;
    this.saveMessagesToLocalStorage();

    setTimeout(() => this.scrollToBottom(), 100);

    this.loading = true;
    this.abortCtrl = new AbortController();

    try {
      const requestMessages = this.messages
        .slice(0, idx)
        .filter((m) => m.content && m.content.trim().length > 0);

      const response = await this.ai.chatOnce(requestMessages, {
        signal: this.abortCtrl.signal
      });

      this.messages[idx].content = response?.text || 'No se recibio respuesta del asistente.';
      this.saveMessagesToLocalStorage();
      this.scrollToBottom();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.messages[idx].content = 'Respuesta detenida.';
      } else if (error instanceof AiServiceError) {
        if (error.status === 429 && error.retryAfterSeconds) {
          this.messages[idx].content = `IA saturada por cuota. Intenta de nuevo en ${error.retryAfterSeconds} segundos.`;
        } else if (error.status === 401 || error.status === 403) {
          this.messages[idx].content = 'Tu sesion expiro o no tiene permisos. Inicia sesion de nuevo.';
        } else if (error.status === 400) {
          this.messages[idx].content = `Solicitud invalida: ${error.message}`;
        } else {
          this.messages[idx].content = error.message || 'No se pudo completar la consulta con IA.';
        }
      } else {
        this.messages[idx].content = error?.message || 'No se pudo completar la consulta con IA.';
      }

      this.saveMessagesToLocalStorage();
    } finally {
      this.loading = false;
    }
  }

  stop(): void {
    this.abortCtrl?.abort();
    this.loading = false;
  }

  reset(): void {
    this.messages = [];
    this.clearMessagesFromLocalStorage();
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 50);
  }

  private saveMessagesToLocalStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.messages));
    } catch (error) {
      console.warn('[CHAT] No se pudo guardar historial en localStorage:', error);
    }
  }

  private loadMessagesFromLocalStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;

      const validMessages: ChatMsg[] = parsed
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m: any) => ({
          role: m.role,
          content: String(m.content || '')
        }))
        .filter((m: ChatMsg) => m.content.trim().length > 0);

      this.messages = validMessages;
    } catch (error) {
      console.warn('[CHAT] No se pudo leer historial desde localStorage:', error);
      this.messages = [];
    }
  }

  private clearMessagesFromLocalStorage(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.warn('[CHAT] No se pudo limpiar historial en localStorage:', error);
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
