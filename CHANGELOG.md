# Changelog

All notable changes to the **WebSequenceDiagrams** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] — 2026-03-13

### Added

- **Sticky participant headers** — When scrolling long diagrams in the preview, participant header boxes stay pinned at the top of the panel.
- **Inline error display** — Syntax errors now appear in a collapsible panel below the diagram instead of replacing it. The diagram renders as much as possible even with errors.
- **Open on websequencediagrams.com** — New command opens the diagram in the website editor for further editing.
- **Context menu integration** — All major commands (Preview, Share, Export, Open on Website) appear in the editor and explorer right-click context menus for `.wsd` files.
- **LZ77-compressed share links** — Share links and Markdown preview URLs now use LZ77 compression for much shorter URLs, matching the official embed script encoding.

### Changed

- **PNG export no longer requires an API key** — Only SVG and PDF exports require a premium key.
- **Export ignores syntax errors** — Diagrams export successfully even if they contain syntax errors, as long as the server returns an image.
- **Export save dialog** defaults to the current file's directory instead of the filesystem root.
- **Share commands are now client-side** — No server round-trip needed for Copy Share Link or Open in Browser.

### Fixed

- Fixed "Failed to parse server response as JSON" error caused by missing `apiVersion` parameter in API requests.

## [2.0.0] — 2026-03-13

### Added

- **Live Preview to Side** — Dedicated webview panel with 250ms debounced updates as you type.
- **Standalone file support** — `.wsd`, `.sequence`, and `.seqdiag` file extensions are now recognized.
- **Code snippets** — Tab-complete `title`, `participant`, `alt`, `loop`, `note`, `signal`, `reply`, and more.
- **Export commands** — Export as SVG, PNG, or PDF (requires premium API key).
- **Share commands** — Copy Share Link and Open in Browser.
- **Secure API key storage** — API keys are now stored in VS Code's encrypted SecretStorage via `Set API Key` / `Clear API Key` commands.
- **Custom server URL** — New `websequencediagrams.serverUrl` setting for enterprise/internal deployments.
- **POST-based API client** — All standalone preview and export operations use POST requests, removing URL length limits.

### Changed

- Removed `websequencediagrams.apikey` from plain-text settings (migrated to SecretStorage).
- MCP server registration now uses the configured `serverUrl` and SecretStorage API key.

### Backward Compatibility

- Markdown fenced code block rendering (`wsd` / `websequencediagrams`) continues to work as before.

## [1.0.0] — 2026-03-13

### Added

- **Markdown Preview rendering** — Write `wsd` or `websequencediagrams` fenced code blocks in Markdown and see rendered diagrams in the built-in preview pane.
- **Syntax highlighting** — Full TextMate grammar for WebSequenceDiagrams syntax, including keywords, arrows, participants, notes, groups, references, and comments. Works in Markdown fenced blocks and standalone `.wsd` files.
- **AI agent integration (MCP)** — Automatically registers a Model Context Protocol server so AI assistants like GitHub Copilot can generate and manipulate sequence diagrams.
- **Configurable diagram style** — Choose from 8 styles: `default`, `earth`, `modern-blue`, `mscgen`, `omegapple`, `qsd`, `rose`, `roundgreen`.
- **API key support** — Enter a WebSequenceDiagrams premium API key to remove watermarks and access premium features.
