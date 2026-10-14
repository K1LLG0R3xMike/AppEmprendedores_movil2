import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

// Convierte el markdown de la IA a HTML. Se usa con [innerHTML], que Angular sanitiza
// (elimina scripts, handlers on* y URLs peligrosas), asi que no se marca como confiable.
@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';
    return marked.parse(value, { async: false, gfm: true, breaks: true });
  }
}
