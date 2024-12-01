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

  const gitArgs = [
    'clone',
    '--depth',
    '1', // Shallow clone - only latest commit
    '--single-branch', // Don't fetch other branches
    '--no-tags', // Skip downloading tags
    url,
    tmpDir,
  ];

  execSync(`git ${gitArgs.join(' ')}`, { stdio: 'inherit' });
  return tmpDir;
}

function shouldIgnoreFile(filePath) {
  const ignorePatterns = [
    /CHANGELOG\.md$/i,
    /\/?examples(?:\/|$)/,
    /\.stories\.mdx?$/i,
    /node_modules/,
    /dist/,
    /build/,
    /\.git/,
  ];

  return ignorePatterns.some((pattern) => pattern.test(filePath));
}

async function findMarkdownFiles(dir) {
  const files = await fs.readdir(dir, { withFileTypes: true });
  let mdFiles = [];

  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    const relativePath = path.relative(dir, fullPath);

    if (shouldIgnoreFile(relativePath)) {
      continue;
    }

    if (file.isDirectory()) {
      mdFiles = mdFiles.concat(await findMarkdownFiles(fullPath));
    } else if (file.name.endsWith('.md') || file.name.endsWith('.mdx')) {
      mdFiles.push(fullPath);
    }
  }

  return mdFiles;
}

async function processFiles(files, baseDir, repoInfo) {
  let output = `<context>
This document is a compilation of markdown files from a GitHub repository: ${repoInfo.username}/${repoInfo.repo}.
Each <file> tag contains:
- path: Relative file path in the repository
- Original markdown content intact

Purpose: Use this structured format to understand the repository's documentation structure and content relationships.
</context>\n\n`;

  for (const file of files) {
    const relativePath = path.relative(baseDir, file);
    const content = await fs.readFile(file, 'utf-8');

    output += `<file path="${relativePath}">\n`;
    output += content.trim();
    output += '\n</file>\n\n';
  }

  output += '<context_end>End of repository documentation</context_end>';
  return output;
}
async function cleanup(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

function getRepoInfo(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
  if (!match) throw new Error('Invalid GitHub repository URL');
  return { username: match[1], repo: match[2] };
}
function getRepoMetadata(tmpDir) {
  const sha = execSync('git rev-parse --short HEAD', { cwd: tmpDir })
    .toString()
    .trim();
  const date = execSync('git show -s --format=%ci HEAD', { cwd: tmpDir })
    .toString()
    .trim()
    .replace(/\s+.*$/, '') // Remove timezone
    .replace(/[:-]/g, ''); // Remove separators

  return { sha, date };
}

async function main() {
  const repoUrl = process.argv[2];

  if (!repoUrl) {
    console.error('Please provide a repository URL');
    process.exit(1);
  }

  try {
    const repoInfo = getRepoInfo(repoUrl);
    const tmpDir = await cloneRepo(repoUrl);
    const metadata = getRepoMetadata(tmpDir);
    const mdFiles = await findMarkdownFiles(tmpDir);
    const output = await processFiles(mdFiles, tmpDir, repoInfo);

    const outputFile = `${repoInfo.username}__${repoInfo.repo}__${metadata.sha}__${metadata.date}.txt`;
    await fs.writeFile(outputFile, output);
    console.log(`Combined documentation saved to ${outputFile}`);

    await cleanup(tmpDir);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
