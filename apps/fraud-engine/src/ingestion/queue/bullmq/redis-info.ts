/*
 * Reading fields out of a Redis INFO reply.
 *
 * Lives beside the BullMQ adapter because the INFO format is Redis-specific:
 * the queue port reports a broker status in driver-neutral terms, and this is
 * where that status is read from. Keeping it out of the health module is what
 * lets the health indicator depend on the port rather than on bullmq.
 */

/*
 * INFO replies as CRLF-separated `key:value` lines with `#`-prefixed section
 * headers. Only a couple of fields are wanted, so scanning the lines is less
 * work than parsing the whole reply into a map.
 */
export function readInfoField(info: string, field: string): string | undefined {
  for (const line of info.split('\n')) {
    if (line.startsWith(`${field}:`)) {
      return line.slice(field.length + 1).trim();
    }
  }

  return undefined;
}
