# WebSequenceDiagrams — Official VS Code Extension

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/WebSequenceDiagrams.websequencediagrams)](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/WebSequenceDiagrams.websequencediagrams)](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams)

The official [WebSequenceDiagrams](https://www.websequencediagrams.com) extension for Visual Studio Code. Author `.wsd` files with a live side-by-side preview, export to SVG/PNG/PDF, share diagrams with a single command, and let AI assistants generate diagrams for you — all without leaving your editor.

---

## Features

### Live Preview to Side

Open any `.wsd`, `.sequence`, or `.seqdiag` file and run **"WebSequenceDiagrams: Preview to Side"** (or click the preview icon in the editor title bar). A dedicated panel appears beside your editor and updates automatically as you type, with a 250ms debounce for smooth performance.

**Sticky participant headers** — When scrolling long diagrams, participant header boxes stay pinned to the top of the preview so you always know who is who.

**Inline error display** — Syntax errors appear in a collapsible panel at the bottom of the preview, with line numbers. The diagram still renders as much as possible — errors don't replace the image.

### Render Diagrams in Markdown Preview

Write a fenced code block with the language identifier **`wsd`** (or `websequencediagrams`) in any Markdown file. Open the built-in Markdown preview and see your diagram rendered instantly.

````markdown
```wsd
title Login Flow

Client->Server: POST /login (username, password)
Server->Database: SELECT user WHERE username=?
Database-->Server: user record
Server-->Client: 200 OK + JWT token
```
````

Every edit updates the preview in real time — no manual refresh needed.

### Syntax Highlighting

Get full syntax highlighting for WebSequenceDiagrams keywords, arrows, participants, notes, and more — both in Markdown fenced blocks and in standalone `.wsd` files.

- **Keywords** — `title`, `participant`, `note`, `alt`, `loop`, `opt`, and more
- **Arrows** — `->`, `-->`, `->>`, `-->>`, `<->`, `<-->`
- **Modifiers** — activation (`+`), deactivation (`-`), creation (`*`)
- **Comments** — lines starting with `#`
- **Blocks** — `alt`/`else`/`end`, `loop`/`end`, `note`/`end note`, etc.

### AI Agent Integration (MCP)

This extension automatically registers a [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server with VS Code. AI assistants like **GitHub Copilot** can discover and use the WebSequenceDiagrams API to:

- Generate sequence diagrams from natural language descriptions
- Interpret and explain existing diagrams
- Modify diagrams based on your instructions

Just ask Copilot: *"Draw a sequence diagram for a user registration flow"* — and it will use the MCP tools provided by this extension.

### Multiple Diagram Styles

Choose from 8 built-in styles to match your team's preferences:

| Style | |
|---|---|
| `default` | Classic black and white |
| `earth` | Warm earth tones |
| **`modern-blue`** | Clean modern look *(default)* |
| `mscgen` | Traditional MSC style |
| `omegapple` | Colorful and friendly |
| `qsd` | Minimalist |
| `rose` | Soft rose palette |
| `roundgreen` | Rounded with green accents |

Change your style anytime in Settings — new diagrams render with the updated style immediately.

### Export to SVG, PNG & PDF

Export presentation-ready diagrams directly from VS Code:

- **WebSequenceDiagrams: Export as SVG**
- **WebSequenceDiagrams: Export as PNG**
- **WebSequenceDiagrams: Export as PDF**

PNG export works without an API key. SVG and PDF export require a premium API key. Diagrams export even if they contain syntax errors.
A save dialog lets you choose the destination, defaulting to the current file's directory.

### Share & Open in Browser

- **WebSequenceDiagrams: Copy Share Link** — generates a compact permalink using LZ77 compression and copies it to your clipboard.
- **WebSequenceDiagrams: Open in Browser** — opens the compressed diagram link directly in your browser.
- **WebSequenceDiagrams: Open on websequencediagrams.com** — opens the diagram on the website editor where you can continue editing it.

None of these commands require an API key or a server round-trip — the link is generated entirely client-side.

### Context Menu Integration

All major commands (Preview, Share, Export, Open on Website) are available in the right-click context menu when editing a `.wsd` file or right-clicking one in the file explorer.

### Code Snippets

Type common keywords and tab-complete full structures:

| Prefix | Expands to |
|---|---|
| `title` | `title Diagram Title` |
| `participant` | `participant Name as Alias` |
| `alt` | Full `alt`/`else`/`end` block |
| `loop` | Full `loop`/`end` block |
| `note` | `note over A,B: text` |
| `signal` | `A->B: message` |
| `reply` | `A-->B: message` |
| ...and more | `opt`, `par`, `ref`, `activate`, `deactivate`, `autonumber`, `actor`, `database` |

### Premium Features

Have a [WebSequenceDiagrams premium account](https://www.websequencediagrams.com)? Store your API key securely:

1. Run **"WebSequenceDiagrams: Set API Key"** from the Command Palette.
2. Your key is saved in VS Code's encrypted SecretStorage — never in plain-text settings.

With a premium key you can:

- Remove watermarks from rendered diagrams
- Export to SVG, PNG, and PDF
- Access premium styles
- Unlock higher rate limits

To remove a stored key, run **"WebSequenceDiagrams: Clear API Key"**.

### Enterprise / Custom Server

Using an internal WebSequenceDiagrams deployment? Set the `websequencediagrams.serverUrl` setting to your server's base URL. All API calls, previews, and exports will route there.

---

## Getting Started

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams).
2. **Open or create** a `.wsd` file (or a Markdown file with a `wsd` code block).
3. **Preview** — run "Preview to Side" from the Command Palette or click the preview icon, or use the Markdown preview for fenced blocks:

````markdown
```wsd
Alice->Bob: Hello Bob, how are you?
Bob-->Alice: I am good thanks!
```
````

4. **Export or share** — use the Command Palette commands to export as SVG/PNG/PDF or share a link.

---

## Commands

| Command | Description |
|---|---|
| `WebSequenceDiagrams: Preview to Side` | Open a live preview panel beside the editor |
| `WebSequenceDiagrams: Set API Key` | Securely store your premium API key |
| `WebSequenceDiagrams: Clear API Key` | Remove the stored API key |
| `WebSequenceDiagrams: Export as SVG` | Export the current diagram as SVG |
| `WebSequenceDiagrams: Export as PNG` | Export the current diagram as PNG |
| `WebSequenceDiagrams: Export as PDF` | Export the current diagram as PDF |
| `WebSequenceDiagrams: Copy Share Link` | Copy a shareable link to the clipboard |
| `WebSequenceDiagrams: Open in Browser` | Open the diagram image in your browser |
| `WebSequenceDiagrams: Open on websequencediagrams.com` | Open the diagram in the website editor |

---

## Extension Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| `websequencediagrams.style` | `string` | `modern-blue` | The diagram style to use for rendering. |
| `websequencediagrams.serverUrl` | `string` | `https://www.websequencediagrams.com` | Base URL of the WSD server (change for enterprise deployments). |

API keys are stored securely via VS Code's SecretStorage, not in settings. Use the **Set API Key** / **Clear API Key** commands.

Access settings via **File > Preferences > Settings** and search for *"WebSequenceDiagrams"*.

---

## Supported Syntax

This extension supports the full [WebSequenceDiagrams syntax](https://www.websequencediagrams.com/examples.html), including:

- **Signals:** `Alice->Bob: message`, `Bob-->Alice: reply`
- **Arrow types:** `->` (solid), `-->` (dashed), `->>` (open solid), `-->>` (open dashed), `<->` and `<-->` (bidirectional)
- **Participants:** `participant`, `participant:actor`, `participant:database`, `participant:cloud`, `participant:queue`
- **Aliases:** `participant "Long Name" as A`
- **Activation:** `+` / `-` / `*` modifiers, or explicit `activate` / `deactivate` / `destroy`
- **Notes:** `note left of`, `note right of`, `note over` (inline and multi-line)
- **State:** `state over` (inline and multi-line)
- **References:** `ref over` (inline and multi-line, with signal variants)
- **Grouping:** `alt`, `else`, `opt`, `loop`, `par`, `parallel`, `seq`, with `end`
- **Parallel blocks:** `{` and `}`
- **Meta:** `title`, `autonumber`, `option`
- **Comments:** `# this is a comment`

---

## Examples

### Basic Request-Response

````markdown
```wsd
Client->Server: GET /api/users
Server->Database: SELECT * FROM users
Database-->Server: rows
Server-->Client: 200 OK [users]
```
````

### Authentication Flow with Activation

````markdown
```wsd
title OAuth 2.0 Authorization Code Flow

Client->Auth Server: Authorization Request
Auth Server-->Client: Authorization Code
Client->Auth Server: Token Request (code + secret)
Auth Server->Auth Server: Validate
Auth Server-->Client: Access Token + Refresh Token
Client->+Resource Server: API Request (Bearer token)
Resource Server-->-Client: Protected Resource
```
````

### Parallel and Alt Blocks

````markdown
```wsd
title Order Processing

Client->API: POST /order
API->+OrderService: createOrder()

par
  OrderService->InventoryService: reserveStock()
  OrderService->PaymentService: chargeCard()
end

alt successful
  OrderService-->API: order confirmed
  API-->Client: 201 Created
else payment failed
  OrderService-->API: payment error
  API-->Client: 402 Payment Required
end

deactivate OrderService
```
````

---

## Standalone Files

This extension recognizes `.wsd`, `.sequence`, and `.seqdiag` file extensions. Open any of these to get syntax highlighting, snippets, live preview, and all commands out of the box.

---

## Requirements

- Visual Studio Code 1.75.0 or later
- An internet connection (diagrams are rendered via the WebSequenceDiagrams cloud service, or your configured server)

---

## Known Limitations

- The standalone live preview and export use POST requests, so there is no URL length limit. Markdown preview and share links use LZ77-compressed URLs for compact representation.
- The preview pane and exports require network access to your configured WSD server.
- Share links and "Open on websequencediagrams.com" are generated client-side and do not require network access.

---

## Feedback & Support

- **Issues & Feature Requests:** [GitHub Issues](https://github.com/smhanov/websequencediagrams-vscode/issues)
- **Documentation:** [WebSequenceDiagrams Syntax Reference](https://www.websequencediagrams.com/examples.html)
- **Website:** [www.websequencediagrams.com](https://www.websequencediagrams.com)

---

## License

This extension is released under the [MIT License](LICENSE).
