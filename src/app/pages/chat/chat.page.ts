import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AiService, ChatMsg } from 'src/app/services/ai.service';

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

  constructor(private ai: AiService) {}

  async send() {
    const value = this.text.trim();
    if (!value) return;
    this.text = '';

    this.messages.push({ role: 'user', content: value });
    this.messages.push({ role: 'assistant', content: '' });
    const idx = this.messages.length - 1;

    this.loading = true;
    this.abortCtrl = new AbortController();

    try {
      await this.ai.streamChat(this.messages, {
        onToken: (t) => (this.messages[idx].content += t),
        onDone: () => (this.loading = false),
        onError: () => (this.loading = false),
        signal: this.abortCtrl.signal,
      });
    } catch {
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

  ngOnDestroy(): void {
    this.stop();
  }
}
