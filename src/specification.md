# Product Specification: WebSequenceDiagrams VS Code Markdown Support

## 1. Executive Summary

**Objective:** Create a VS Code extension that seamlessly integrates our WebSequenceDiagrams (WSD) syntax into VS Code's built-in Markdown preview, while also providing editor syntax highlighting for the diagram code and AI agent integration via the Model Context Protocol (MCP).
**Target User:** Developers and technical writers who want to preview sequence diagrams side-by-side with their Markdown documentation without leaving their editor, and who want to use LLMs to generate diagrams.
**V1 Scope:** - Support `wsd` fenced code blocks in Markdown.

- Provide basic syntax highlighting for WSD keywords and arrows in the editor.
- Convert the payload into a direct image URL using our `cdraw` endpoint (with optional API key support for premium features).
- Render the resulting image in the preview pane.
- Automatically register the WebSequenceDiagrams MCP Server so AI agents like GitHub Copilot can interact with the API.

## 2. User Stories

- **As a user**, when I write a Markdown fenced code block with the language identifier `wsd` or `websequencediagrams`, I want to see the rendered diagram in my VS Code Markdown Preview.
- **As a user**, when I am typing inside a `wsd` code block, I want to see syntax highlighting for keywords, strings, and arrows to help me avoid typos.
- **As a user**, I want my VS Code AI assistant (like Copilot) to understand how to generate and interpret sequence diagrams using the WebSequenceDiagrams MCP server.
- **As a user**, I want to be able to configure my preferred diagram style (e.g., `modern-blue`, `rose`) in my VS Code settings.
- **As a premium user**, I want to be able to enter my WSD API key in the extension settings so I can render diagrams using premium styles without watermarks or access rate limits.

## 3. Technical Architecture Overview

We will use a streamlined approach with three distinct VS Code extension contribution points:

1. **Syntax Highlighting (TextMate Grammar):** We will define a custom language (`wsd`) and provide a basic TextMate grammar JSON file. VS Code automatically applies injected grammars to Markdown code blocks that match the language identifier.
2. **Markdown Preview (`markdown-it` Plugin):** VS Code's Markdown parser (`markdown-it`) allows us to intercept specific code blocks during the parsing phase. When the parser encounters a `wsd` block, our plugin will read the diagram text, URL-encode it, and output a standard HTML `<img>` tag pointing to our `https://www.websequencediagrams.com/cgi-bin/cdraw` endpoint.
3. **AI Integration (MCP Server Provider):** We will use the `vscode.lm.registerMcpServerDefinitionProvider` API to dynamically provide VS Code's AI agents with our remote SSE (Server-Sent Events) MCP endpoint at `https://www.websequencediagrams.com/mcp`.
Because the rendering relies entirely on a standard `<img>` tag, we do not need to inject client-side scripts, and we do not have to worry about CORS restrictions in the VS Code webview.

## 4. Step-by-Step Implementation Guide

### Step 1: Extension Setup & Manifest (`package.json`)

You will need to register contribution points for the languages, grammars, Markdown extension API, MCP servers, and settings.

Add the following to your `package.json`:

```
"contributes": {
  "languages": [
    {
      "id": "wsd",
      "aliases": ["WebSequenceDiagrams", "wsd"],
      "extensions": [".wsd"]
    }
  ],
  "grammars": [
    {
      "language": "wsd",
      "scopeName": "source.wsd",
      "path": "./syntaxes/wsd.tmLanguage.json"
    }
  ],
  "markdown.markdownItPlugins": true,
  "markdown.previewStyles": [
    "./media/style.css"
  ],
  "mcpServerDefinitionProviders": [
    {
      "id": "wsd.mcpServer",
      "label": "WebSequenceDiagrams MCP"
    }
  ],
  "configuration": {
    "type": "object",
    "title": "WebSequenceDiagrams",
    "properties": {
      "websequencediagrams.style": {
        "type": "string",
        "default": "modern-blue",
        "enum": ["default", "earth", "modern-blue", "mscgen", "omegapple", "qsd", "rose", "roundgreen"],
        "description": "Select the default style for your sequence diagrams."
      },
      "websequencediagrams.apikey": {
        "type": "string",
        "default": "",
        "description": "Optional: Enter your WebSequenceDiagrams API key to access premium styles and features."
      }
    }
  }
}
```

