import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { FraudProfileQueryDto } from '../../fraud/dto/fraud-profile-query.dto';
import { AddAlertNoteDto } from './add-alert-note.dto';
import { AssignAlertDto } from './assign-alert.dto';
import { ListAlertsQueryDto } from './list-alerts-query.dto';
import { ResolveAlertDto } from './resolve-alert.dto';
import { UpdateAlertStatusDto } from './update-alert-status.dto';

/*
 * Request validation on the fraud engine.
 *
 * There was none: the engine had no ValidationPipe and its DTOs were plain
 * classes, so every body reached a service exactly as sent. These tests
 * exercise the decorators through plainToInstance and validate, which is the
 * same path the pipe takes, rather than asserting the decorators exist.
 *
 * The transform cases matter most. Query parameters arrive as strings, and
 * a page number left as a string compares lexically -- so paging works until
 * there are ten pages, then silently stops.
 */

async function errorsFor<T extends object>(
  cls: new () => T,
  payload: Record<string, unknown>,
): Promise<string[]> {
  const instance = plainToInstance(cls, payload, {
    enableImplicitConversion: false,
  });
  const errors = await validate(instance as object, {
    whitelist: true,
  });

  return errors.map((error) => error.property);
}

describe('ListAlertsQueryDto', () => {
  it('converts paging parameters from strings to numbers', async () => {
    const dto = plainToInstance(ListAlertsQueryDto, {
      page: '3',
      pageSize: '50',
    });

    expect(dto.page).toBe(3);
    expect(dto.pageSize).toBe(50);
    expect(await errorsFor(ListAlertsQueryDto, { page: '3' })).toEqual([]);
  });

  it('rejects a page size above the cap', async () => {
    // Without a ceiling, one request can ask for every alert in the
    // database.
    expect(await errorsFor(ListAlertsQueryDto, { pageSize: '5000' })).toContain(
      'pageSize',
    );
  });

  it('rejects a page below one', async () => {
    expect(await errorsFor(ListAlertsQueryDto, { page: '0' })).toContain(
      'page',
    );
  });

  it('rejects a non-numeric page', async () => {
    expect(await errorsFor(ListAlertsQueryDto, { page: 'first' })).toContain(
      'page',
    );
  });

  it('rejects a status that is not a known alert status', async () => {
    expect(
      await errorsFor(ListAlertsQueryDto, { status: 'PROBABLY_FINE' }),
    ).toContain('status');
  });

  it('accepts an empty query', async () => {
    expect(await errorsFor(ListAlertsQueryDto, {})).toEqual([]);
  });
});

describe('UpdateAlertStatusDto', () => {
  it('accepts a known status', async () => {
    expect(
      await errorsFor(UpdateAlertStatusDto, { status: 'UNDER_REVIEW' }),
    ).toEqual([]);
  });

  it('rejects an unknown status', async () => {
    // The status drives the alert lifecycle, so an unrecognised value would
    // leave an alert in a state nothing knows how to move it out of.
    expect(
      await errorsFor(UpdateAlertStatusDto, { status: 'MAYBE' }),
    ).toContain('status');
  });

  it('rejects a missing status', async () => {
    expect(await errorsFor(UpdateAlertStatusDto, {})).toContain('status');
  });
});

describe('ResolveAlertDto', () => {
  it('accepts a known resolution', async () => {
    expect(
      await errorsFor(ResolveAlertDto, { resolution: 'FALSE_POSITIVE' }),
    ).toEqual([]);
  });

  it('rejects an unknown resolution', async () => {
    // Resolutions are the labels rule precision is computed from, so a
    // free-text value here quietly corrupts the measurement.
    expect(
      await errorsFor(ResolveAlertDto, { resolution: 'not fraud i think' }),
    ).toContain('resolution');
  });
});

describe('AddAlertNoteDto', () => {
  it('requires a note', async () => {
    expect(await errorsFor(AddAlertNoteDto, {})).toContain('note');
  });

  it('rejects an empty note', async () => {
    expect(await errorsFor(AddAlertNoteDto, { note: '' })).toContain('note');
  });

  it('rejects a note longer than the column', async () => {
    // The column is NVARCHAR(2000); without this the insert fails with a
    // truncation error instead of a 400.
    expect(
      await errorsFor(AddAlertNoteDto, { note: 'x'.repeat(2001) }),
    ).toContain('note');
  });
});

describe('AssignAlertDto', () => {
  it('requires an assignee', async () => {
    expect(await errorsFor(AssignAlertDto, {})).toContain('assignedTo');
  });

  it('accepts an assignee with an optional comment', async () => {
    expect(
      await errorsFor(AssignAlertDto, {
        assignedTo: 'analyst@example.com',
        comment: 'Taking this one.',
      }),
    ).toEqual([]);
  });
});

describe('FraudProfileQueryDto', () => {
  it('accepts a supported identifier type', async () => {
    expect(
      await errorsFor(FraudProfileQueryDto, {
        type: 'email',
        value: 'analyst@example.com',
      }),
    ).toEqual([]);
  });

  it('rejects an identifier type the graph has no label for', async () => {
    // The graph engine returns an empty network for an unknown type, so
    // without this the caller gets a successful, empty, misleading answer.
    expect(
      await errorsFor(FraudProfileQueryDto, {
        type: 'passport_number',
        value: 'X',
      }),
    ).toContain('type');
  });

  it('rejects a depth beyond what the traversal allows', async () => {
    // The engine clamps depth so it can never be handed an unbounded
    // traversal. Rejecting here means a caller asking for 50 is told, rather
    // than quietly served 5.
    expect(
      await errorsFor(FraudProfileQueryDto, {
        type: 'ip',
        value: '41.90.64.12',
        depth: '50',
      }),
    ).toContain('depth');
  });

  it('converts depth from a string', async () => {
    const dto = plainToInstance(FraudProfileQueryDto, {
      type: 'ip',
      value: '41.90.64.12',
      depth: '3',
    });

    expect(dto.depth).toBe(3);
  });
});
