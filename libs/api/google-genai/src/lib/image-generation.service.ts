import { GoogleGenAI, type GenerateImagesResponse } from '@google/genai';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { OutputMimeType, MIME_TO_EXT, AspectRatio } from '@org/models';
import { ImageGenerationModel } from './image-generation.model';


export interface GenerateImageOptions {
  prompt: string;
  numberOfImages?: number;
  aspectRatio?: AspectRatio;
  outputMimeType?: OutputMimeType;
  negativePrompt?: string;
}

export interface GeneratedImage {
  base64Data: string;
  mimeType: OutputMimeType;
}

export interface SavedImage {
  filename: string;
  filePath: string;
  mimeType: OutputMimeType;
}

export interface GenerateImageResult {
  images: GeneratedImage[];
  prompt: string;
}

export interface GenerateAndSaveResult {
  saved: SavedImage[];
  prompt: string;
}

export class ImageGenerationService {
  private readonly ai: GoogleGenAI;
  private readonly model: ImageGenerationModel = 'imagen-4.0-generate-001';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generateImages(options: GenerateImageOptions): Promise<GenerateImageResult> {
    const {
      prompt,
      numberOfImages = 1,
      aspectRatio = '1:1',
      outputMimeType = 'image/jpeg',
      negativePrompt,
    } = options;

    const response: GenerateImagesResponse = await this.ai.models.generateImages({
      model: this.model,
      prompt,
      config: {
        numberOfImages,
        aspectRatio,
        outputMimeType,
        ...(negativePrompt ? { negativePrompt } : {}),
      },
    });

    const images: GeneratedImage[] = (response.generatedImages ?? [])
      .filter((img) => img.image?.imageBytes != null)
      .map((img) => ({
        base64Data: img.image!.imageBytes as string,
        mimeType: outputMimeType,
      }));

    return { images, prompt };
  }

  async generateAndSave(options: GenerateImageOptions, outputDir: string): Promise<GenerateAndSaveResult> {
    const result = await this.generateImages(options);
    await mkdir(outputDir, { recursive: true });

    const saved: SavedImage[] = await Promise.all(
      result.images.map(async (img) => {
        const ext = MIME_TO_EXT[img.mimeType];
        const filename = `${randomUUID()}.${ext}`;
        const filePath = join(outputDir, filename);
        await writeFile(filePath, Buffer.from(img.base64Data, 'base64'));
        return { filename, filePath, mimeType: img.mimeType };
      })
    );

    return { saved, prompt: result.prompt };
  }
}
