type WordSection = {
  heading?: string;
  lines: string[];
};

function esc(text: string): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function downloadWordDocument(fileName: string, title: string, sections: WordSection[]) {
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(title)}</title>
  <style>
    body { font-family: "Times New Roman", Times, serif; font-size: 14pt; color: #222; line-height: 1.35; }
    h1 { font-family: "Times New Roman", Times, serif; font-size: 20pt; margin: 0 0 12px; }
    h2 { font-family: "Times New Roman", Times, serif; font-size: 16pt; margin: 18px 0 8px; }
    p, li { font-family: "Times New Roman", Times, serif; font-size: 14pt; margin: 4px 0; }
    ul { margin: 6px 0 10px 18px; padding: 0; }
  </style>
</head>
<body>
  <h1>${esc(title)}</h1>
  ${sections
    .map((s) => {
      const heading = s.heading ? `<h2>${esc(s.heading)}</h2>` : '';
      const items = `<ul>${s.lines.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>`;
      return `${heading}${items}`;
    })
    .join('')}
</body>
</html>`;

  const blob = new Blob([`\ufeff${html}`], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

