// Story #61: solve today's puzzle with help (reveal, check, saved progress).
// Written before the story's code (ADR 0012). Each group is marked as expected to fail
// until its task lands; the task's PR deletes the marker.
import { expect, test } from '@playwright/test';
import {
  answer, cell, letterAt, logInIfAsked, startFreshPuzzle, timerSeconds, typeAt, whiteCells,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await startFreshPuzzle(page);
});

test.describe('reveal square (#27)', () => {
  test('fills the selected cell, locks it, and adds 10 seconds once', async ({ page }) => {
    await cell(page, 0, 0).click();
    await page.getByRole('button', { name: 'Reveal square' }).click();

    await expect(letterAt(page, 0, 0)).toHaveText(answer(0, 0));
    await expect(cell(page, 0, 0)).toHaveClass(/revealed/);
    expect(await timerSeconds(page)).toBeGreaterThanOrEqual(10);

    // A revealed cell can't be overwritten, and revealing it again costs nothing.
    await typeAt(page, 0, 0, 'Z');
    await expect(letterAt(page, 0, 0)).toHaveText(answer(0, 0));
    await cell(page, 0, 0).click();
    await page.getByRole('button', { name: 'Reveal square' }).click();
    expect(await timerSeconds(page)).toBeLessThan(20);
  });

  test('revealing the last missing letter completes the puzzle', async ({ page }) => {
    const [last, ...rest] = [...whiteCells].reverse();
    for (const { row, col } of rest) await typeAt(page, row, col, answer(row, col));
    await cell(page, last.row, last.col).click();
    await page.getByRole('button', { name: 'Reveal square' }).click();

    await expect(page.getByText('Puzzle Complete!')).toBeVisible();
  });
});

test.describe('check puzzle (#28)', () => {
  test.fail(() => true, 'Written before #28; its PR deletes this line');

  test('marks only wrong letters, adds 30 seconds, and clears a mark on edit', async ({ page }) => {
    const wrong = answer(0, 0) === 'X' ? 'Y' : 'X';
    await typeAt(page, 0, 0, wrong);
    await typeAt(page, 0, 1, answer(0, 1));
    await page.getByRole('button', { name: 'Check puzzle' }).click();

    await expect(cell(page, 0, 0)).toHaveClass(/incorrect/);
    await expect(cell(page, 0, 1)).not.toHaveClass(/incorrect/);
    await expect(cell(page, 1, 0)).not.toHaveClass(/incorrect/); // empty cells are not marked
    expect(await timerSeconds(page)).toBeGreaterThanOrEqual(30);

    await typeAt(page, 0, 0, answer(0, 0));
    await expect(cell(page, 0, 0)).not.toHaveClass(/incorrect/);
  });
});

test.describe('saved progress (#29)', () => {
  test.fail(() => true, 'Written before #29; its PR deletes this line');

  test('a refresh mid-solve keeps letters, revealed cells, time and penalties', async ({ page }) => {
    await typeAt(page, 1, 0, answer(1, 0));
    await cell(page, 0, 0).click();
    await page.getByRole('button', { name: 'Reveal square' }).click();
    await expect.poll(() => timerSeconds(page)).toBeGreaterThanOrEqual(12);
    const before = await timerSeconds(page);

    await page.reload();
    await logInIfAsked(page);

    await expect(letterAt(page, 1, 0)).toHaveText(answer(1, 0));
    await expect(letterAt(page, 0, 0)).toHaveText(answer(0, 0));
    await expect(cell(page, 0, 0)).toHaveClass(/revealed/);
    expect(await timerSeconds(page)).toBeGreaterThanOrEqual(before);
  });

  test('a refresh after finishing shows the finished puzzle, not a new attempt', async ({ page }) => {
    for (const { row, col } of whiteCells) await typeAt(page, row, col, answer(row, col));
    await expect(page.getByText('Puzzle Complete!')).toBeVisible();
    const finalTime = await timerSeconds(page);

    await page.reload();
    await logInIfAsked(page);

    for (const { row, col } of whiteCells) await expect(letterAt(page, row, col)).toHaveText(answer(row, col));
    await page.waitForTimeout(1500); // the timer must not restart
    expect(await timerSeconds(page)).toBe(finalTime);
    await typeAt(page, 0, 0, answer(0, 0) === 'X' ? 'Y' : 'X'); // no new attempt
    await expect(letterAt(page, 0, 0)).toHaveText(answer(0, 0));
    await expect(page.getByRole('button', { name: /Friends Leaderboard/ })).toBeVisible();
  });
});
