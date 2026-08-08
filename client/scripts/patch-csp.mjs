#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configJsPath = join(__dirname, '..', 'dist', 'config.js');
const indexHtmlPath = join(__dirname, '..', 'dist', 'index.html');

const configJs = readFileSync(configJsPath, 'utf8');
const match = configJs.match(/API_BASE_URL\s*=\s*"([^"]*)"/);
const apiBaseUrl = match?.[1] ?? '';

if (!apiBaseUrl) {
  console.log('patch-csp: API_BASE_URL is empty, leaving CSP connect-src unchanged.');
  process.exit(0);
}

let origin;
try {
  origin = new URL(apiBaseUrl).origin;
} catch {
  console.error(`patch-csp: API_BASE_URL ("${apiBaseUrl}") isn't a valid URL, can't patch CSP.`);
  process.exit(1);
}

let html = readFileSync(indexHtmlPath, 'utf8');
const connectSrcRe = /(connect-src\s+[^;]*)(;)/;

if (!connectSrcRe.test(html)) {
  console.error('patch-csp: no connect-src directive found in dist/index.html CSP meta tag.');
  process.exit(1);
}

if (html.includes(origin)) {
  console.log(`patch-csp: ${origin} already present in connect-src, nothing to do.`);
  process.exit(0);
}

html = html.replace(connectSrcRe, (_full, directive, semicolon) => `${directive} ${origin}${semicolon}`);
writeFileSync(indexHtmlPath, html);
console.log(`patch-csp: added ${origin} to dist/index.html's connect-src.`);
