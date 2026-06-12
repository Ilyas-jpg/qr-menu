import "server-only";

import {
  MAX_IMAGES_PER_TENANT,
  MAX_UPLOAD_BYTES,
  deleteImageFilesCore,
  isAllowedMime,
  processProductImageCore,
  type ProcessedImage,
} from "./images-core";

/**
 * Server yüzeyi — saf pipeline lib/images-core.ts'te (seed script'leri de onu kullanır).
 * Bu modül 'server-only': client bundle'a sızması derleme hatasıdır.
 */

export { MAX_IMAGES_PER_TENANT, MAX_UPLOAD_BYTES, isAllowedMime };
export type { ProcessedImage };

export function uploadsRoot(): string {
  const dir = process.env.UPLOADS_DIR;
  if (!dir) throw new Error("UPLOADS_DIR env eksik");
  return dir;
}

export async function processProductImage(
  input: Buffer,
  tenantId: string
): Promise<ProcessedImage> {
  return processProductImageCore(input, tenantId, uploadsRoot());
}

export async function deleteImageFiles(fileStem: string): Promise<void> {
  return deleteImageFilesCore(fileStem, uploadsRoot());
}
