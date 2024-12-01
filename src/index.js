#!/usr/bin/env node

// @ts-check

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function cloneRepo(url) {
  const tmpDir = path.join(__dirname, 'tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  execSync(`git clone ${url} ${tmpDir}`, { stdio: 'inherit' });
  return tmpDir;
}

async function findMarkdownFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let mdFiles = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory() && !file.name.startsWith('.')) {
      mdFiles = mdFiles.concat(await findMarkdownFiles(fullPath));
    } else if (file.name.endsWith('.md')) {
      mdFiles.push(fullPath);
    }
  }

  return mdFiles;
}

async function processFiles(files, baseDir) {
  let output = '';

  for (const file of files) {
    const relativePath = path.relative(baseDir, file);
    const content = await fs.readFile(file, 'utf-8');
    const title = content.split('\n')[0].replace(/^#\s*/, '');

    output += `\n\n--- ${relativePath} - ${title || 'Untitled'} ---\n\n`;
    output += content;
  }

  return output;
}

async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

async function main() {
  const repoUrl = process.argv[2];

  if (!repoUrl) {
    console.error('Please provide a repository URL');
    process.exit(1);
  }

  try {
    const tmpDir = await cloneRepo(repoUrl);
    const mdFiles = await findMarkdownFiles(tmpDir);
    const output = await processFiles(mdFiles, tmpDir);

    const outputFile = 'docs-combined.md';
    await fs.writeFile(outputFile, output);
    console.log(`Combined documentation saved to ${outputFile}`);

    await cleanup(tmpDir);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
