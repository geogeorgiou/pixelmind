export type OutputMimeType = 'image/jpeg' | 'image/png';

export const MIME_TO_EXT: Record<OutputMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
} as const;

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';