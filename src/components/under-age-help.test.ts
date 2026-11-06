import { describe, expect, it } from 'vitest';
import { guardianEmailHref } from './under-age-help';

describe('guardianEmailHref', () => {
  it('builds a mailto: link with no recipient and an encoded subject and body', () => {
    const href = guardianEmailHref(
      'Could you help me lease this?',
      'Hi,\n\nRevontuli Gamer 17: http://localhost:3000/en/products/laptop-008?a=1&b=2'
    );
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    const url = new URL(href);
    expect(url.searchParams.get('subject')).toBe('Could you help me lease this?');
    expect(url.searchParams.get('body')).toBe(
      'Hi,\n\nRevontuli Gamer 17: http://localhost:3000/en/products/laptop-008?a=1&b=2'
    );
  });
});