### Step 2: Syntax Highlighting Grammar (`syntaxes/wsd.tmLanguage.json`)

Create a basic TextMate grammar file to highlight common WebSequenceDiagrams syntax. This will automatically light up inside ````wsd` blocks in Markdown files.

```
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "WebSequenceDiagrams",
  "scopeName": "source.wsd",
  "fileTypes": ["wsd", "mscdraw"],
  "patterns": [
    { "include": "#comment" },
    { "include": "#title" },
    { "include": "#option" },
    { "include": "#autonumber" },
    { "include": "#include" },
    { "include": "#participant-with-alias" },
    { "include": "#participant" },
    { "include": "#activate-deactivate" },
    { "include": "#note-inline" },
    { "include": "#note-block" },
    { "include": "#state-inline" },
    { "include": "#state-block" },
    { "include": "#ref-signal-inline" },
    { "include": "#ref-signal-block" },
    { "include": "#ref-inline" },
    { "include": "#ref-block" },
    { "include": "#group-keyword" },
    { "include": "#end-keyword" },
    { "include": "#parallel-open" },
    { "include": "#parallel-close" },
    { "include": "#signal" }
  ],
  "repository": {
    "comment": {
      "name": "comment.line.number-sign.wsd",
      "match": "#.*$"
    },

    "title": {
      "match": "(?i)^\\s*(title)\\b(.*)",
      "captures": {
        "1": { "name": "keyword.control.title.wsd" },
        "2": { "name": "string.unquoted.title.wsd" }
      }
    },

    "option": {
      "match": "(?i)^\\s*(option)\\b(.*)",
      "captures": {
        "1": { "name": "keyword.control.option.wsd" },
        "2": { "name": "string.unquoted.option-value.wsd" }
      }
    },

    "autonumber": {
      "match": "(?i)^\\s*(autonumber)\\b(.*)",
      "captures": {
        "1": { "name": "keyword.control.autonumber.wsd" },
        "2": { "name": "constant.numeric.autonumber.wsd" }
      }
    },

    "include": {
      "match": "(?i)^\\s*(include)\\s+(\"[^\\n]*)",
      "captures": {
        "1": { "name": "keyword.control.include.wsd" },
        "2": { "name": "string.quoted.double.include.wsd" }
      }
    },

    "participant-with-alias": {
      "match": "(?i)^\\s*(participant(?::(?:actor|database|collections|cloud|queue))?|actor)\\s+(.+?)\\s+(as)\\s+(\\S+)\\s*$",
      "captures": {
        "1": { "name": "keyword.control.participant.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" },
        "3": { "name": "keyword.control.as.wsd" },
        "4": { "name": "entity.name.type.alias.wsd" }
      }
    },

    "participant": {
      "match": "(?i)^\\s*(participant(?::(?:actor|database|collections|cloud|queue))?|actor)\\s+(.+)\\s*$",
      "captures": {
        "1": { "name": "keyword.control.participant.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" }
      }
    },

    "activate-deactivate": {
      "match": "(?i)^\\s*(activate|deactivate|destroy|create)\\s+(\\S+)",
      "captures": {
        "1": { "name": "keyword.control.activation.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" }
      }
    },

    "note-inline": {
      "match": "(?i)^\\s*(note\\s+(?:over|left\\s+of|right\\s+of))\\s+(.+?)\\s*(:.*)",
      "captures": {
        "1": { "name": "keyword.control.note.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" },
        "3": { "name": "string.unquoted.note-text.wsd" }
      }
    },

    "note-block": {
      "begin": "(?i)^\\s*(note\\s+(?:over|left\\s+of|right\\s+of))\\s+(.+?)\\s*$",
      "beginCaptures": {
        "1": { "name": "keyword.control.note.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" }
      },
      "end": "(?i)^\\s*(end\\s+note)\\s*$",
      "endCaptures": {
        "1": { "name": "keyword.control.end-note.wsd" }
      },
      "contentName": "string.unquoted.note-body.wsd"
    },

    "state-inline": {
      "match": "(?i)^\\s*(state\\s+(?:over|left\\s+of|right\\s+of))\\s+(.+?)\\s*(:.*)",
      "captures": {
        "1": { "name": "keyword.control.state.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" },
        "3": { "name": "string.unquoted.state-text.wsd" }
      }
    },

    "state-block": {
      "begin": "(?i)^\\s*(state\\s+(?:over|left\\s+of|right\\s+of))\\s+(.+?)\\s*$",
      "beginCaptures": {
        "1": { "name": "keyword.control.state.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" }
      },
      "end": "(?i)^\\s*(end\\s+state)\\s*$",
      "endCaptures": {
        "1": { "name": "keyword.control.end-state.wsd" }
      },
      "contentName": "string.unquoted.state-body.wsd"
    },

    "ref-signal-inline": {
      "comment": "Signal into a ref block with inline end: A-->+ref over B, C: input ... end ref-->>D: output",
      "match": "(?i)^\\s*(.+?)\\s*(<-->|<->|-->>|->>|-->|->)([*+\\-]?)\\s*(ref\\s+over)\\s+(.+?)\\s*(:.*)",
      "captures": {
        "1": { "name": "entity.name.type.participant.source.wsd" },
        "2": { "name": "keyword.operator.arrow.wsd" },
        "3": { "name": "keyword.operator.modifier.wsd" },
        "4": { "name": "keyword.control.ref.wsd" },
        "5": { "name": "entity.name.type.participant.wsd" },
        "6": { "name": "string.unquoted.message.wsd" }
      }
    },

    "ref-signal-block": {
      "comment": "Signal into a multi-line ref block: A-->+ref over B, C: input (newline) ... (newline) end ref-->>D: output",
      "begin": "(?i)^\\s*(.+?)\\s*(<-->|<->|-->>|->>|-->|->)([*+\\-]?)\\s*(ref\\s+over)\\s+(.+?)\\s*(:.*)?$",
      "beginCaptures": {
        "1": { "name": "entity.name.type.participant.source.wsd" },
        "2": { "name": "keyword.operator.arrow.wsd" },
        "3": { "name": "keyword.operator.modifier.wsd" },
        "4": { "name": "keyword.control.ref.wsd" },
        "5": { "name": "entity.name.type.participant.wsd" },
        "6": { "name": "string.unquoted.message.wsd" }
      },
      "end": "(?i)^\\s*(end\\s+ref)(?:\\s*(<-->|<->|-->>|->>|-->|->)\\s*(.+?)\\s*(:.*)?)?\\s*$",
      "endCaptures": {
        "1": { "name": "keyword.control.end-ref.wsd" },
        "2": { "name": "keyword.operator.arrow.wsd" },
        "3": { "name": "entity.name.type.participant.wsd" },
        "4": { "name": "string.unquoted.message.wsd" }
      },
      "contentName": "string.unquoted.ref-body.wsd"
    },

    "ref-inline": {
      "match": "(?i)^\\s*(ref\\s+over)\\s+(.+?)\\s*(:.*)",
      "captures": {
        "1": { "name": "keyword.control.ref.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" },
        "3": { "name": "string.unquoted.ref-text.wsd" }
      }
    },

    "ref-block": {
      "begin": "(?i)^\\s*(ref\\s+over)\\s+(.+?)\\s*$",
      "beginCaptures": {
        "1": { "name": "keyword.control.ref.wsd" },
        "2": { "name": "entity.name.type.participant.wsd" }
      },
      "end": "(?i)^\\s*(end\\s+ref)(?:\\s*(<-->|<->|-->>|->>|-->|->)\\s*(.+?)\\s*(:.*)?)?\\s*$",
      "endCaptures": {
        "1": { "name": "keyword.control.end-ref.wsd" },
        "2": { "name": "keyword.operator.arrow.wsd" },
        "3": { "name": "entity.name.type.participant.wsd" },
        "4": { "name": "string.unquoted.message.wsd" }
      },
      "contentName": "string.unquoted.ref-body.wsd"
    },

    "group-keyword": {
      "match": "(?i)^\\s*(alt|opt|else|loop|par|parallel|seq)\\b(.*)",
      "captures": {
        "1": { "name": "keyword.control.group.wsd" },
        "2": { "name": "string.unquoted.group-label.wsd" }
      }
    },

    "end-keyword": {
      "match": "(?i)^\\s*(end)\\b",
      "captures": {
        "1": { "name": "keyword.control.end.wsd" }
      }
    },

    "parallel-open": {
      "match": "\\{",
      "name": "punctuation.section.block.begin.wsd"
    },

    "parallel-close": {
      "match": "\\}",
      "name": "punctuation.section.block.end.wsd"
    },

    "signal": {
      "match": "^\\s*(.+?)\\s*(<-->|<->|-->>|->>|-->|->)([*+\\-]?)\\s*(.+?)\\s*(:)(.*)?$",
      "captures": {
        "1": { "name": "entity.name.type.participant.source.wsd" },
        "2": { "name": "keyword.operator.arrow.wsd" },
        "3": { "name": "keyword.operator.modifier.wsd" },
        "4": { "name": "entity.name.type.participant.target.wsd" },
        "5": { "name": "punctuation.separator.colon.wsd" },
        "6": { "name": "string.unquoted.message.wsd" }
      }
    }
  }
}
```

### Step 3: The Extension Logic (`src/extension.ts`)

When the extension activates, we need to do two things:

1. Return an object with the `extendMarkdownIt` function. This intercepts the `wsd` code blocks and replaces them with an `<img>` tag pointing to our GET API.
2. Register the MCP server with VS Code's language models so AI agents can utilize it.

```
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  
  // 1. Register the MCP server for AI Agents (Copilot, etc.)
  context.subscriptions.push(
    vscode.lm.registerMcpServerDefinitionProvider('wsd.mcpServer', {
      provideMcpServerDefinitions() {
        const config = vscode.workspace.getConfiguration('websequencediagrams');
        const apikey = config.get('apikey', '');
        
        let mcpUrl = 'https://www.websequencediagrams.com/mcp';
        
        // Append API key to the MCP URL if configured so the LLM gets premium features
        if (apikey) {
          mcpUrl += `?apikey=${encodeURIComponent(apikey)}`;
        }

        return [{
          type: 'sse', // Using Server-Sent Events (SSE) for remote HTTP servers
          url: mcpUrl
        }];
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
          const style = config.get('style', 'modern-blue');
          const apikey = config.get('apikey', '');

          // Construct the cdraw URL
          let url = `https://www.websequencediagrams.com/cgi-bin/cdraw?s=${style}&m=${encodeURIComponent(code)}`;
          
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
```

### Step 4: Styling (`media/style.css`)

Add some basic CSS to ensure the image sits nicely within the preview pane and respects the editor's boundaries.

```
.wsd-diagram-container {
  margin: 1em 0;
  padding: 1em;
  background-color: var(--vscode-editor-background);
  text-align: center;
  overflow-x: auto;
}

.wsd-diagram {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}
```

## 5. QA & Testing Requirements

Before submitting your Pull Request, please verify the following:

1. **Syntax Highlighting:** Open a `.md` file, create a ````wsd` code block, and verify that keywords like `title`, `participant`, and arrows like `->` are highlighted in the editor.
2. **Basic Rendering:** A standard Alice->Bob diagram renders properly in the Markdown preview pane.
3. **Re-rendering:** Editing the text in the markdown pane instantly updates the image in the preview pane (VS Code triggers a markdown re-parse and the `<img>` src updates).
4. **Settings Sync:** Change the global VS Code setting `websequencediagrams.style` to `rose`. Ensure newly typed diagrams render using the new style.
5. **API Key Integration:** Insert a valid premium API key into the `websequencediagrams.apikey` setting. Verify that the diagram is generated with premium features unlocked.
6. **Payload Limits:** Because we are using a GET request (`cdraw`), URLs can get very long. Test an exceptionally long sequence diagram to verify browser URL length limitations in the VS Code webview (typically safe up to ~2000-8000 characters depending on the engine).
7. **MCP AI Integration:** Open GitHub Copilot Chat (or equivalent agent panel) and check that the `WebSequenceDiagrams MCP` server is visible and successfully connects. Prompt the agent to "Draw a sequence diagram for a login flow using the WSD MCP tool" and verify it executes the tool properly.
