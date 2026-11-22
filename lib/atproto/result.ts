import { RESULT_COLLECTION, type ResultRecord } from '../../types/atproto.js';

export { RESULT_COLLECTION, type ResultRecord } from '../../types/atproto.js';

export type ResultValidation =
  | { success: true; value: ResultRecord }
  | { success: false; errors: string[] };

/** Calendar validation without Date.parse's rollover of dates such as February 30. */
function isPuzzleDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return month >= 1 && month <= 12 && day >= 1 && day <= days[month - 1];
}

function isDatetime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match || !isPuzzleDate(match[1])) return false;
  const [, , hours, minutes, seconds, zone] = match;
  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) return false;
  if (zone === '-00:00') return false;
  if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return false;
  const timestamp = Date.parse(value);
  // AT Protocol forbids datetimes whose timezone offset normalizes before year zero.
  return Number.isFinite(timestamp) && new Date(timestamp).getUTCFullYear() >= 0;
}

/** Validate untrusted public repo data on either client or server. Unknown fields are
 * allowed for forward compatibility. This checks shape, not score honesty or authorship.
 */
export function validateResultRecord(value: unknown): ResultValidation {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return { success: false, errors: ['result must be an object'] };
  }
  const record = value as Record<string, unknown>;
  const errors: string[] = [];
  if (record.$type !== RESULT_COLLECTION) errors.push(`$type must be ${RESULT_COLLECTION}`);
  if (typeof record.puzzleId !== 'string' || record.puzzleId.length === 0) {
    errors.push('puzzleId must be a non-empty string');
  }
  if (!isPuzzleDate(record.puzzleDate)) errors.push('puzzleDate must be a valid YYYY-MM-DD date');
  for (const field of ['timeSeconds', 'revealCount', 'checkCount'] as const) {
    if (typeof record[field] !== 'number' || !Number.isSafeInteger(record[field]) || record[field] < 0) {
      errors.push(`${field} must be a non-negative safe integer`);
    }
  }
  if (!isDatetime(record.completedAt)) errors.push('completedAt must be an AT Protocol datetime with timezone');
  return errors.length ? { success: false, errors } : { success: true, value: value as ResultRecord };
}

/** Parse a result or throw TypeError with actionable field errors. */
export function parseResultRecord(value: unknown): ResultRecord {
  const result = validateResultRecord(value);
  if (!result.success) throw new TypeError(result.errors.join('; '));
  return result.value;
}
