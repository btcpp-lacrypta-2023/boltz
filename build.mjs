#!/usr/bin/env node

import { writeFileSync } from 'fs';

import { context, build } from 'esbuild';

const buildOptions = {
  entryPoints: ['./src/**/*'],
  globalName: 'module',
  logLevel: 'debug',
  metafile: true,
  platform: 'node',
  sourcemap: 'linked',
  sourcesContent: false,
  tsconfig: './tsconfig.build.json',
  format: 'esm',
  outdir: './dist',
  outExtension: { '.js': '.mjs' },
  packages: 'external',
};

for (const arg of process.argv) {
  switch (arg) {
    case '-w':
    case '--watch':
      await (await context(buildOptions)).watch();
      break;
    default:
      writeFileSync('./dist/meta.json', JSON.stringify((await build(buildOptions)).metafile));
  }
}

