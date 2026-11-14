import { QueryFailedError } from 'typeorm';

/*
 * SQL Server reports a duplicate key under two numbers, depending on how the
 * uniqueness was declared:
 *
 *   2601  Cannot insert duplicate key row in object ... with unique index
 *   2627  Violation of UNIQUE KEY / PRIMARY KEY constraint
 *
 * The schema in database/scripts declares these as unique indexes, so 2601 is
 * what fires in practice. 2627 is here because the same table declared with a
 * constraint instead would be equally correct and report differently, and a
 * guard that only recognises one of the two silently stops working.
 */
const DUPLICATE_KEY_ERROR_NUMBERS = new Set([2601, 2627]);

/*
 * Whether an error is SQL Server refusing a row that already exists.
 *
 * This exists so that code inserting optimistically can swallow a duplicate
 * without also swallowing a dropped connection, a deadlock or a type
 * mismatch. A bare `catch` cannot tell those apart, and treating a real
 * failure as "already there" turns it into silent data loss.
 */
export function isDuplicateKeyError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  /*
   * TypeORM keeps the driver's error on `driverError` and also copies its own
   * properties onto itself, so tedious's `number` can be read from either.
   * Preferring driverError keeps this working if that copying ever stops.
   */
  const driverError = error.driverError as { number?: unknown } | undefined;
  const errorNumber =
    driverError?.number ?? (error as unknown as { number?: unknown }).number;

  return (
    typeof errorNumber === 'number' &&
    DUPLICATE_KEY_ERROR_NUMBERS.has(errorNumber)
  );
}
