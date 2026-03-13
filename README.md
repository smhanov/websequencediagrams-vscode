# WebSequenceDiagrams — Official VS Code Extension

[![Visual Studio Marketplace](https://img.shields.io/visual-studio-marketplace/v/WebSequenceDiagrams.websequencediagrams)](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/WebSequenceDiagrams.websequencediagrams)](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams)

The official [WebSequenceDiagrams](https://www.websequencediagrams.com) extension brings sequence diagram authoring directly into Visual Studio Code. Write diagrams in Markdown, see them rendered live in the preview pane, and let AI assistants generate diagrams for you — all without leaving your editor.

![WebSequenceDiagrams in VS Code](https://www.websequencediagrams.com/images/vscode-hero.png)

---

## Features

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

### Premium Features

Have a [WebSequenceDiagrams premium account](https://www.websequencediagrams.com)? Enter your API key in the extension settings to:

- Remove watermarks from rendered diagrams
- Access premium styles
- Unlock higher rate limits

---

## Getting Started

1. **Install** the extension from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=WebSequenceDiagrams.websequencediagrams).
2. **Open or create** a Markdown file (`.md`).
3. **Add a diagram** using a `wsd` fenced code block:

````markdown
```wsd
Alice->Bob: Hello Bob, how are you?
Bob-->Alice: I am good thanks!
```
````

4. **Open Markdown Preview** — press `Ctrl+Shift+V` (or `Cmd+Shift+V` on macOS).
5. Your diagram appears live in the preview pane.

---

## Extension Settings

This extension contributes the following settings:

| Setting | Type | Default | Description |
|---|---|---|---|
| `websequencediagrams.style` | `string` | `modern-blue` | The diagram style to use for rendering. |
| `websequencediagrams.apikey` | `string` | *(empty)* | Your WebSequenceDiagrams API key for premium features. |

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

## Standalone `.wsd` Files

In addition to Markdown code blocks, this extension registers the `.wsd` file extension. Open any `.wsd` file to get syntax highlighting out of the box.

---

## Requirements

- Visual Studio Code 1.75.0 or later
- An internet connection (diagrams are rendered via the WebSequenceDiagrams cloud service)

---

## Known Limitations

- Diagrams are rendered server-side via a GET request. Extremely long diagrams (over ~8,000 characters of source text) may exceed URL length limits in some environments.
- The Markdown preview must have network access to `https://www.websequencediagrams.com`.

---

## Feedback & Support

- **Issues & Feature Requests:** [GitHub Issues](https://github.com/nicholasgasior/wsd-vscode-extension/issues)
- **Documentation:** [WebSequenceDiagrams Syntax Reference](https://www.websequencediagrams.com/examples.html)
- **Website:** [www.websequencediagrams.com](https://www.websequencediagrams.com)

---

## License

This extension is released under the [MIT License](LICENSE).
