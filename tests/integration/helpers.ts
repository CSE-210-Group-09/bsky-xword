import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { parsePuzzle } from '../../lib/puzzles/parse';
import type { Puzzle } from '../../types';

// The tests serve this fixture as today's puzzle through page.route, so they
// don't depend on the date or on a puzzle file for today (#35).
const puzzle = JSON.parse(readFileSync('puzzles/2026-11-18.json', 'utf8')) as { grid: string[] };

export const PUZZLE_DATE = '2026-11-18';

/** The fixture in the shape GET /api/puzzle/today returns. */
export const servedPuzzle = (): Puzzle => parsePuzzle(puzzle, PUZZLE_DATE);

/** Answer GET /api/puzzle/today with the given puzzle (the fixture by default). */
export async function servePuzzle(page: Page, body: Puzzle = servedPuzzle()) {
  await page.route('**/api/puzzle/today*', (route) => route.fulfill({ json: body }));
}

/** The correct letter at a cell, or '#' for a black square. */
export const answer = (row: number, col: number) => puzzle.grid[row][col];

/** Every white cell, row by row. */
export const whiteCells = puzzle.grid.flatMap((line, row) =>
  [...line].flatMap((letter, col) => (letter === '#' ? [] : [{ row, col }])),
);

export const cell = (page: Page, row: number, col: number) =>
  page.locator(`.cell[data-row="${row}"][data-col="${col}"]`);

/** The letter shown in a cell. */
export const letterAt = (page: Page, row: number, col: number) =>
  cell(page, row, col).locator('.cell-letter');

/** The timer's value in seconds, read from its m:ss text. */
export async function timerSeconds(page: Page): Promise<number> {
  const [minutes, seconds] = (await page.locator('.timer-box').innerText()).match(/(\d+):(\d\d)/)!.slice(1);
  return Number(minutes) * 60 + Number(seconds);
}

/** Open the app with no saved progress, logging in if the login gate (#32) is up. */
export async function startFreshPuzzle(page: Page) {
  await servePuzzle(page);
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await logInIfAsked(page);
  await expect(cell(page, 0, 0)).toBeVisible();
}

export async function logInIfAsked(page: Page) {
  const gate = page.getByRole('dialog', { name: 'Log in to play' });
  if (await gate.isVisible()) {
    await page.getByLabel('Bluesky handle').fill('tester.bsky.social');
    await page.getByRole('button', { name: 'Log in with Bluesky' }).click();
    await expect(gate).toBeHidden();
  }
}

/** Click a cell and type one letter into it. */
export async function typeAt(page: Page, row: number, col: number, letter: string) {
  await cell(page, row, col).click();
  await page.keyboard.press(letter);
}
