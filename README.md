# RemNote Random Review Plugin

Open a document from your RemNote knowledge base with one click.

This plugin now uses weighted random selection instead of pure randomness. Documents that have not been edited for a longer time and have been opened fewer times are more likely to be picked.

## Features

- Open a random document from the sidebar or command palette
- Show an English toast such as `This is your 3rd time opening this document.`
- Track per-document open counts with synced plugin storage
- Prefer older and less-opened documents
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
