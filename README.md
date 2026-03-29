# RemNote Random Review Plugin

Open a document from your RemNote knowledge base with one click.

This plugin now supports FSRS-Lite scheduling for document-level review. You can rate each opened document with `Again / Hard / Good / Easy`, and the next pick is biased toward higher forgetting risk.

## Features

- Open a random document from the sidebar or command palette
- Show an English toast such as `This is your 3rd time opening this document.`
- Track per-document open counts with synced plugin storage
- FSRS-Lite document scheduler with `Again / Hard / Good / Easy` feedback
- Plugin setting: `Reset Review Memory` to clear all random-review memory
- Cache the document index locally for faster repeated use

## Installation

### From the RemNote plugin marketplace

1. Open RemNote.
2. Go to the plugin marketplace.
3. Search for `Random Review`.
4. Install the plugin.

### Manual install

```bash
git clone https://github.com/heimi98/remnote-random-review-plugin.git
cd remnote-random-review-plugin
npm install
npm run build
```

Then import `PluginZip.zip` into RemNote.

## Development

Requirements:

- Node.js 16+
- npm

Commands:

```bash
npm run dev
npm run check-types
npm run build
```

## Tech Stack

- TypeScript
- React
- RemNote Plugin SDK
- Webpack

## License

[MIT](LICENSE)
