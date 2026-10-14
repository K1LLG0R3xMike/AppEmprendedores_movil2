import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonicModule, IonContent, ToastController } from '@ionic/angular';
import { AiService, AiServiceError, ChatMsg } from 'src/app/services/ai.service';
import { addIcons } from 'ionicons';
import { sparkles, send, stop, add, chevronBack, copyOutline, checkmark } from 'ionicons/icons';
import { MarkdownPipe } from './markdown.pipe';

interface Sugerencia {
  icono: string;
  texto: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MarkdownPipe]
})
export class ChatPage implements OnInit, OnDestroy {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('input') input?: ElementRef<HTMLTextAreaElement>;

  messages: ChatMsg[] = [];
  text = '';
  loading = false;
  copiedIndex: number | null = null;

  readonly sugerencias: Sugerencia[] = [
    { icono: '📈', texto: '¿Cómo va mi rentabilidad este mes?' },
    { icono: '📦', texto: '¿Qué producto me deja más margen?' },
    { icono: '💸', texto: '¿Cómo puedo reducir mis gastos fijos?' },
    { icono: '🔮', texto: 'Proyecta mis ventas del próximo mes' }
  ];

  private abortCtrl?: AbortController;
  private readonly storageKey = 'ia_chat_history_v1';

  constructor(
    private ai: AiService,
    private router: Router,
    private toastController: ToastController
  ) {
    addIcons({ sparkles, send, stop, add, chevronBack, copyOutline, checkmark });
  }

  ngOnInit(): void {
    this.loadMessagesFromLocalStorage();
  }

  // "Más detalles" en el panel de IA abre el chat con una pregunta ya preparada
  ionViewWillEnter(): void {
    const pregunta = history.state?.pregunta;
    if (typeof pregunta === 'string' && pregunta.trim() && !this.loading) {
      history.replaceState({ ...history.state, pregunta: undefined }, '');
      void this.send(pregunta);
      return;
    }
    this.scrollToBottom(0);
  }

  async send(texto?: string): Promise<void> {
    const value = (texto ?? this.text).trim();
    if (!value || this.loading) return;

    this.text = '';
    this.resizeInput();
    this.messages.push({ role: 'user', content: value, time: new Date().toISOString() });
    this.saveMessagesToLocalStorage();
    this.scrollToBottom();

    this.loading = true;
    this.abortCtrl = new AbortController();

    try {
      const response = await this.ai.chatOnce(this.messages, { signal: this.abortCtrl.signal });
      this.pushAssistant(response?.text || 'No se recibió respuesta del asistente.');
    } catch (error: any) {
      this.pushAssistant(this.errorMessage(error), true);
    } finally {
      this.loading = false;
      this.abortCtrl = undefined;
      this.scrollToBottom();
    }
  }

  stop(): void {
    this.abortCtrl?.abort();
  }

  newConversation(): void {
    this.stop();
    this.messages = [];
    this.clearMessagesFromLocalStorage();
  }

  goBack(): void {
    this.router.navigate(['tabs/ia-panel']);
  }

  // Enter envia; Shift+Enter hace salto de linea
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      void this.send();
    }
  }

  // La caja de texto crece con el contenido (hasta el maximo definido en CSS)
  resizeInput(): void {
    const el = this.input?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    if (this.text) {
      el.style.height = `${el.scrollHeight}px`;
    }
  }

  async copy(message: ChatMsg, index: number): Promise<void> {
    try {
      await this.writeClipboard(message.content);
      this.copiedIndex = index;
      setTimeout(() => {
        if (this.copiedIndex === index) this.copiedIndex = null;
      }, 1500);
    } catch {
      const toast = await this.toastController.create({ message: 'No se pudo copiar', duration: 2000, color: 'danger', position: 'top' });
      await toast.present();
    }
  }

  // navigator.clipboard solo existe en contextos seguros (https / localhost); al abrir la app
  // desde el celular por la IP del PC (http) se usa el metodo clasico con un textarea temporal
  private async writeClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return;
      } catch {
        // sin permiso o sin foco: se intenta el metodo clasico
      }
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (!ok) throw new Error('copy failed');
  }

  formatTime(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  }

  trackByIndex(index: number): number {
    return index;
  }

  private pushAssistant(content: string, error = false): void {
    this.messages.push({ role: 'assistant', content, time: new Date().toISOString(), ...(error ? { error: true } : {}) });
    this.saveMessagesToLocalStorage();
  }

  private errorMessage(error: any): string {
    if (error?.name === 'AbortError') return 'Respuesta detenida.';
    if (error instanceof AiServiceError) {
      if (error.status === 429 && error.retryAfterSeconds) {
        return `La IA está saturada. Intenta de nuevo en ${error.retryAfterSeconds} segundos.`;
      }
      if (error.status === 401 || error.status === 403) return 'Tu sesión expiró o no tiene permisos. Inicia sesión de nuevo.';
      if (error.status === 400) return `Solicitud inválida: ${error.message}`;
      return error.message || 'No se pudo completar la consulta con la IA.';
    }
    return error?.message || 'No se pudo completar la consulta con la IA.';
  }

  private scrollToBottom(duration = 300): void {
    setTimeout(() => void this.content?.scrollToBottom(duration), 50);
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

      this.messages = parsed
        .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant'))
        .map((m: any) => ({
          role: m.role,
          content: String(m.content || ''),
          ...(typeof m.time === 'string' ? { time: m.time } : {}),
          ...(m.error ? { error: true } : {})
        }))
        // El historial antiguo guardaba un "Pensando..." temporal
        .filter((m: ChatMsg) => m.content.trim().length > 0 && m.content !== 'Pensando...');
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
