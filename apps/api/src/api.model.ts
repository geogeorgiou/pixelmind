import { z } from 'zod';
import type { OutputMimeType } from '@org/models';

export const generateImageSchema = z.object({
  prompt: z.string().min(1),
  numberOfImages: z.number().int().min(1).max(8).optional().default(1),
  aspectRatio: z.enum(['1:1', '3:4', '4:3', '9:16', '16:9']).optional().default('1:1'),
  outputMimeType: z.enum(['image/jpeg', 'image/png'] as [OutputMimeType, OutputMimeType]).optional().default('image/jpeg'),
  save: z.boolean().optional().default(true),
});

export type GenerateImageInput = z.infer<typeof generateImageSchema>;