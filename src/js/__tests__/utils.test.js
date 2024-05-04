import { calcTileType } from '../utils';

describe('calcTileType function', () => {
  test('returns top-left for index 0 on a 8x8 board', () => {
    expect(calcTileType(0, 8)).toBe('top-left');
  });

  test('returns top-right for index 7 on a 8x8 board', () => {
    expect(calcTileType(7, 8)).toBe('top-right');
  });

  test('returns top for index 5 on a 8x8 board', () => {
    expect(calcTileType(5, 8)).toBe('top');
  });

  test('returns bottom-left for index 56 on a 8x8 board', () => {
    expect(calcTileType(56, 8)).toBe('bottom-left');
  });

  test('returns bottom-right for index 63 on a 8x8 board', () => {
    expect(calcTileType(63, 8)).toBe('bottom-right');
  });

  test('returns bottom for index 59 on a 8x8 board', () => {
    expect(calcTileType(59, 8)).toBe('bottom');
  });

  test('returns left for index 16 on a 8x8 board', () => {
    expect(calcTileType(16, 8)).toBe('left');
  });

  test('returns right for index 23 on a 8x8 board', () => {
    expect(calcTileType(23, 8)).toBe('right');
  });

  test('returns center for index 28 on a 8x8 board', () => {
    expect(calcTileType(28, 8)).toBe('center');
  });
});
