import { mkdir, writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import path from 'path';

const MAX_PAYMENT_PROOF_SIZE = 8 * 1024 * 1024;
const ALLOWED_PAYMENT_PROOF_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export async function savePaymentProofFile(file: File) {
  if (!file || file.size === 0) {
    throw new Error('Payment proof file is required');
  }

  if (file.size > MAX_PAYMENT_PROOF_SIZE) {
    throw new Error('Payment proof file must be 8MB or smaller');
  }

  if (!ALLOWED_PAYMENT_PROOF_TYPES.has(file.type)) {
    throw new Error('Payment proof must be a PDF, JPG, PNG, or WEBP file');
  }

  const storageDir = process.env.PAYMENT_PROOF_STORAGE_DIR;
  if (!storageDir) {
    throw new Error('PAYMENT_PROOF_STORAGE_DIR is not configured');
  }

  await mkdir(storageDir, { recursive: true });
  const extension = path.extname(file.name || '').toLowerCase() || '.bin';
  const fileName = `${Date.now()}-${randomUUID()}${extension}`;
  const storagePath = path.join(storageDir, fileName);
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(storagePath, bytes);

  return {
    originalName: file.name || fileName,
    fileName,
    mimeType: file.type,
    size: file.size,
    storagePath,
  };
}
