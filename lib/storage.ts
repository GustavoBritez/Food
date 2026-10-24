import type { SupabaseClient } from '@supabase/supabase-js';

const BUCKET = 'menus';
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // antes de comprimir
const MAX_SIDE = 1200;

/** Reduce y convierte a WebP en el navegador: fotos de celular de 4 MB -> ~150 KB */
async function compressImage(file: File): Promise<Blob> {
  if (typeof createImageBitmap === 'undefined') return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.82)
  );
  return blob && blob.size < file.size ? blob : file;
}

const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
};

/** Sube una imagen a menus/{userId}/{uuid}.ext y devuelve la URL pública */
export async function uploadImage(supabase: SupabaseClient, userId: string, file: File) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo tiene que ser una imagen.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('La imagen es muy pesada (máx. 15 MB).');

  const blob = await compressImage(file);
  const type = EXT[blob.type] ? blob.type : 'image/jpeg';
  const path = `${userId}/${crypto.randomUUID()}.${EXT[type]}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error('No se pudo subir la imagen. Probá de nuevo.');

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

const VIDEO_EXT: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
};
const MAX_VIDEO_BYTES = 4 * 1024 * 1024; // 4 MB máx. para proteger egress de Supabase

/** Sube un video corto (sin recomprimir) a menus/{userId}/{uuid}.ext */
export async function uploadVideo(supabase: SupabaseClient, userId: string, file: File) {
  const ext = VIDEO_EXT[file.type];
  if (!ext) throw new Error('El video tiene que ser MP4, WEBM o MOV.');
  if (file.size > MAX_VIDEO_BYTES) throw new Error('El video es muy pesado (máx. 4 MB). Probá con uno más corto o comprimido.');

  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw new Error('No se pudo subir el video. Probá de nuevo.');

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Borra (best-effort) una imagen propia a partir de su URL pública */
export async function removeImageByUrl(supabase: SupabaseClient, url: string | null | undefined) {
  if (!url) return;
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return; // no es de nuestro bucket (ej: seed con Unsplash)
  const path = decodeURIComponent(url.slice(idx + marker.length).split('?')[0]);
  await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
}
