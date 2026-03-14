import * as vscode from 'vscode';

/** Result returned by the API client. */
export interface RenderResult {
  /** Base64-encoded image data (PNG format for preview). */
  imageBase64?: string;
  /** Raw image buffer for file export. */
  imageBuffer?: Buffer;
  /** URL to the rendered image on the server. */
  imageUrl?: string;
  /** Error messages from the server (e.g. syntax errors). */
  errors?: string[];
  /** The line number of a syntax error, if available. */
  errorLine?: number;
  /** A shareable permalink URL for the diagram. */
  shareUrl?: string;
  /** Box coordinate data from the server (used for sticky header). */
  boxes?: any[];
}

function getConfig() {
  const config = vscode.workspace.getConfiguration('websequencediagrams');
  const style = config.get<string>('style', 'modern-blue');
  const serverUrl = config.get<string>('serverUrl', 'https://www.websequencediagrams.com');
  // Strip trailing slash
  return { style, serverUrl: serverUrl.replace(/\/+$/, '') };
}

/**
 * Render a diagram using the POST-based API.
 * Returns image data, or error information.
 */
export async function renderDiagram(
  code: string,
  format: string,
  apiKey?: string
): Promise<RenderResult> {
  const { style, serverUrl } = getConfig();

  const body = new URLSearchParams();
  body.append('apiVersion', '1');
  body.append('message', code);
  body.append('style', style);
  body.append('format', format);
  if (apiKey) {
    body.append('apikey', apiKey);
  }

  const url = `${serverUrl}/index.php`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
  } catch (err: any) {
    return { errors: [`Network error: ${err.message || err}`] };
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    return { errors: [`Server returned ${response.status}: ${text || response.statusText}`] };
  }

  // The WSD API returns JSON with an "img" field (relative URL) or "errors" array.
  let json: any;
  try {
    json = await response.json();
  } catch {
    return { errors: ['Failed to parse server response as JSON.'] };
  }

  if (json.errors && json.errors.length > 0) {
    const errorLine = typeof json.line === 'number' ? json.line : undefined;
    const boxes = Array.isArray(json.boxes) ? json.boxes : undefined;
    // The server may still return an image alongside errors (partial render).
    if (json.img) {
      const imageUrl = json.img.startsWith('http') ? json.img : `${serverUrl}/${json.img.replace(/^\//, '')}`;
      return { imageUrl, errors: json.errors, errorLine, boxes };
    }
    return { errors: json.errors, errorLine, boxes };
  }

  if (!json.img) {
    return { errors: ['Server did not return an image URL.'] };
  }

  const imageUrl = json.img.startsWith('http') ? json.img : `${serverUrl}/${json.img.replace(/^\//, '')}`;
  const boxes = Array.isArray(json.boxes) ? json.boxes : undefined;

  return { imageUrl, boxes };
}

/**
 * Download the image at the given URL and return the raw buffer.
 */
export async function downloadImage(imageUrl: string): Promise<Buffer> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Render a diagram and return the image as a base64-encoded data URI (PNG).
 * Used by the live preview panel.
 */
export async function renderDiagramAsBase64(code: string, apiKey?: string): Promise<RenderResult> {
  const result = await renderDiagram(code, 'png', apiKey);

  // If there's an image URL (even alongside errors), download it
  if (result.imageUrl) {
    try {
      const buffer = await downloadImage(result.imageUrl);
      return {
        imageBase64: buffer.toString('base64'),
        imageUrl: result.imageUrl,
        errors: result.errors,
        errorLine: result.errorLine,
        boxes: result.boxes,
      };
    } catch (err: any) {
      // If download fails but we had errors from the server, return those
      if (result.errors) {
        return result;
      }
      return { errors: [`Failed to fetch rendered image: ${err.message || err}`] };
    }
  }

  return result;
}

/**
 * Export a diagram in the given format (svg, png, pdf).
 * Returns the raw binary buffer.
 */
export async function exportDiagram(
  code: string,
  format: string,
  apiKey?: string
): Promise<{ buffer?: Buffer; errors?: string[] }> {
  const result = await renderDiagram(code, format, apiKey);

  // Export the image if available, ignoring syntax errors
  if (result.imageUrl) {
    try {
      const buffer = await downloadImage(result.imageUrl);
      return { buffer };
    } catch (err: any) {
      return { errors: [`Failed to download export: ${err.message || err}`] };
    }
  }

  return { errors: result.errors || ['Export failed: no image URL returned.'] };
}
