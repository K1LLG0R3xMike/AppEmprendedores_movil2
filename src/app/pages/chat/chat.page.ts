import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { 
  IonContent, 
  IonButton, 
  IonIcon, 
  IonInput
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  arrowBack,
  hardwareChip,
  person,
  attach,
  mic,
  send
} from 'ionicons/icons';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
}

@Component({
  selector: 'app-chat',
  templateUrl: './chat.page.html',
  styleUrls: ['./chat.page.scss'],
  standalone: true,
  imports: [
    IonContent, 
    IonButton, 
    IonIcon, 
    IonInput,
    CommonModule, 
    FormsModule
  ]
})
export class ChatPage implements OnInit, AfterViewChecked {
  @ViewChild('messagesContainer', { static: false }) messagesContainer!: ElementRef;

  messages: Message[] = [
    {
      id: 1,
      type: 'ai',
      content: '¡Hola! Soy tu asistente financiero IA. ¿En qué puedo ayudarte hoy?',
      timestamp: '10:30'
    },
    {
      id: 2,
      type: 'user',
      content: '¿Cómo están mis ventas este mes?',
      timestamp: '10:31'
    },
    {
      id: 3,
      type: 'ai',
      content: 'Tus ventas van muy bien este mes. Has generado $12,450 en ingresos, lo que representa un aumento del 15% comparado con el mes anterior. Tu producto más vendido ha sido la Camiseta Básica con 45 unidades vendidas.',
      timestamp: '10:31'
    }
  ];

  newMessage: string = '';
  private shouldScrollToBottom = false;

  constructor(private router: Router) {
    addIcons({ 
      arrowBack,
      hardwareChip,
      person,
      attach,
      mic,
      send
    });
  }

  ngOnInit() {
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  isDarkMode(): boolean {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  goBack(): void {
    this.router.navigate(['/tabs/ia-panel']);
  }

  trackByMessageId(index: number, message: Message): number {
    return message.id;
  }

  canSendMessage(): boolean {
    return this.newMessage.trim().length > 0;
  }

  handleSendMessage(): void {
    if (!this.canSendMessage()) {
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: this.messages.length + 1,
      type: 'user',
      content: this.newMessage.trim(),
      timestamp: this.getCurrentTime()
    };

    this.messages.push(userMessage);
    this.newMessage = '';
    this.shouldScrollToBottom = true;

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: this.messages.length + 1,
        type: 'ai',
        content: 'Gracias por tu pregunta. Estoy analizando la información y te daré una respuesta detallada en un momento.',
        timestamp: this.getCurrentTime()
      };

      this.messages.push(aiMessage);
      this.shouldScrollToBottom = true;
    }, 1000);
  }

  private getCurrentTime(): string {
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        const element = this.messagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}
