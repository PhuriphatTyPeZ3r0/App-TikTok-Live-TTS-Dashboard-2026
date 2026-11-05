import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTtsText, isUserOnCooldown } from '../textUtils';

// Compatible expect shim for Node test runner
const expect = (actual: any) => ({
  toBe: (expected: any) => assert.strictEqual(actual, expected),
  toEqual: (expected: any) => assert.deepStrictEqual(actual, expected),
  toBeLessThanOrEqual: (expected: number) => assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`),
});

describe('textUtils normalization', () => {
  test('strips URLs from text', () => {
    const res = normalizeTtsText('ดูไลฟ์ที่ https://example.com/live สนุกมาก');
    expect(res.text).toBe('ดูไลฟ์ที่ สนุกมาก');
    expect(res.isBlocked).toBe(false);
  });

  test('collapses excessive character repetition', () => {
    const res = normalizeTtsText('สวัสดีค้าบบบบบบบ');
    expect(res.text).toBe('สวัสดีค้าบบ');
  });

  test('truncates text exceeding maxCharacters', () => {
    const longText = 'ก'.repeat(150);
    const res = normalizeTtsText(longText, { maxCharacters: 100 });
    expect(res.text.length).toBeLessThanOrEqual(100);
  });

  test('blocks text containing banned words', () => {
    const res = normalizeTtsText('ข้อความมีคำหยาบมาก', { bannedWords: ['คำหยาบ'] });
    expect(res.isBlocked).toBe(true);
    expect(res.reason).toBe('banned_word');
  });

  test('prepends username when readUsername is true', () => {
    const res = normalizeTtsText('สวัสดีครับ', { readUsername: true, username: 'Somchai' });
    expect(res.text).toBe('Somchai บอกว่า: สวัสดีครับ');
  });

  test('enforces user cooldown', () => {
    const map = new Map<string, number>();
    const now = Date.now();
    map.set('user123', now);
    expect(isUserOnCooldown('user123', 15, map)).toBe(true);
    expect(isUserOnCooldown('user456', 15, map)).toBe(false);
  });

  test('allows message after cooldown period expires', () => {
    const map = new Map<string, number>();
    const past = Date.now() - 20000; // 20 seconds ago
    map.set('user123', past);
    expect(isUserOnCooldown('user123', 15, map)).toBe(false);
  });

  test('handles case-insensitive banned words and strips www URLs', () => {
    const res = normalizeTtsText('เข้าชม www.tiktok.com เลยจ้า', { bannedWords: ['SPAM'] });
    expect(res.text).toBe('เข้าชม เลยจ้า');
    expect(res.isBlocked).toBe(false);

    const bannedRes = normalizeTtsText('ข้อความนี้มี SpAm', { bannedWords: ['spam'] });
    expect(bannedRes.isBlocked).toBe(true);
    expect(bannedRes.reason).toBe('banned_word');
  });
});
