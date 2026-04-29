import { describe, it, expect } from 'vitest';
import { shortTitle, createId, text } from './utils';

describe('Luna utils', () => {
  it('text() handles nulls and numbers', () => {
    expect(text(null)).toBe('');
    expect(text(123)).toBe('');
    expect(text(' hello  ')).toBe('hello');
  });

  it('shortTitle() truncates long text', () => {
    expect(shortTitle('Hello world')).toBe('Hello world');
    expect(shortTitle('This is a very long text string that needs to be truncated correctly by the function so it does not break the layout', 'Fallback')).toContain('...');
    expect(shortTitle('', 'Fallback')).toBe('Fallback');
  });

  it('createId() creates unique string prefixes', () => {
    const id1 = createId('test');
    const id2 = createId('test');
    expect(id1.startsWith('test-')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
