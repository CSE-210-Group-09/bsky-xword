// Story #69: play today's puzzle from the server (#35).
// Written before the story's code (ADR 0012); the task's PR deletes the markers.
import { expect, test } from '@playwright/test';
import { cell, logInIfAsked, servedPuzzle, typeAt, answer, letterAt } from './helpers';

const notFound = { status: 404, json: { error: { code: 'PUZZLE_NOT_FOUND', message: 'No puzzle is available for 2026-11-27' } } };
const serverError = { status: 500, json: { error: { code: 'INTERNAL_ERROR', message: 'boom' } } };

test.describe('loading today\'s puzzle (#35)', () => {
  test.fail(() => true, 'Written before #35; its PR deletes this line');

  test('shows a loading state, then the puzzle the server returned', async ({ page }) => {
    const puzzle = servedPuzzle();
    puzzle.clues.across[0] = { ...puzzle.clues.across[0], text: 'Clue served by the API' };
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/puzzle/today*', async (route) => {
      await held;
      await route.fulfill({ json: puzzle });
    });

    await page.goto('/');
    await logInIfAsked(page);
    await expect(page.getByText(/Loading today's puzzle/)).toBeVisible();
    release();

    await expect(cell(page, 0, 0)).toBeVisible();
    await expect(page.getByText('Clue served by the API').first()).toBeVisible();
  });

  test('says there is no puzzle today when the server has none', async ({ page }) => {
    await page.route('**/api/puzzle/today*', (route) => route.fulfill(notFound));
    await page.goto('/');
    await logInIfAsked(page);

    await expect(page.getByText(/No puzzle today, check back later/)).toBeVisible();
    await expect(cell(page, 0, 0)).toHaveCount(0);
  });

  test('shows an error with Retry when the server fails, and Retry loads the puzzle', async ({ page }) => {
    let fail = true;
    await page.route('**/api/puzzle/today*', (route) =>
      fail ? route.fulfill(serverError) : route.fulfill({ json: servedPuzzle() }));
    await page.goto('/');
    await logInIfAsked(page);

    await expect(page.getByText(/Couldn't load today's puzzle/)).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(cell(page, 0, 0)).toBeVisible();
  });
});

test.describe('saved progress follows the served puzzle (#35, #29)', () => {
  test.fail(() => true, 'Needs #35, and saved progress (#29, PR #65) on the story branch');

  test('a reload restores progress saved under the served puzzle\'s date', async ({ page }) => {
    const puzzle = { ...servedPuzzle(), date: '2026-11-27' };
    await page.route('**/api/puzzle/today*', (route) => route.fulfill({ json: puzzle }));
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await logInIfAsked(page);
    await typeAt(page, 1, 0, answer(1, 0));

    await page.reload();
    await logInIfAsked(page);
    await expect(letterAt(page, 1, 0)).toHaveText(answer(1, 0));
    expect(await page.evaluate(() => Object.keys(localStorage))).toContain('bsky-xword:progress:2026-11-27');
  });
});
