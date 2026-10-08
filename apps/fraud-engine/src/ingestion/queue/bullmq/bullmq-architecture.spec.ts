import * as fs from 'fs';
import * as path from 'path';

describe('BullMQ architectural boundaries', () => {
  it('contains no infrastructure imports outside src/ingestion/queue/bullmq', () => {
    const srcRoot = path.join(__dirname, '..', '..', '..');
    const forbiddenPatterns = [
      /from 'bullmq'/,
      /from "bullmq"/,
      /from '@nestjs\/bullmq'/,
      /from "@nestjs\/bullmq"/,
      /from 'ioredis'/,
      /from "ioredis"/,
    ];

    const allowedPaths = [
      `${path.sep}queue${path.sep}bullmq${path.sep}`,
      `${path.sep}workers${path.sep}`,
    ];

    const offenders = findForbiddenImports(srcRoot, forbiddenPatterns).filter(
      (filePath) => !allowedPaths.some((allowedPath) => filePath.includes(allowedPath)),
    );

    expect(offenders).toEqual([]);
  });
});

function findForbiddenImports(
  directory: string,
  forbiddenPatterns: RegExp[],
): string[] {
  const offenders: string[] = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }

      offenders.push(...findForbiddenImports(entryPath, forbiddenPatterns));
      continue;
    }

    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.spec.ts')) {
      continue;
    }

    const contents = fs.readFileSync(entryPath, 'utf8');

    if (forbiddenPatterns.some((pattern) => pattern.test(contents))) {
      offenders.push(entryPath);
    }
  }

  return offenders;
}
