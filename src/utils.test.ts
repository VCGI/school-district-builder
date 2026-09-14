import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeCsvCell } from './utils';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    expect(escapeHtml('<b>"quote" & \'apos\'</b>')).toBe(
      '&lt;b&gt;&quot;quote&quot; &amp; &#039;apos&#039;&lt;/b&gt;'
    );
  });

  it('returns an empty string for null or undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeCsvCell', () => {
  it('neutralizes formula-injection prefixes', () => {
    expect(sanitizeCsvCell('=SUM(A1:A2)')).toBe('"\'=SUM(A1:A2)"');
    expect(sanitizeCsvCell('+1')).toBe('"\'+1"');
    expect(sanitizeCsvCell('-1')).toBe('"\'-1"');
    expect(sanitizeCsvCell('@cmd')).toBe('"\'@cmd"');
  });

  it('quotes cells containing commas, quotes, or newlines', () => {
    expect(sanitizeCsvCell('a,b')).toBe('"a,b"');
    expect(sanitizeCsvCell('a"b')).toBe('"a""b"');
    expect(sanitizeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('passes plain values through unchanged', () => {
    expect(sanitizeCsvCell('plain text')).toBe('plain text');
    expect(sanitizeCsvCell(42)).toBe('42');
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
  });
});
