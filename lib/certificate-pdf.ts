import { readFile } from 'fs/promises';
import path from 'path';
import QRCode from 'qrcode';
import { degrees, PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import { readCertificateAsset } from './certificate-storage';

export interface CertificatePdfData {
  studentName: string;
  courseTitle: string;
  achievementWording: string;
  completionDate: Date;
  signatoryName: string;
  signatoryTitle: string;
  signaturePath?: string | null;
  certificateNumber: string;
  verificationUrl: string;
  preview?: boolean;
}

function centeredX(pageWidth: number, text: string, font: PDFFont, size: number) {
  return (pageWidth - font.widthOfTextAtSize(text, size)) / 2;
}

function fitFontSize(text: string, font: PDFFont, maxWidth: number, preferred: number, minimum: number) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || font.widthOfTextAtSize(candidate, size) <= maxWidth) current = candidate;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawCenteredLines(page: PDFPage, lines: string[], font: PDFFont, size: number, startY: number, color = rgb(0.18, 0.2, 0.24), gap = 1.25) {
  for (const [index, line] of lines.entries()) {
    page.drawText(line, { x: centeredX(page.getWidth(), line, font, size), y: startY - index * size * gap, size, font, color });
  }
}

async function embedImage(document: PDFDocument, bytes: Uint8Array, extensionHint: string) {
  if (extensionHint.toLowerCase().endsWith('.png')) return document.embedPng(bytes);
  return document.embedJpg(bytes);
}

export async function generateCertificatePdf(data: CertificatePdfData) {
  const document = await PDFDocument.create();
  const page = document.addPage([1440, 1000]);
  const width = page.getWidth();
  const height = page.getHeight();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.03, 0.16, 0.32);
  const blue = rgb(0.25, 0.43, 0.85);
  const yellow = rgb(1, 0.7, 0.04);
  const red = rgb(0.89, 0.09, 0.2);
  const charcoal = rgb(0.18, 0.18, 0.19);

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(1, 1, 1) });
  page.drawEllipse({ x: 1210, y: 930, xScale: 370, yScale: 300, color: blue, opacity: 0.92 });
  page.drawEllipse({ x: 1040, y: 940, xScale: 350, yScale: 210, color: rgb(0.9, 0.92, 0.99), opacity: 0.92 });
  page.drawEllipse({ x: 50, y: -40, xScale: 500, yScale: 245, color: yellow });
  page.drawEllipse({ x: 35, y: 20, xScale: 390, yScale: 165, color: rgb(1, 0.78, 0.08) });
  page.drawCircle({ x: 1350, y: 620, size: 34, borderColor: blue, borderWidth: 15 });
  page.drawCircle({ x: 170, y: 365, size: 45, borderColor: blue, borderWidth: 18, opacity: 0.85 });
  page.drawRectangle({ x: 55, y: 790, width: 48, height: 48, color: red, rotate: degrees(14) });

  page.drawText('CERTIFICATE', { x: centeredX(width, 'CERTIFICATE', bold, 61), y: 795, font: bold, size: 61, color: charcoal });
  page.drawText('OF COMPLETION', { x: centeredX(width, 'OF COMPLETION', regular, 32), y: 755, font: regular, size: 32, color: charcoal });
  page.drawText('THIS CERTIFICATE IS PROUDLY PRESENTED TO', { x: centeredX(width, 'THIS CERTIFICATE IS PROUDLY PRESENTED TO', regular, 18), y: 640, font: regular, size: 18, color: charcoal });

  const nameSize = fitFontSize(data.studentName, bold, 960, 58, 32);
  page.drawText(data.studentName, { x: centeredX(width, data.studentName, bold, nameSize), y: 510, font: bold, size: nameSize, color: charcoal });
  page.drawText('for the successful completion of', { x: centeredX(width, 'for the successful completion of', regular, 22), y: 445, font: regular, size: 22, color: charcoal });

  const titleSize = fitFontSize(data.courseTitle.toUpperCase(), bold, 1020, 29, 20);
  const titleLines = wrapText(data.courseTitle.toUpperCase(), bold, titleSize, 1020).slice(0, 2);
  drawCenteredLines(page, titleLines, bold, titleSize, 397, charcoal, 1.12);
  const achievementStart = 397 - titleLines.length * titleSize * 1.15 - 18;
  const achievementLines = wrapText(data.achievementWording, regular, 20, 900).slice(0, 3);
  drawCenteredLines(page, achievementLines, regular, 20, achievementStart, charcoal, 1.22);

  try {
    const logoPath = path.join(process.cwd(), 'public', 'brand', '9ck-black-full-logo.png');
    const logoBytes = await readFile(logoPath);
    const logo = await document.embedPng(logoBytes);
    const scaled = logo.scaleToFit(285, 95);
    page.drawImage(logo, { x: 72, y: 78, width: scaled.width, height: scaled.height });
  } catch {
    page.drawText('9JACODEKIDS', { x: 80, y: 105, font: bold, size: 32, color: navy });
  }

  if (data.signaturePath) {
    try {
      const signatureBytes = await readCertificateAsset(data.signaturePath);
      const signature = await embedImage(document, signatureBytes, data.signaturePath);
      const scaled = signature.scaleToFit(220, 72);
      page.drawImage(signature, { x: 675 - scaled.width / 2, y: 123, width: scaled.width, height: scaled.height });
    } catch {
      // The printed signatory name remains the fallback if the asset is unavailable.
    }
  }
  page.drawLine({ start: { x: 560, y: 120 }, end: { x: 790, y: 120 }, thickness: 1, color: rgb(0.55, 0.55, 0.55) });
  page.drawText(data.signatoryName.toUpperCase(), { x: 675 - bold.widthOfTextAtSize(data.signatoryName.toUpperCase(), 15) / 2, y: 96, font: bold, size: 15, color: charcoal });
  page.drawText(data.signatoryTitle, { x: 675 - regular.widthOfTextAtSize(data.signatoryTitle, 13) / 2, y: 76, font: regular, size: 13, color: charcoal });

  const formattedDate = data.completionDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
  page.drawLine({ start: { x: 930, y: 120 }, end: { x: 1160, y: 120 }, thickness: 1, color: rgb(0.55, 0.55, 0.55) });
  page.drawText(formattedDate, { x: 1045 - bold.widthOfTextAtSize(formattedDate, 15) / 2, y: 96, font: bold, size: 15, color: charcoal });
  page.drawText('COMPLETION DATE', { x: 1045 - regular.widthOfTextAtSize('COMPLETION DATE', 12) / 2, y: 76, font: regular, size: 12, color: charcoal });

  const qrDataUrl = await QRCode.toDataURL(data.verificationUrl, { margin: 1, width: 220, errorCorrectionLevel: 'M' });
  const qr = await document.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
  page.drawImage(qr, { x: 1230, y: 55, width: 115, height: 115 });
  page.drawText(data.certificateNumber, { x: 1200, y: 35, font: regular, size: 10, color: charcoal });

  if (data.preview) {
    page.drawText('PREVIEW', { x: 480, y: 390, font: bold, size: 115, color: rgb(0.45, 0.5, 0.6), opacity: 0.16, rotate: degrees(28) });
  }

  return document.save();
}
