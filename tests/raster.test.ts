import { expect, test } from 'claude-code/testing'

import { grid, px } from '../hooks/pixels'
import { COLUMNS, DEFAULT_COLOR, ROWS, base64, decodeCells, encodeCells, hexColor } from '../hooks/raster'

test('base64 matches RFC 4648 vectors', () => {
  expect(base64(Uint8Array.of())).toBe('')
  expect(base64(Uint8Array.of(102))).toBe('Zg==')
  expect(base64(Uint8Array.of(102, 111))).toBe('Zm8=')
  expect(base64(Uint8Array.of(102, 111, 111))).toBe('Zm9v')
  expect(base64(Uint8Array.of(102, 111, 111, 98, 97, 114))).toBe('Zm9vYmFy')
})

test('hexColor parses #rrggbb and falls back to the default color', () => {
  expect(hexColor('#ff8800')).toBe(0xff8800)
  expect(hexColor('#ABCDEF')).toBe(0xabcdef)
  expect(hexColor('red')).toBe(DEFAULT_COLOR)
})

test('cells are half-blocks: top only, bottom only, both, none', () => {
  const g = grid()
  px(g, 0, 0, '#ff8800')
  px(g, 1, 1, '#00ff00')
  px(g, 2, 0, '#112233')
  px(g, 2, 1, '#445566')
  const cells = decodeCells(encodeCells(g))
  expect(cells.length).toBe(COLUMNS * ROWS)
  expect(cells[0]).toEqual([0x2580, 0xff8800, DEFAULT_COLOR])
  expect(cells[1]).toEqual([0x2584, 0x00ff00, DEFAULT_COLOR])
  expect(cells[2]).toEqual([0x2580, 0x112233, 0x445566])
  expect(cells[3]).toEqual([0x20, DEFAULT_COLOR, DEFAULT_COLOR])
})

test('cell row r reads pixel rows 2r and 2r+1', () => {
  const g = grid()
  px(g, 0, 2, '#010203')
  const cells = decodeCells(encodeCells(g))
  expect(cells[COLUMNS]).toEqual([0x2580, 0x010203, DEFAULT_COLOR])
})

test('encoded size is COLUMNS * ROWS * 12 bytes of base64', () => {
  expect(encodeCells(grid()).length).toBe(Math.ceil((COLUMNS * ROWS * 12) / 3) * 4)
})
