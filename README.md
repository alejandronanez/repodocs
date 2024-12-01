# repodocs

A simple CLI tool to combine all markdown files from a git repository into a single file. Useful for creating context files for LLMs.

## Installation

```bash
npm install -g repodocs
```

## Usage

```bash
npx repodocs https://github.com/user/repo
```

This will:
1. Clone the repository
2. Find all .md files
3. Combine them into a single file named `username__repository-name.txt`
4. Clean up temporary files

Each file in the combined output is separated by:
```
<file
  path="file pathname in the repository"
  title="File title"
  type="markdown"
  word_count="number"
>
```

## Development

1. Clone this repository
2. Run `npm install`
3. Make your changes
4. Test locally with `node index.js`

## License

MIT