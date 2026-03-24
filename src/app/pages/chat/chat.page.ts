import { Component, OnDestroy } from '@angular/core';
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
  standalone: true,  // 👈 habilita standalone
  imports: [
    CommonModule,   // 👈 para *ngIf, *ngFor
    FormsModule,    // 👈 para [(ngModel)]
    IonicModule     // 👈 para <ion-...>
  ]
})
export class ChatPage implements OnDestroy {
  messages: ChatMsg[] = [];
  text = '';
  loading = false;
  private abortCtrl?: AbortController;

  constructor(private ai: AiService) {
    addIcons({ sparkles, person, send, stop, refresh });
  }

  async send() {
    const value = this.text.trim();
    if (!value) return;
    this.text = '';

    this.messages.push({ role: 'user', content: value });
    this.messages.push({ role: 'assistant', content: 'Pensando...' });
    const idx = this.messages.length - 1;

    // Scroll to bottom after adding messages
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

      this.messages[idx].content = response?.text || 'No se recibió respuesta del asistente.';
      this.scrollToBottom();
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        this.messages[idx].content = 'Respuesta detenida.';
      } else if (error instanceof AiServiceError) {
        if (error.status === 429 && error.retryAfterSeconds) {
          this.messages[idx].content = `IA saturada por cuota. Intenta de nuevo en ${error.retryAfterSeconds} segundos.`;
        } else if (error.status === 401 || error.status === 403) {
          this.messages[idx].content = 'Tu sesión expiró o no tiene permisos. Inicia sesión de nuevo.';
        } else if (error.status === 400) {
          this.messages[idx].content = `Solicitud inválida: ${error.message}`;
        } else {
          this.messages[idx].content = error.message || 'No se pudo completar la consulta con IA.';
        }
      } else {
        this.messages[idx].content = error?.message || 'No se pudo completar la consulta con IA.';
      }
    } finally {
      this.loading = false;
    }
  }

  stop() {
    this.abortCtrl?.abort();
    this.loading = false;
  }

  reset() {
    this.messages = [];
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

  ngOnDestroy(): void {
    this.stop();
  }
}
