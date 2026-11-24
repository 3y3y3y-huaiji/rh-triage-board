#!/usr/bin/env node
/**
 * 校验 Vite 构建产物 dist/ 完整性：
 * - index.html、_headers、llms.txt
 * - assets/*.js 与 assets/*.css
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const errors = [];

const requiredFiles = ['index.html', '_headers', 'llms.txt'];
for (const file of requiredFiles) {
  const full = resolve(distDir, file);
  if (!existsSync(full)) {
    errors.push(`缺少构建产物 dist/${file}`);
  }
}

const assetsDir = resolve(distDir, 'assets');
if (!existsSync(assetsDir)) {
  errors.push('缺少 dist/assets 目录');
} else {
  const assetNames = readdirSync(assetsDir);
  if (!assetNames.some((name) => name.endsWith('.js'))) {
    errors.push('dist/assets 缺少构建后的 JS bundle');
  }
  if (!assetNames.some((name) => name.endsWith('.css'))) {
    errors.push('dist/assets 缺少构建后的 CSS bundle');
  }
}

const indexPath = resolve(distDir, 'index.html');
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8');
  if (!html.includes('id="app"')) {
    errors.push('dist/index.html 缺少挂载节点 id="app"');
  }
}

if (errors.length > 0) {
  console.error('[verify-build] 产物契约校验失败：');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log('[verify-build] dist/ 静态构建产物校验通过');
