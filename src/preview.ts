import * as vscode from 'vscode';
import { renderDiagramAsBase64 } from './api';

/**
 * Manages the WSD live preview webview panel.
 * Only one instance exists at a time (singleton per editor column).
 */
export class WsdPreviewPanel {
  public static currentPanel: WsdPreviewPanel | undefined;
  private static readonly viewType = 'wsdPreview';

  private readonly panel: vscode.WebviewPanel;
  private disposables: vscode.Disposable[] = [];
  private lastRenderedCode = '';
  private lastImageBase64 = '';
  private lastHeaderHeight = 0;
  private lastBoxes: any[] | undefined;
  private getApiKey: () => Promise<string | undefined>;

  private constructor(
    panel: vscode.WebviewPanel,
    getApiKey: () => Promise<string | undefined>
  ) {
    this.panel = panel;
    this.getApiKey = getApiKey;

    // Set initial loading content
    this.panel.webview.html = this.getLoadingHtml();

    // Handle disposal
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
  }

  /**
   * Create or reveal the preview panel.
   */
  public static createOrShow(
    getApiKey: () => Promise<string | undefined>
  ) {
    const column = vscode.ViewColumn.Beside;

    // If we already have a panel, reveal it
    if (WsdPreviewPanel.currentPanel) {
      WsdPreviewPanel.currentPanel.panel.reveal(column);
      return WsdPreviewPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      WsdPreviewPanel.viewType,
      'WSD Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    WsdPreviewPanel.currentPanel = new WsdPreviewPanel(panel, getApiKey);
    return WsdPreviewPanel.currentPanel;
  }

  /**
   * Update the preview with new diagram source text.
   */
  public async update(code: string) {
    if (code === this.lastRenderedCode) {
      return;
    }
    this.lastRenderedCode = code;

    if (!code.trim()) {
      this.panel.webview.html = this.getEmptyHtml();
      return;
    }

    // Show a loading indicator while preserving current image
    const apiKey = await this.getApiKey();
    const result = await renderDiagramAsBase64(code, apiKey);

    // Guard: if the code changed while we were fetching, don't overwrite
    if (code !== this.lastRenderedCode) {
      return;
    }

    // Update the last good image if we got one
    if (result.imageBase64) {
      this.lastImageBase64 = result.imageBase64;
    }
    if (result.boxes) {
      this.lastBoxes = result.boxes;
      this.lastHeaderHeight = this.computeHeaderHeight(result.boxes);
    }

    // Always show the best available image, with errors below if present
    const imageBase64 = result.imageBase64 || this.lastImageBase64;
    const errors = result.errors && result.errors.length > 0 ? result.errors : undefined;
    const errorLine = result.errorLine;

    this.panel.webview.html = this.getPreviewHtml(imageBase64, errors, errorLine, this.lastHeaderHeight, this.lastBoxes);
  }

  /**
   * Force a re-render of the current content (e.g. after style change).
   */
  public invalidate() {
    this.lastRenderedCode = '';
  }

  private getLoadingHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${this.getBaseStyles()}
    .loading { color: var(--vscode-descriptionForeground); font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <p class="loading">Waiting for diagram content...</p>
  </div>
</body>
</html>`;
  }

  private getEmptyHtml(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${this.getBaseStyles()}
    .empty { color: var(--vscode-descriptionForeground); font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <p class="empty">Enter diagram text to see a preview.</p>
  </div>
</body>
</html>`;
  }

  /**
   * Compute the header height from box data.
   * Header boxes have a `header` flag; we take the max bottom edge (rect[3]).
   */
  private computeHeaderHeight(boxes: any[]): number {
    let headerMaxHeight = 0;
    for (let i = 0; i < boxes.length; i++) {
      const box = boxes[i];
      if (!box.header) {
        continue;
      }
      headerMaxHeight = Math.max(headerMaxHeight, box.rect[3]);
    }
    return headerMaxHeight;
  }

  private getPreviewHtml(imageBase64: string, errors?: string[], errorLine?: number, headerHeight?: number, boxes?: any[]): string {
    const imageSection = imageBase64
      ? `<img id="diagram" src="data:image/png;base64,${imageBase64}" alt="WebSequenceDiagram" />`
      : `<p class="no-image">No diagram available.</p>`;

    // Collect header boxes for the sticky header
    const headerBoxes: { rect: number[] }[] = [];
    if (boxes) {
      for (const box of boxes) {
        if (box.header && box.rect) {
          headerBoxes.push({ rect: box.rect });
        }
      }
    }

    const hasHeaders = imageBase64 && headerBoxes.length > 0 && headerHeight && headerHeight > 0;
    const headerHeightPx = hasHeaders ? headerHeight : 0;
    const boxesJson = hasHeaders ? JSON.stringify(headerBoxes.map(b => b.rect)) : '[]';

    let stickyHeader = '';
    if (hasHeaders) {
      stickyHeader = `<div id="sticky-header" class="sticky-header"></div>`;
    }

    let errorSection = '';
    if (errors && errors.length > 0) {
      const errorItems = errors.map(e => `<li>${this.escapeHtml(e)}</li>`).join('');
      const lineInfo = errorLine !== undefined ? ` (line ${errorLine})` : '';
      errorSection = `
      <details class="error-panel" open>
        <summary class="error-summary">Errors${lineInfo} — ${errors.length} issue${errors.length > 1 ? 's' : ''}</summary>
        <ul class="error-list">${errorItems}</ul>
      </details>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>${this.getBaseStyles()}
    .preview-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    .image-section {
      flex: 1;
      display: flex;
      justify-content: center;
      width: 100%;
    }
    #diagram { max-width: 100%; height: auto; border-radius: 4px; }
    .no-image { color: var(--vscode-descriptionForeground); font-size: 14px; }

    .sticky-header {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 100;
      background: var(--vscode-editor-background);
      display: none;
      pointer-events: none;
    }
    .sticky-header .header-box {
      position: absolute;
      top: 0;
      background-repeat: no-repeat;
    }

    .error-panel {
      width: 100%;
      max-width: 700px;
      margin-top: 16px;
      background: var(--vscode-inputValidation-errorBackground, #5a1d1d);
      border: 1px solid var(--vscode-inputValidation-errorBorder, #be1100);
      border-radius: 4px;
      padding: 0;
    }
    .error-summary {
      cursor: pointer;
      padding: 8px 12px;
      color: var(--vscode-errorForeground, #f48771);
      font-weight: 600;
      font-size: 13px;
      user-select: none;
      list-style: revert;
    }
    .error-summary:hover {
      opacity: 0.85;
    }
    .error-list {
      margin: 0 0 8px 0;
      padding-left: 28px;
      padding-right: 12px;
    }
    .error-list li {
      color: var(--vscode-foreground);
      margin-bottom: 4px;
      font-size: 13px;
    }
  </style>
</head>
<body>
  ${stickyHeader}
  <div class="container">
    <div class="preview-wrapper">
      <div class="image-section">
        ${imageSection}
      </div>
      ${errorSection}
    </div>
  </div>
  <script>
    (function() {
      var headerMaxHeight = ${headerHeightPx};
      var boxRects = ${boxesJson};
      var stickyEl = document.getElementById('sticky-header');
      var diagramEl = document.getElementById('diagram');
      if (!stickyEl || !diagramEl || !headerMaxHeight || boxRects.length === 0) return;

      var imageSrc = diagramEl.src;

      // Create a div for each header box
      var headerDivs = [];
      for (var i = 0; i < boxRects.length; i++) {
        var div = document.createElement('div');
        div.className = 'header-box';
        div.style.backgroundImage = 'url(' + imageSrc + ')';
        stickyEl.appendChild(div);
        headerDivs.push({ div: div, rect: boxRects[i] });
      }

      function updateStickyHeader() {
        var imgRect = diagramEl.getBoundingClientRect();
        var scale = diagramEl.naturalWidth > 0 ? imgRect.width / diagramEl.naturalWidth : 1;
        var scaledHeaderHeight = headerMaxHeight * scale;

        if (imgRect.top < 0 && imgRect.bottom > scaledHeaderHeight) {
          stickyEl.style.display = 'block';
          stickyEl.style.left = imgRect.left + 'px';
          stickyEl.style.width = imgRect.width + 'px';
          stickyEl.style.height = Math.ceil(scaledHeaderHeight) + 'px';

          for (var i = 0; i < headerDivs.length; i++) {
            var h = headerDivs[i];
            var r = h.rect; // [x, y, width, height]
            var s = h.div.style;
            s.display = 'block';
            s.left = (r[0] * scale) + 'px';
            s.top = '0px';
            s.width = (r[2] * scale) + 'px';
            s.height = (r[3] * scale) + 'px';
            s.backgroundPosition = (-r[0] * scale) + 'px ' + (-r[1] * scale) + 'px';
            s.backgroundSize = diagramEl.naturalWidth * scale + 'px ' + diagramEl.naturalHeight * scale + 'px';
          }
        } else {
          stickyEl.style.display = 'none';
        }
      }

      window.addEventListener('scroll', updateStickyHeader);
      window.addEventListener('resize', updateStickyHeader);
      diagramEl.addEventListener('load', updateStickyHeader);
    })();
  </script>
</body>
</html>`;
  }

  private getBaseStyles(): string {
    return `
    body {
      margin: 0;
      padding: 16px;
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      font-family: var(--vscode-font-family);
    }
    .container {
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      padding-top: 24px;
      padding-bottom: 24px;
    }`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private dispose() {
    WsdPreviewPanel.currentPanel = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) { d.dispose(); }
    }
  }
}
