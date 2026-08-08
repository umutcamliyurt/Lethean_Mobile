#!/usr/bin/env node

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const url = process.argv[2] ?? '';

if (url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && !(parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
      console.warn(`Warning: "${url}" is not HTTPS. The desktop app will refuse to run against a non-HTTPS backend unless it's localhost (see the isSecureContext check in api.ts).`);
    }
  } catch {
    console.error(`"${url}" doesn't look like a valid URL. Example: https://lethean.example.com`);
    process.exit(1);
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'src', 'config.ts');

const contents = `export const API_BASE_URL = ${JSON.stringify(url)};`;

writeFileSync(configPath, contents);
console.log(url ? `src/config.ts -> API_BASE_URL = ${url}` : 'src/config.ts -> API_BASE_URL cleared (same-origin/web mode)');
