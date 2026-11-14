import { QueryFailedError } from 'typeorm';

import { isDuplicateKeyError } from './sql-server-errors';

function queryFailure(driverError: Error): QueryFailedError {
  return new QueryFailedError('INSERT INTO ...', [], driverError);
}

function tediousError(message: string, number: number): Error {
  return Object.assign(new Error(message), { number });
}

describe('isDuplicateKeyError', () => {
  it('recognises a duplicate key in a unique index (2601)', () => {
    const error = queryFailure(
      tediousError(
        'Cannot insert duplicate key row in object ' +
          "'dbo.fraud_identifiers' with unique index " +
          "'UX_fraud_identifiers_transaction_type_value'.",
        2601,
      ),
    );

    expect(isDuplicateKeyError(error)).toBe(true);
  });

  it('recognises a unique constraint violation (2627)', () => {
    const error = queryFailure(
      tediousError('Violation of UNIQUE KEY constraint.', 2627),
    );

    expect(isDuplicateKeyError(error)).toBe(true);
  });

  /*
   * The cases that matter. Each of these was previously indistinguishable
   * from a duplicate, and each means the row was not written.
   */
  it.each([
    ['a deadlock', 1205],
    ['a timeout', -2],
    ['a string-truncation error', 8152],
    ['a type-conversion error', 245],
    ['a foreign key violation', 547],
    ['a not-null violation', 515],
  ])('does not treat %s as a duplicate', (_label, number) => {
    const error = queryFailure(tediousError('failed', number));

    expect(isDuplicateKeyError(error)).toBe(false);
  });

  it('does not treat a connection failure as a duplicate', () => {
    expect(isDuplicateKeyError(new Error('socket hang up'))).toBe(false);
  });

  it('does not treat a query failure with no error number as a duplicate', () => {
    expect(isDuplicateKeyError(queryFailure(new Error('unknown')))).toBe(false);
  });

  it.each([[null], [undefined], ['2601'], [2601]])(
    'does not treat the non-error value %p as a duplicate',
    (value) => {
      expect(isDuplicateKeyError(value)).toBe(false);
    },
  );

  it('reads the number from driverError rather than the copy on the wrapper', () => {
    const error = queryFailure(tediousError('duplicate', 2601));

    // TypeORM copies the driver error's properties onto the wrapper too.
    // Overwriting the copy proves which one the guard actually consults.
    Object.assign(error, { number: 1205 });

    expect(isDuplicateKeyError(error)).toBe(true);
  });
});
