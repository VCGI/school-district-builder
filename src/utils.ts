// src/utils.ts

export const escapeHtml = (unsafe: string | null | undefined): string => {
  if (unsafe === null || unsafe === undefined) return '';
  const strUnsafe = String(unsafe);
  return strUnsafe
       .replace(/&/g, "&amp;")
       .replace(/</g, "&lt;")
       .replace(/>/g, "&gt;")
       .replace(/"/g, "&quot;")
       .replace(/'/g, "&#039;");
};

export const sanitizeCsvCell = (input: string | number | null | undefined): string => {
  const strInput = String(input ?? '');

  if (strInput.startsWith('=') || strInput.startsWith('+') || strInput.startsWith('-') || strInput.startsWith('@')) {
    const escapedStr = strInput.replace(/"/g, '""');
    return `"'${escapedStr}"`;
  }

  if (strInput.includes(',') || strInput.includes('"') || strInput.includes('\n')) {
    const escapedStr = strInput.replace(/"/g, '""');
    return `"${escapedStr}"`;
  }

  return strInput;
};
