'use client';

import * as React from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { cn } from '@/lib/utils';
import {
  applyHeading,
  insertLink,
  toggleInlineWrap,
  toggleLinePrefix,
  toggleOrderedList,
  type EditorState,
} from '@/lib/markdown-toolbar';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  rows?: number;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
}

interface ToolbarCommand {
  key: string;
  label: string;
  icon: LucideIcon;
  run: (state: EditorState) => EditorState;
  shortcut?: string;
}

const COMMAND_GROUPS: ToolbarCommand[][] = [
  [
    { key: 'bold', label: 'Tebal', icon: Bold, run: (s) => toggleInlineWrap(s, '**'), shortcut: 'Ctrl+B' },
    { key: 'italic', label: 'Miring', icon: Italic, run: (s) => toggleInlineWrap(s, '*'), shortcut: 'Ctrl+I' },
    { key: 'strike', label: 'Coret', icon: Strikethrough, run: (s) => toggleInlineWrap(s, '~~') },
    { key: 'code', label: 'Kode', icon: Code, run: (s) => toggleInlineWrap(s, '`', 'kode') },
  ],
  [
    { key: 'h1', label: 'Tajuk 1', icon: Heading1, run: (s) => applyHeading(s, 1) },
    { key: 'h2', label: 'Tajuk 2', icon: Heading2, run: (s) => applyHeading(s, 2) },
    { key: 'h3', label: 'Tajuk 3', icon: Heading3, run: (s) => applyHeading(s, 3) },
  ],
  [
    { key: 'ul', label: 'Daftar poin', icon: List, run: (s) => toggleLinePrefix(s, '- ') },
    { key: 'ol', label: 'Daftar berurutan', icon: ListOrdered, run: (s) => toggleOrderedList(s) },
    { key: 'quote', label: 'Kutipan', icon: Quote, run: (s) => toggleLinePrefix(s, '> ') },
    { key: 'link', label: 'Tautan', icon: LinkIcon, run: (s) => insertLink(s) },
  ],
];

export const MarkdownEditor = React.forwardRef<HTMLTextAreaElement, MarkdownEditorProps>(
  function MarkdownEditor(
    { value, onChange, id, name, onBlur, placeholder, rows = 14, ...aria },
    forwardedRef
  ) {
    const invalid = aria['aria-invalid'] ?? false;
    const innerRef = React.useRef<HTMLTextAreaElement | null>(null);
    const pendingSelection = React.useRef<[number, number] | null>(null);
    const [tab, setTab] = React.useState<'write' | 'preview'>('write');

    const setRef = React.useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof forwardedRef === 'function') forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
      },
      [forwardedRef]
    );

    // After a toolbar transform re-renders the controlled textarea, the caret
    // jumps to the end — restore the intended selection so editing feels native.
    React.useLayoutEffect(() => {
      const el = innerRef.current;
      if (!pendingSelection.current || !el) return;
      const [start, end] = pendingSelection.current;
      pendingSelection.current = null;
      el.focus();
      el.setSelectionRange(start, end);
    });

    const runCommand = React.useCallback(
      (command: ToolbarCommand) => {
        const el = innerRef.current;
        const next = command.run({
          value,
          selectionStart: el?.selectionStart ?? value.length,
          selectionEnd: el?.selectionEnd ?? value.length,
        });
        pendingSelection.current = [next.selectionStart, next.selectionEnd];
        onChange(next.value);
      },
      [value, onChange]
    );

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
        const key = event.key.toLowerCase();
        if (key === 'b') {
          event.preventDefault();
          runCommand(COMMAND_GROUPS[0][0]);
        } else if (key === 'i') {
          event.preventDefault();
          runCommand(COMMAND_GROUPS[0][1]);
        }
      },
      [runCommand]
    );

    const inPreview = tab === 'preview';

    return (
      <div
        data-slot="markdown-editor"
        className={cn(
          'overflow-hidden rounded-lg border bg-card shadow-sm transition-colors',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
          invalid ? 'border-destructive focus-within:ring-destructive/30' : 'border-input'
        )}
      >
        <Tabs value={tab} onValueChange={(next) => setTab(next as 'write' | 'preview')}>
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-2 py-1.5">
            <div
              role="toolbar"
              aria-label="Format markdown"
              aria-controls={id}
              className={cn(
                'flex flex-wrap items-center gap-0.5',
                inPreview && 'pointer-events-none opacity-40'
              )}
            >
              {COMMAND_GROUPS.map((group, groupIndex) => (
                <React.Fragment key={group[0].key}>
                  {groupIndex > 0 && (
                    <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
                  )}
                  {group.map((command) => {
                    const Icon = command.icon;
                    return (
                      <Button
                        key={command.key}
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        tabIndex={inPreview ? -1 : 0}
                        aria-label={command.label}
                        title={command.shortcut ? `${command.label} (${command.shortcut})` : command.label}
                        className="text-muted-foreground hover:text-foreground"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => runCommand(command)}
                      >
                        <Icon aria-hidden="true" />
                      </Button>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>

            <TabsList className="ml-auto h-8">
              <TabsTrigger value="write" className="text-xs">
                Tulis
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs">
                Pratinjau
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="write" className="mt-0">
            <Textarea
              ref={setRef}
              id={id}
              name={name}
              value={value}
              rows={rows}
              placeholder={placeholder}
              onChange={(event) => onChange(event.target.value)}
              onBlur={onBlur}
              onKeyDown={handleKeyDown}
              aria-invalid={invalid}
              aria-describedby={aria['aria-describedby']}
              className="min-h-72 resize-y rounded-none border-0 bg-transparent font-mono text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </TabsContent>

          <TabsContent
            value="preview"
            className="mt-0 min-h-72 overflow-auto px-4 py-3 focus-visible:ring-0"
          >
            {value.trim() ? (
              <MarkdownRenderer content={value} className="text-sm" />
            ) : (
              <p className="text-sm text-muted-foreground">
                Belum ada konten untuk dipratinjau.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }
);
