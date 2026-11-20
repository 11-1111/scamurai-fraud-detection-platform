import { readInfoField } from './redis-info';

/*
 * Parsing a Redis INFO reply.
 *
 * Tested here rather than through the health indicator because
 * @nestjs/terminus 12 is ESM-only and cannot be loaded by this CommonJS test
 * suite. The parsing is the part that can be wrong; the indicator is a thin
 * translation of a broker status into a terminus result.
 */

describe('readInfoField', () => {
  const info = [
    '# Server',
    'redis_version:7.4.1',
    'io_threads_active:0',
    '# Replication',
    'role:master',
    'connected_slaves:0',
  ].join('\r\n');

  it('reads a field from a section', () => {
    expect(readInfoField(info, 'redis_version')).toBe('7.4.1');
    expect(readInfoField(info, 'role')).toBe('master');
  });

  it('returns undefined for a field that is absent', () => {
    expect(readInfoField(info, 'cluster_enabled')).toBeUndefined();
  });

  it('does not match a field that is only a prefix of another', () => {
    // "role" must not be answered by "role_something", and
    // "connected_slaves" must not be found by searching "connected".
    expect(readInfoField(info, 'connected')).toBeUndefined();
  });

  it('survives an empty reply', () => {
    expect(readInfoField('', 'role')).toBeUndefined();
  });
});
