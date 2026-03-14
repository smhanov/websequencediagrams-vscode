import * as vscode from 'vscode';
import { exportDiagram } from './api';
import { buildShareUrl, compressDiagramText } from './share';
import { WsdPreviewPanel } from './preview';

const SECRET_KEY = 'wsd.apikey';
const DEBOUNCE_MS = 250;

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Helper: retrieve the API key from SecretStorage.
 */
function makeGetApiKey(secrets: vscode.SecretStorage): () => Promise<string | undefined> {
  return async () => secrets.get(SECRET_KEY);
}

/**
 * Helper: get the active WSD document text, or show an error.
 */
function getActiveWsdText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'wsd') {
    vscode.window.showErrorMessage('Open a .wsd file first.');
    return undefined;
  }
  return editor.document.getText();
}

/**
 * Helper: require an API key for premium operations (export).
 */
async function requireApiKey(secrets: vscode.SecretStorage): Promise<string | undefined> {
  const key = await secrets.get(SECRET_KEY);
  if (key) {
    return key;
  }
  const action = await vscode.window.showErrorMessage(
    'Exporting requires a WebSequenceDiagrams API key. Please run the "Set API Key" command.',
    'Set API Key'
  );
  if (action === 'Set API Key') {
    await vscode.commands.executeCommand('wsd.setApiKey');
    return secrets.get(SECRET_KEY);
  }
  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const secrets = context.secrets;
  const getApiKey = makeGetApiKey(secrets);

  // ── API Key Commands ─────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.setApiKey', async () => {
      const key = await vscode.window.showInputBox({
        prompt: 'Enter your WebSequenceDiagrams API key',
        password: true,
        placeHolder: 'API key',
        ignoreFocusOut: true,
      });
      if (key !== undefined) {
        await secrets.store(SECRET_KEY, key);
        vscode.window.showInformationMessage('WebSequenceDiagrams API key saved securely.');
        // Invalidate preview so it re-renders with the new key
        WsdPreviewPanel.currentPanel?.invalidate();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.clearApiKey', async () => {
      await secrets.delete(SECRET_KEY);
      vscode.window.showInformationMessage('WebSequenceDiagrams API key cleared.');
      WsdPreviewPanel.currentPanel?.invalidate();
    })
  );

  // ── Live Preview Command ─────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.showPreviewToSide', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'wsd') {
        vscode.window.showErrorMessage('Open a .wsd file first.');
        return;
      }

      const panel = WsdPreviewPanel.createOrShow(getApiKey);
      panel.update(editor.document.getText());
    })
  );

  // ── Debounced Live Update on Text Change ─────────────────────────

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.languageId !== 'wsd') {
        return;
      }
      if (!WsdPreviewPanel.currentPanel) {
        return;
      }

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        WsdPreviewPanel.currentPanel?.update(e.document.getText());
      }, DEBOUNCE_MS);
    })
  );

  // Also update when the active editor changes to a wsd file
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && editor.document.languageId === 'wsd' && WsdPreviewPanel.currentPanel) {
        WsdPreviewPanel.currentPanel.update(editor.document.getText());
      }
    })
  );

  // ── Export Commands ──────────────────────────────────────────────

  const registerExportCommand = (command: string, format: string, filterName: string, ext: string, requiresKey: boolean) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async () => {
        const code = getActiveWsdText();
        if (!code) { return; }

        let apiKey: string | undefined;
        if (requiresKey) {
          apiKey = await requireApiKey(secrets);
          if (!apiKey) { return; }
        } else {
          apiKey = await getApiKey();
        }

        const result = await exportDiagram(code, format, apiKey);
        if (result.errors) {
          vscode.window.showErrorMessage(`Export failed: ${result.errors.join(', ')}`);
          return;
        }
        if (!result.buffer) {
          vscode.window.showErrorMessage('Export failed: no data returned.');
          return;
        }

        const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
        const editor = vscode.window.activeTextEditor;
        const fileDir = editor?.document.uri.scheme === 'file'
          ? vscode.Uri.joinPath(editor.document.uri, '..')
          : undefined;
        const baseDir = fileDir || workspaceFolder;
        const defaultUri = baseDir
          ? vscode.Uri.joinPath(baseDir, `diagram.${ext}`)
          : vscode.Uri.file(`diagram.${ext}`);

        const uri = await vscode.window.showSaveDialog({
          filters: { [filterName]: [ext] },
          defaultUri,
        });
        if (uri) {
          await vscode.workspace.fs.writeFile(uri, result.buffer);
          vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
        }
      })
    );
  };

  registerExportCommand('wsd.exportSvg', 'svg', 'SVG Image', 'svg', true);
  registerExportCommand('wsd.exportPng', 'png', 'PNG Image', 'png', false);
  registerExportCommand('wsd.exportPdf', 'pdf', 'PDF Document', 'pdf', true);

  // ── Share Commands ──────────────────────────────────────────────

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.copyShareLink', async () => {
      const code = getActiveWsdText();
      if (!code) { return; }

      const url = buildShareUrl(code);
      await vscode.env.clipboard.writeText(url);
      vscode.window.showInformationMessage('Link copied to clipboard!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.openInBrowser', async () => {
      const code = getActiveWsdText();
      if (!code) { return; }

      const url = buildShareUrl(code);
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('wsd.openOnWebsite', async () => {
      const code = getActiveWsdText();
      if (!code) { return; }

      const config = vscode.workspace.getConfiguration('websequencediagrams');
      const serverUrl = config.get<string>('serverUrl', 'https://www.websequencediagrams.com').replace(/\/+$/, '');
      const compressed = compressDiagramText(code);
      const url = `${serverUrl}/?lz=${compressed}`;
      await vscode.env.openExternal(vscode.Uri.parse(url));
    })
  );

  // ── MCP Server Registration ─────────────────────────────────────

  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('wsd.mcpServer', {
      async provideMcpServerDefinitions() {
        const config = vscode.workspace.getConfiguration('websequencediagrams');
        const serverUrl = config.get<string>('serverUrl', 'https://www.websequencediagrams.com');
        const apiKey = await getApiKey();

        let mcpUrl = `${serverUrl}/mcp`;
        if (apiKey) {
          mcpUrl += `?apikey=${encodeURIComponent(apiKey)}`;
        }

        return [
          new vscode.McpHttpServerDefinition(
            'WebSequenceDiagrams MCP',
            vscode.Uri.parse(mcpUrl)
          )
        ];
      }
    })
  );

  // ── V1 Backward Compat: Markdown Preview ────────────────────────

  return {
    extendMarkdownIt(md: any) {
      const defaultRender = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
        const token = tokens[idx];

        if (token.info && (token.info.trim() === 'wsd' || token.info.trim() === 'websequencediagrams')) {
          const code = token.content;
          const url = buildShareUrl(code);

          return `<div class="wsd-diagram-container">
                    <img src="${url}" alt="WebSequenceDiagram" class="wsd-diagram" />
                  </div>`;
        }

        return defaultRender(tokens, idx, options, env, self);
      };

      return md;
    }
  };
}
