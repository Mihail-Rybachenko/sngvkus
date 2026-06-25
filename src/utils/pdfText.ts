import type jsPDF from 'jspdf';

let fontRegistrationPromise: Promise<boolean> | null = null;

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

async function loadFontBase64(): Promise<string | null> {
  const urls = [
    'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Regular.ttf',
    'https://raw.githubusercontent.com/google/fonts/main/ofl/notosans/NotoSans-Regular.ttf',
  ];
  for (const url of urls) {
    try {
      const response = await fetch(url);
      if (!response.ok) continue;
      const buf = await response.arrayBuffer();
      return uint8ToBase64(new Uint8Array(buf));
    } catch {
      // try next url
    }
  }
  return null;
}

async function tryRegisterUnicodeFont(doc: jsPDF): Promise<boolean> {
  try {
    const fontBase64 = await loadFontBase64();
    if (!fontBase64) return false;

    const api = doc as unknown as {
      addFileToVFS: (fileName: string, data: string) => void;
      addFont: (postScriptName: string, fontName: string, fontStyle: string) => void;
      setFont: (fontName: string, fontStyle?: string) => void;
    };
    api.addFileToVFS('NotoSans-Regular.ttf', fontBase64);
    api.addFont('NotoSans-Regular.ttf', 'NotoSans', 'normal');
    api.setFont('NotoSans', 'normal');
    return true;
  } catch {
    return false;
  }
}

export async function setupPdfText(doc: jsPDF): Promise<{ safe: (s: string) => string }> {
  if (!fontRegistrationPromise) {
    fontRegistrationPromise = tryRegisterUnicodeFont(doc);
  }
  const unicodeReady = await fontRegistrationPromise;
  if (unicodeReady) {
    (doc as unknown as { setFont: (fontName: string, fontStyle?: string) => void }).setFont(
      'NotoSans',
      'normal'
    );
    return { safe: (s: string) => s };
  }
  return { safe: (s: string) => s };
}
