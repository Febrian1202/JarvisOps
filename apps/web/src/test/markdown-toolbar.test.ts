import { describe, it, expect } from 'vitest';
import {
  toggleInlineWrap,
  toggleLinePrefix,
  applyHeading,
  toggleOrderedList,
  insertLink,
  type EditorState,
} from '@/lib/markdown-toolbar';

function state(value: string, selectionStart: number, selectionEnd: number): EditorState {
  return { value, selectionStart, selectionEnd };
}

describe('toggleInlineWrap', () => {
  it('wraps the current selection with the marker and selects the inner text', () => {
    const result = toggleInlineWrap(state('halo dunia', 0, 4), '**');
    expect(result.value).toBe('**halo** dunia');
    expect(result.selectionStart).toBe(2);
    expect(result.selectionEnd).toBe(6);
  });

  it('inserts a placeholder and selects it when there is no selection', () => {
    const result = toggleInlineWrap(state('ab', 1, 1), '**', 'teks');
    expect(result.value).toBe('a**teks**b');
    expect(result.selectionStart).toBe(3);
    expect(result.selectionEnd).toBe(7);
  });

  it('unwraps when the selection already includes the markers (toggle off)', () => {
    const result = toggleInlineWrap(state('**halo** dunia', 0, 8), '**');
    expect(result.value).toBe('halo dunia');
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(4);
  });

  it('works with single-character markers such as italic and inline code', () => {
    expect(toggleInlineWrap(state('hai', 0, 3), '*').value).toBe('*hai*');
    expect(toggleInlineWrap(state('code', 0, 4), '`').value).toBe('`code`');
  });
});

describe('applyHeading', () => {
  it('prefixes a plain line with the heading marker and selects the line', () => {
    const result = applyHeading(state('Judul', 0, 0), 2);
    expect(result.value).toBe('## Judul');
    expect(result.selectionStart).toBe(0);
    expect(result.selectionEnd).toBe(8);
  });

  it('removes the marker when the line already has the same level (toggle off)', () => {
    expect(applyHeading(state('## Judul', 0, 0), 2).value).toBe('Judul');
  });

  it('switches from one heading level to another', () => {
    expect(applyHeading(state('# Judul', 0, 0), 2).value).toBe('## Judul');
  });
});

describe('toggleLinePrefix', () => {
  it('adds an unordered list marker to each selected line', () => {
    expect(toggleLinePrefix(state('a\nb', 0, 3), '- ').value).toBe('- a\n- b');
  });

  it('removes the marker when every selected line already has it', () => {
    expect(toggleLinePrefix(state('- a\n- b', 0, 7), '- ').value).toBe('a\nb');
  });

  it('adds a blockquote marker to a single line', () => {
    expect(toggleLinePrefix(state('kutipan', 0, 0), '> ').value).toBe('> kutipan');
  });
});

describe('toggleOrderedList', () => {
  it('numbers each selected line sequentially', () => {
    expect(toggleOrderedList(state('a\nb\nc', 0, 5)).value).toBe('1. a\n2. b\n3. c');
  });

  it('removes numbering when every selected line is already ordered', () => {
    expect(toggleOrderedList(state('1. a\n2. b', 0, 9)).value).toBe('a\nb');
  });
});

describe('insertLink', () => {
  it('wraps the selection as link text and places the cursor in the url', () => {
    const result = insertLink(state('halo', 0, 4));
    expect(result.value).toBe('[halo](url)');
    expect(result.selectionStart).toBe(7);
    expect(result.selectionEnd).toBe(10);
  });

  it('inserts placeholder link text when there is no selection', () => {
    const result = insertLink(state('', 0, 0), 'teks tautan');
    expect(result.value).toBe('[teks tautan](url)');
    expect(result.selectionStart).toBe(14);
    expect(result.selectionEnd).toBe(17);
  });
});
