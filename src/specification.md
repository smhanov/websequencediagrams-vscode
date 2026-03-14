# Product Specification: WebSequenceDiagrams VS Code Extension V2

## 1. Executive Summary

**Objective:** Evolve the V1 Markdown-only extension into a fully-featured standalone sequence diagram editor. V2 introduces a custom Webview for side-by-side live previews, supports dedicated `.wsd` files, migrates to a secure POST-based API client (to bypass URL length limits), and adds core commands like export and share.

**Target User:** Backend developers and architects who want to author `.wsd` files directly in VS Code with instant, robust preview and presentation-ready exports.

**V2 Scope (from PRD Phase 1 - MVP):**

- Standalone file support (`.wsd`, `.sequence`, `.seqdiag`).
- Code snippets for faster authoring.
- Custom Webview Panel for "Live Preview to Side" (with 250ms debounce).
- Export commands (SVG, PNG, PDF).
- Share commands (Copy Link, Open in Browser).
- Configuration for custom/internal WebSequenceDiagrams server URLs.
- Security upgrade: Move API keys to VS Code's `SecretStorage`.

## 2. Architecture Shifts from V1

To support large diagrams, error handling, and standalone files, we must evolve the architecture:

1. **From GET to POST:** V1 used a simple `<img>` tag in Markdown pointing to a GET endpoint (`cdraw`). V2 requires a dedicated API service module that uses `POST` requests to handle massive diagram payloads and parse structured JSON responses (errors, export URLs, share links).
2. **From Markdown Preview to Custom Webview:** V1 piggybacked on `markdown-it`. V2 will use `vscode.window.createWebviewPanel` to create a dedicated, interactive preview pane that reacts to document edits.
3. **From Plaintext Settings to SecretStorage:** API keys will be moved out of standard workspace settings into the secure, encrypted `context.secrets`.

## 3. Step-by-Step Implementation Guide

### Step 1: Expand Language Support & Add Snippets (`package.json`)

First, we need to tell VS Code to recognize standard WSD files and provide useful code snippets (FR-003).

**Tasks:**

1. Update the `languages` array in `package.json` to include `.sequence` and `.seqdiag` extensions.
2. Add a `snippets` contribution point to `package.json`:
```
"snippets": [
  {
    "language": "wsd",
    "path": "./snippets/wsd.snippets.json"
  }
]
```
3. Create `snippets/wsd.snippets.json`. Add basic snippets for common structures:
  - `title`: `title ${1:Diagram Title}`
  - `participant`: `participant ${1:Name} as ${2:Alias}`
  - `alt`: `alt ${1:condition}\n\t${2}\nelse ${3:condition}\n\t${4}\nend`
  - `note`: `note over ${1:A},${2:B}: ${3:text}`

### Step 2: Configuration & API Key Migration

We need to add support for custom servers and stop storing the API key in plain text (NFR-003).

**Tasks:**

1. Remove `websequencediagrams.apikey` from the `configuration` block in `package.json`.
2. Add a new setting to the `configuration` block in `package.json` called `websequencediagrams.serverUrl` with the type `string` and default value `https://www.websequencediagrams.com`. This supports companies utilizing an internal/enterprise WSD deployment.
3. Add two new commands to `package.json`: `wsd.setApiKey` and `wsd.clearApiKey`.
4. In `src/extension.ts`, register these commands. Use `vscode.window.showInputBox` to prompt for the key, and store it using `context.secrets.store('wsd.apikey', key)`.

### Step 3: Create the API Client (`src/api.ts`)

Create a dedicated module to handle communication with the WSD servers. This isolates network logic from editor logic.

**Tasks:**

1. Create `src/api.ts`.
2. Implement a function: `async function renderDiagram(code: string, style: string, format: string, baseUrl: string, apiKey?: string)`
3. Use the native `fetch` API (available in modern Node/VS Code) to make a `POST` request to the official WSD render endpoint on the configured `baseUrl` (e.g., `${baseUrl}/index.php` or the designated JSON API).
4. Handle the response. Return an object containing:
  - The image buffer/URL (for the preview).
  - Errors (if the diagram has a syntax error, parse the line number so we can surface it later).
  - API Authorization errors (gracefully handle if an invalid/missing API key is rejected for premium formats).
  - Share/Export URLs (if returned by the API).

