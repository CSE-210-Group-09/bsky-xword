// Story #70: see how your friends did on a live leaderboard (#43).
// Written before the story's code (ADR 0012). The panel wording comes from #68;
// the task's PR deletes the marker once #43 (and #68) are on this branch.
import { expect, test, type Page } from '@playwright/test';
import { answer, startFreshPuzzle, typeAt, whiteCells } from './helpers';

const PLAYER = 'did:plc:mock-tester.bsky.social';

/** Entries as GET /api/leaderboard returns them (#42): solvers only, fastest first. */
const entries = (playerSeconds: number) => [
  { did: 'did:plc:alice', handle: 'alice.bsky.social', displayName: 'Alice Walker', timeSeconds: 20, rank: 1, isCurrentUser: false },
  { did: 'did:plc:bob', handle: 'bob.bsky.social', timeSeconds: 30, rank: 2, isCurrentUser: false },
  { did: PLAYER, handle: 'tester.bsky.social', timeSeconds: playerSeconds, rank: 3, isCurrentUser: true },
];

async function finishPuzzle(page: Page) {
  for (const { row, col } of whiteCells) await typeAt(page, row, col, answer(row, col));
  await expect(page.getByText('Puzzle Complete!')).toBeVisible();
}

test.describe('live leaderboard (#43)', () => {
  test.fail(() => true, 'Written before #43 (and #68); its PR deletes this line');

  test('after finishing, the leaderboard shows the API entries for the player and today', async ({ page }) => {
    const requests: URL[] = [];
    await page.route('**/api/leaderboard*', (route) => {
      requests.push(new URL(route.request().url()));
      return route.fulfill({ json: { date: '2026-11-18', entries: entries(40) } });
    });
    await startFreshPuzzle(page);
    await finishPuzzle(page);
    await page.getByRole('button', { name: /View Friends Leaderboard/ }).click();

    const rows = page.locator('.leaderboard-item');
    await expect(rows).toHaveCount(3);
    await expect(rows.nth(0)).toContainText('Alice Walker');
    await expect(rows.nth(1)).toContainText('bob.bsky.social');
    await expect(rows.nth(2)).toContainText('YOU');
    expect(requests.at(-1)?.searchParams.get('did')).toBe(PLAYER);
    expect(requests.at(-1)?.searchParams.get('date')).toBe('2026-11-18');
  });

  test('shows an error with Retry when the API fails, and Retry loads the entries', async ({ page }) => {
    let fail = true;
    await page.route('**/api/leaderboard*', (route) =>
      fail
        ? route.fulfill({ status: 502, json: { error: { code: 'UPSTREAM_ERROR', message: 'nope' } } })
        : route.fulfill({ json: { date: '2026-11-18', entries: entries(40) } }));
    await startFreshPuzzle(page);
    await finishPuzzle(page);
    await page.getByRole('button', { name: /View Friends Leaderboard/ }).click();

    await expect(page.getByText(/Couldn't load the leaderboard/)).toBeVisible();
    fail = false;
    await page.getByRole('button', { name: 'Retry' }).click();
    await expect(page.locator('.leaderboard-item')).toHaveCount(3);
  });

  test('opening the leaderboard tab fetches it again', async ({ page }) => {
    let calls = 0;
    await page.route('**/api/leaderboard*', (route) => {
      calls += 1;
      return route.fulfill({ json: { date: '2026-11-18', entries: entries(40) } });
    });
    await startFreshPuzzle(page);
    await finishPuzzle(page);
    await page.getByRole('button', { name: 'Inspect Grid' }).click();
    const before = calls;
    await page.getByRole('button', { name: /Friends Leaderboard/ }).click();

    await expect.poll(() => calls).toBeGreaterThan(before);
  });

  test('the share text uses the rank from the API', async ({ page }) => {
    await page.route('**/api/leaderboard*', (route) =>
      route.fulfill({ json: { date: '2026-11-18', entries: entries(40) } }));
    await startFreshPuzzle(page);
    await finishPuzzle(page);

    const share = page.getByRole('link', { name: 'Share to Bluesky' });
    await expect(share).toHaveAttribute('href', /%233%20among%20friends/);
  });
});
