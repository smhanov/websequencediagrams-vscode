import * as vscode from 'vscode';

/**
 * Build a shareable URL for a WSD diagram using client-side LZ77 compression
 * and URL-safe base64 encoding — the same encoding used by the official
 * websequencediagrams.com embed script.
 */
export function buildShareUrl(code: string): string {
  const config = vscode.workspace.getConfiguration('websequencediagrams');
  const style = config.get<string>('style', 'modern-blue');
  const serverUrl = config.get<string>('serverUrl', 'https://www.websequencediagrams.com').replace(/\/+$/, '');

  const encoded = compressDiagramText(code);
  return `${serverUrl}/cgi-bin/cdraw?lz=${encoded}&s=${encodeURIComponent(style)}`;
}

/**
 * Compress diagram text using LZ77 + URL-safe base64, matching the official
 * websequencediagrams.com embed script encoding.
 */
export function compressDiagramText(code: string): string {
  return encodeBase64(encodeLz77(encodeUtf8(code)));
}

// ── UTF-8 encoding ────────────────────────────────────────────────

function encodeUtf8(str: string): string {
  str = str.replace(/\r\n/g, '\n');
  let utftext = '';

  for (let n = 0; n < str.length; n++) {
    const c = str.charCodeAt(n);

    if (c < 128) {
      utftext += String.fromCharCode(c);
    } else if (c > 127 && c < 2048) {
      utftext += String.fromCharCode((c >> 6) | 192);
      utftext += String.fromCharCode((c & 63) | 128);
    } else {
      utftext += String.fromCharCode((c >> 12) | 224);
      utftext += String.fromCharCode(((c >> 6) & 63) | 128);
      utftext += String.fromCharCode((c & 63) | 128);
    }
  }

  return utftext;
}

// ── URL-safe Base64 encoding ──────────────────────────────────────

const BASE64_TABLE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeBase64(str: string): string {
  let result = '';
  let partial = 0;
  let partialSize = 0;

  for (let n = 0; n < str.length; n++) {
    partial = (partial << 8) | str.charCodeAt(n);
    partialSize += 8;
    while (partialSize >= 6) {
      result += BASE64_TABLE.charAt((partial >> (partialSize - 6)) & 0x3f);
      partialSize -= 6;
    }
  }

  if (partialSize) {
    result += BASE64_TABLE.charAt((partial << (6 - partialSize)) & 0x3f);
  }

  return result;
}

// ── LZ77 compression ─────────────────────────────────────────────

function encodeNumber(num: number): string {
  if (num >= 0x3fff) {
    return (
      String.fromCharCode(0x80 | ((num >> 14) & 0x7f)) +
      String.fromCharCode(0x80 | ((num >> 7) & 0x7f)) +
      String.fromCharCode(num & 0x7f)
    );
  } else if (num >= 0x7f) {
    return (
      String.fromCharCode(0x80 | ((num >> 7) & 0x7f)) +
      String.fromCharCode(num & 0x7f)
    );
  } else {
    return String.fromCharCode(num);
  }
}

function encodeLz77(input: string): string {
  const minStringLength = 4;
  let output = '';
  let pos = 0;
  const hash: Record<string, number[]> = {};

  const lastPos = input.length - minStringLength;

  for (let i = minStringLength; i < input.length; i++) {
    const subs = input.substr(i - minStringLength, minStringLength);
    if (hash[subs] === undefined) {
      hash[subs] = [];
    }
    hash[subs].push(i - minStringLength);
  }

  while (pos < lastPos) {
    let matchLength = minStringLength;
    let foundMatch = false;
    const bestMatch = { distance: 0, length: 0 };
    const prefix = input.substr(pos, minStringLength);
    const matches = hash[prefix];

    if (matches !== undefined) {
      for (let i = 0; i < matches.length; i++) {
        const searchStart = matches[i];
        if (searchStart + matchLength >= pos) {
          break;
        }

        while (searchStart + matchLength < pos) {
          const isValidMatch =
            input.substr(searchStart, matchLength) === input.substr(pos, matchLength);
          if (isValidMatch) {
            const realMatchLength = matchLength;
            matchLength++;
            if (foundMatch && realMatchLength > bestMatch.length) {
              bestMatch.distance = pos - searchStart - realMatchLength;
              bestMatch.length = realMatchLength;
            }
            foundMatch = true;
          } else {
            break;
          }
        }
      }
    }

    if (bestMatch.length) {
      output +=
        String.fromCharCode(0) +
        encodeNumber(bestMatch.distance) +
        encodeNumber(bestMatch.length);
      pos += bestMatch.length;
    } else {
      if (input.charCodeAt(pos) !== 0) {
        output += input.charAt(pos);
      } else {
        output += String.fromCharCode(0) + String.fromCharCode(0);
      }
      pos++;
    }
  }

  return output + input.slice(pos).replace(/\0/g, '\0\0');
}
