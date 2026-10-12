import { DefaultChatTransport } from 'ai';
import { Chat } from '@ai-sdk/angular';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ChatMessage } from './chat-message';

@Component({
  selector: 'app-root',
  imports: [
    ChatMessage,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly chat = new Chat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  /**
   * The Chat streams into one message object, mutating it in place, and hands
   * that same object back on every chunk. Copy the message being written so
   * each chunk reaches `ChatMessage` as a new value; the others keep their
   * reference and are not re-read.
   */
  readonly messages = computed(() => {
    const messages = this.chat.messages;
    return messages.map((message, i) =>
      i === messages.length - 1
        ? { ...message, parts: message.parts.map((part) => ({ ...part })) }
        : message,
    );
  });

  readonly busy = computed(
    () => this.chat.status === 'submitted' || this.chat.status === 'streaming',
  );
  readonly draft = signal('');

  /** `scripted` until the server says a real model is answering. */
  readonly mode = signal<'live' | 'scripted' | 'unknown'>('unknown');

  /** Prompts offered on an empty chat; the scripted model answers only the first. */
  readonly suggestions = computed(() =>
    this.mode() === 'live'
      ? [
          'Show me Q3 revenue by region',
          'A sign-up form for our beta, with validation',
          'Compare three hosting plans side by side',
        ]
      : ['Show me Q3 revenue by region'],
  );

  constructor() {
    fetch('/api/chat')
      .then(
        (response) => response.json() as Promise<{ mode: 'live' | 'scripted' }>,
      )
      .then(({ mode }) => this.mode.set(mode))
      .catch(() => this.mode.set('scripted'));
  }

  send(text = this.draft()): void {
    if (!text.trim() || this.busy()) return;
    this.draft.set('');
    void this.chat.sendMessage({ text });
  }
}
