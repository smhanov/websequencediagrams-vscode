import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

  // 1. Register the MCP server for AI Agents (Copilot, etc.)
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('wsd.mcpServer', {
      provideMcpServerDefinitions() {
        const config = vscode.workspace.getConfiguration('websequencediagrams');
        const apikey = config.get<string>('apikey', '');

        let mcpUrl = 'https://www.websequencediagrams.com/mcp';

        // Append API key to the MCP URL if configured so the LLM gets premium features
        if (apikey) {
          mcpUrl += `?apikey=${encodeURIComponent(apikey)}`;
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

  // 2. Extend the Markdown Preview
  return {
    extendMarkdownIt(md: any) {
      const defaultRender = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens: any[], idx: number, options: any, env: any, self: any) => {
        const token = tokens[idx];

        // Intercept 'wsd' or 'websequencediagrams' language blocks
        if (token.info && (token.info.trim() === 'wsd' || token.info.trim() === 'websequencediagrams')) {
          const code = token.content;

          // Get user's preferred style and API key from settings
          const config = vscode.workspace.getConfiguration('websequencediagrams');
          const style = config.get<string>('style', 'modern-blue');
          const apikey = config.get<string>('apikey', '');

          // Construct the cdraw URL
          let url = `https://www.websequencediagrams.com/cgi-bin/cdraw?s=${encodeURIComponent(style)}&m=${encodeURIComponent(code)}`;

          if (apikey) {
            url += `&apikey=${encodeURIComponent(apikey)}`;
          }

          // Return a container with the image
          return `<div class="wsd-diagram-container">
                    <img src="${url}" alt="WebSequenceDiagram" class="wsd-diagram" />
                  </div>`;
        }

        // Fallback to default renderer for other code blocks
        return defaultRender(tokens, idx, options, env, self);
      };

      return md;
    }
  };
}