### Step 4: Implement the Live Preview Webview (`src/preview.ts`)

This is the core of V2. We need a side-by-side panel that updates as the user types (FR-010, FR-011).

**Tasks:**

1. Create a class `WsdPreviewPanel` that manages a `vscode.WebviewPanel`.
2. Register a command in `package.json`: `wsd.showPreviewToSide`.
3. When executed, call `vscode.window.createWebviewPanel('wsdPreview', 'WSD Preview', vscode.ViewColumn.Beside, { enableScripts: true })`.
4. **The Debounce Logic:** In `extension.ts`, listen to `vscode.workspace.onDidChangeTextDocument`. If the changed document is a `wsd` file, clear an existing timeout and set a new one for 250ms. When the timeout fires, send the document text to `WsdPreviewPanel.update(text)`.
5. **Webview HTML:** The `update` method should fetch `websequencediagrams.serverUrl` from settings, call the API client from Step 3, get the resulting image data/URL, and set `panel.webview.html` to a simple HTML structure containing an `<img>` tag and basic error state UI (FR-051).

### Step 5: Export & Sharing Commands

Users need to get their diagrams out of the editor (FR-020, FR-030). Exporting to premium formats (SVG, PNG, PDF) requires a valid API key.

**Tasks:**

1. Register commands in `package.json`:
  - `wsd.exportSvg`
  - `wsd.exportPng`
  - `wsd.exportPdf`
  - `wsd.copyShareLink`
  - `wsd.openInBrowser`
2. **Export Logic:** When an export command is clicked, grab the text of the *active* text editor.
  - **API Key Check:** Retrieve the API key from `context.secrets`. If missing, immediately abort the export and show an error: `vscode.window.showErrorMessage("Exporting requires a WebSequenceDiagrams API key. Please run the 'Set API Key' command.")`. Provide a button in the notification to trigger the `wsd.setApiKey` command.
  - **API Call:** Call the API client requesting the specific format and passing the API key and configured `serverUrl`.
  - **Save File:** Once the API returns the file URL/buffer, use `vscode.window.showSaveDialog` to let the user pick a save location on their hard drive, and write the file using `vscode.workspace.fs.writeFile`.
3. **Share Logic:** For `copyShareLink`, hit the API using the configured `serverUrl` to generate the permalink, then use `vscode.env.clipboard.writeText(url)` to copy it. Show a `vscode.window.showInformationMessage("Link copied!")`.
4. **Browser Logic:** For `openInBrowser`, generate the link and use `vscode.env.openExternal(vscode.Uri.parse(url))` to open the diagram on the currently configured WSD server.

## 4. QA & Testing Requirements for V2

Before marking V2 as complete, verify the following manually:

1. **File Association:** Create a file named `test.sequence`. Ensure the WSD logo appears, syntax highlighting works, and your new snippets auto-complete.
2. **Live Preview Debounce:** Open a `.wsd` file and trigger `Preview to Side`. Type rapidly. The API should *not* be called on every keystroke. It should only render ~250ms after you pause typing.
3. **Error States:** Type an invalid WSD command (e.g., `notarealcommand Alice->Bob`). The Webview should cleanly display a readable error message, not just a broken image icon or white screen.
4. **Secret Storage:** Use the `Set API Key` command. Restart VS Code. Verify the key is still applied to your previews (check for lack of watermarks or premium style availability).
5. **Export Flow (Authenticated):** Use the `Set API Key` command to add a valid key. Run the Export PNG command. Select a folder. Verify the resulting image on your hard drive is perfectly readable and not corrupted.
6. **Export Flow (Unauthenticated Check):** Run the `Clear API Key` command. Attempt to run Export SVG or PNG. Verify that a friendly error message appears prompting you to set your API key, and that no blank/corrupted file is saved to the disk.
7. **Custom Server Config:** Change the `websequencediagrams.serverUrl` setting to a dummy local address (e.g., `http://localhost:9999`). Trigger a preview and check the extension host logs (or network traffic) to verify the request is routed to the custom URL instead of the public WSD server. Restore it to the default when finished testing.
8. **Context Maintenance:** Ensure that the original Markdown V1 features (````wsd` blocks) still function normally alongside these new V2 standalone features.
