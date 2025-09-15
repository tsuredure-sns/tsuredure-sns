import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: './src/index.ts',
  dts: true,
  minify: true,
  shims: true,
  format: ['cjs', 'esm', 'iife', 'umd'],
  globalName: 'TsuredureSNSCore',
  target: ['es2025', 'node22', 'chrome113', 'safari16', 'firefox113'],
});
