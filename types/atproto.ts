export const RESULT_COLLECTION = 'io.github.cse-210-group-09.xword.result' as const;

/** Public first-completion record, stored in the player's repo with rkey = puzzleDate.
 * timeSeconds includes penalties. The server separately checks the URI/date and known puzzle.
 */
export interface ResultRecord {
  $type: typeof RESULT_COLLECTION;
  puzzleId: string;
  puzzleDate: string;
  timeSeconds: number;
  revealCount: number;
  checkCount: number;
  completedAt: string;
}
