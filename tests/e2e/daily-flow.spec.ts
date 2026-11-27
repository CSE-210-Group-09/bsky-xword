// End-to-end: the whole daily flow from the MVP (README), as one player sees it.
// Written ahead of the stories it needs (ADR 0012), so it is marked as expected to
// fail. When every step works, Playwright reports it as unexpectedly passing, which
// is the signal to delete the test.fail line.
import { expect, test } from '@playwright/test';
import { answer, cell, letterAt, timerSeconds, typeAt, whiteCells } from '../integration/helpers';

test('a player logs in, solves the mini with help, and sees and shares their result', async ({ page }) => {
  test.fail(true, 'Needs the login gate (#32), today\'s puzzle from the API (#35), publishing (#41), '
    + 'the leaderboard UI (#43) and sharing (#31) on main');

  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  // Logged out: the page is blurred behind a Bluesky login popup.
  const gate = page.getByRole('dialog', { name: 'Log in to play' });
  await expect(gate).toBeVisible();
  await page.getByLabel('Bluesky handle').fill('tester.bsky.social');
  await page.getByRole('button', { name: 'Log in with Bluesky' }).click();
  await expect(page.getByText('@tester.bsky.social')).toBeVisible();

  // The friends leaderboard stays hidden until the puzzle is finished.
  await expect(page.getByRole('button', { name: /Friends Leaderboard/ })).toBeHidden();

  // Solve with one reveal (+10 s) and one check (+30 s).
  await cell(page, 0, 0).click();
  await page.getByRole('button', { name: 'Reveal square' }).click();
  await page.getByRole('button', { name: 'Check puzzle' }).click();
  const published = page.waitForRequest((request) =>
    request.method() === 'POST' && request.url().endsWith('/api/results'));
  for (const { row, col } of whiteCells.slice(1)) await typeAt(page, row, col, answer(row, col));
  await expect(letterAt(page, 0, 0)).toHaveText(answer(0, 0));

  // Finished: the result is published and the time includes both penalties.
  await expect(page.getByText('Puzzle Complete!')).toBeVisible();
  expect(await timerSeconds(page)).toBeGreaterThanOrEqual(40);
  await published;

  // The friends leaderboard comes from the API and includes this player.
  await page.getByRole('button', { name: /Friends Leaderboard/ }).click();
  await expect(page.getByText('@tester.bsky.social')).toBeVisible();

  // Sharing opens the Bluesky composer with a spoiler-free post.
  const compose = page.waitForEvent('popup');
  await page.getByRole('button', { name: /Share to Bluesky/ }).click();
  expect((await compose).url()).toContain('bsky.app/intent/compose');
});
