import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const MAX_SIGNATURE_SIZE = 4 * 1024 * 1024;
const SIGNATURE_TYPES = new Set(['image/png', 'image/jpeg']);

export function getCertificateStorageDir() {
  const storageDir = process.env.CERTIFICATE_STORAGE_DIR;
  if (!storageDir) throw new Error('CERTIFICATE_STORAGE_DIR is not configured');
  return path.resolve(storageDir);
}

function ensureInsideStorage(storagePath: string) {
  const root = getCertificateStorageDir();
  const resolved = path.resolve(storagePath);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid certificate storage path');
  }
  return resolved;
}

export async function saveCertificatePdf(certificateNumber: string, bytes: Uint8Array) {
  const root = getCertificateStorageDir();
  const directory = path.join(root, 'issued');
  await mkdir(directory, { recursive: true });
  const safeNumber = certificateNumber.replace(/[^a-z0-9-]/gi, '_');
  const storagePath = path.join(directory, `${safeNumber}.pdf`);
  await writeFile(storagePath, bytes);
  return storagePath;
}

export async function saveCertificateSignature(file: File) {
  if (!file || file.size === 0) throw new Error('Signature image is required');
  if (file.size > MAX_SIGNATURE_SIZE) throw new Error('Signature image must be 4MB or smaller');
  if (!SIGNATURE_TYPES.has(file.type)) throw new Error('Signature must be a PNG or JPG image');

  const root = getCertificateStorageDir();
  const directory = path.join(root, 'signatures');
  await mkdir(directory, { recursive: true });
  const extension = file.type === 'image/png' ? '.png' : '.jpg';
  const storagePath = path.join(directory, `${Date.now()}-${randomUUID()}${extension}`);
  await writeFile(storagePath, Buffer.from(await file.arrayBuffer()));
  return storagePath;
}

export async function readCertificateAsset(storagePath: string) {
  return readFile(ensureInsideStorage(storagePath));
}
