/**
 * Pure text transforms that power the Markdown editor toolbar.
 *
 * Each function receives the current textarea {@link EditorState} (value + the
 * selection range) and returns a new state, including where the selection
 * should land afterwards. Keeping the logic pure makes every formatting rule
 * unit-testable without a DOM.
 */

export interface EditorState {
  value: string;
  selectionStart: number;
  selectionEnd: number;
}

/**
 * Toggle an inline marker (e.g. `**` for bold, `*` for italic, `` ` `` for
 * inline code) around the current selection. With no selection a placeholder is
 * inserted and selected; if the selection already includes the markers they are
 * removed.
 */
export function toggleInlineWrap(
  state: EditorState,
  marker: string,
  placeholder = 'teks'
): EditorState {
  const { value, selectionStart, selectionEnd } = state;

  if (selectionStart === selectionEnd) {
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionStart);
    const innerStart = selectionStart + marker.length;
    return {
      value: `${before}${marker}${placeholder}${marker}${after}`,
      selectionStart: innerStart,
      selectionEnd: innerStart + placeholder.length,
    };
  }

  const selected = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  const isWrapped =
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker);

  if (isWrapped) {
    const inner = selected.slice(marker.length, selected.length - marker.length);
    return {
      value: `${before}${inner}${after}`,
      selectionStart,
      selectionEnd: selectionStart + inner.length,
    };
  }

  return {
    value: `${before}${marker}${selected}${marker}${after}`,
    selectionStart: selectionStart + marker.length,
    selectionEnd: selectionEnd + marker.length,
  };
}

/**
 * Run a per-line transform over every line touched by the selection, then
 * select the whole rewritten block so the user sees what changed.
 */
function lineOp(
  state: EditorState,
  transform: (lines: string[]) => string[]
): EditorState {
  const { value, selectionStart, selectionEnd } = state;
  const blockStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const nextNewline = value.indexOf('\n', selectionEnd);
  const blockEnd = nextNewline === -1 ? value.length : nextNewline;

  const lines = value.slice(blockStart, blockEnd).split('\n');
  const newBlock = transform(lines).join('\n');

  return {
    value: value.slice(0, blockStart) + newBlock + value.slice(blockEnd),
    selectionStart: blockStart,
    selectionEnd: blockStart + newBlock.length,
  };
}

/**
 * Apply an ATX heading (`#`, `##`, `###`) to each selected line. Re-applying
 * the same level strips it (toggle off); a different level replaces it.
 */
export function applyHeading(state: EditorState, level: 1 | 2 | 3): EditorState {
  const hashes = '#'.repeat(level);
  return lineOp(state, (lines) =>
    lines.map((line) => {
      const stripped = line.replace(/^#{1,6}\s+/, '');
      return line.startsWith(`${hashes} `) ? stripped : `${hashes} ${stripped}`;
    })
  );
}

/**
 * Toggle a simple line prefix (`- ` for unordered lists, `> ` for blockquotes)
 * on each selected line. If every non-empty line already has the prefix it is
 * removed; otherwise it is added to the lines that lack it.
 */
export function toggleLinePrefix(state: EditorState, prefix: string): EditorState {
  return lineOp(state, (lines) => {
    const nonEmpty = lines.filter((line) => line.length > 0);
    const allHave =
      nonEmpty.length > 0 && nonEmpty.every((line) => line.startsWith(prefix));

    return lines.map((line) => {
      if (line.length === 0) return line;
      if (allHave) return line.startsWith(prefix) ? line.slice(prefix.length) : line;
      return line.startsWith(prefix) ? line : `${prefix}${line}`;
    });
  });
}

/**
 * Toggle an ordered list over the selected lines, renumbering from 1. If every
 * non-empty line is already numbered the numbering is removed.
 */
export function toggleOrderedList(state: EditorState): EditorState {
  const ordered = /^\d+\.\s/;
  return lineOp(state, (lines) => {
    const nonEmpty = lines.filter((line) => line.length > 0);
    const allOrdered =
      nonEmpty.length > 0 && nonEmpty.every((line) => ordered.test(line));

    let counter = 0;
    return lines.map((line) => {
      if (line.length === 0) return line;
      if (allOrdered) return line.replace(ordered, '');
      counter += 1;
      return `${counter}. ${line}`;
    });
  });
}

/**
 * Insert a Markdown link. The selection (or a placeholder) becomes the link
 * text and the cursor is left inside the `url` portion for immediate editing.
 */
export function insertLink(state: EditorState, placeholder = 'teks tautan'): EditorState {
  const { value, selectionStart, selectionEnd } = state;
  const text =
    selectionStart === selectionEnd
      ? placeholder
      : value.slice(selectionStart, selectionEnd);

  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);
  // `[` + text + `](` places the url three characters past the text.
  const urlStart = selectionStart + text.length + 3;

  return {
    value: `${before}[${text}](url)${after}`,
    selectionStart: urlStart,
    selectionEnd: urlStart + 'url'.length,
  };
}
