import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ImageGenerationService } from './image-generation.service';

const mockGenerateImages = vi.fn();

vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(function () {
    this.models = { generateImages: mockGenerateImages };
  }),
}));

vi.mock('node:fs/promises', () => ({
  writeFile: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('node:crypto', () => ({
  randomUUID: vi.fn().mockReturnValue('test-uuid'),
}));

const makeResponse = (images: { imageBytes: string }[]) => ({
  generatedImages: images.map((img) => ({ image: img })),
});

describe('ImageGenerationService', () => {
  let service: ImageGenerationService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ImageGenerationService('test-api-key');
  });

  describe('generateImages', () => {
    it('returns images with base64 data', async () => {
      mockGenerateImages.mockResolvedValue(makeResponse([{ imageBytes: 'abc123' }]));

      const result = await service.generateImages({ prompt: 'a cat' });

      expect(result.prompt).toBe('a cat');
      expect(result.images).toHaveLength(1);
      expect(result.images[0].base64Data).toBe('abc123');
      expect(result.images[0].mimeType).toBe('image/jpeg');
    });

    it('passes options to the API', async () => {
      mockGenerateImages.mockResolvedValue(makeResponse([{ imageBytes: 'xyz' }]));

      await service.generateImages({
        prompt: 'a dog',
        numberOfImages: 2,
        aspectRatio: '16:9',
        outputMimeType: 'image/png',
        negativePrompt: 'blurry',
      });

      expect(mockGenerateImages).toHaveBeenCalledWith({
        model: 'imagen-4.0-generate-001',
        prompt: 'a dog',
        config: {
          numberOfImages: 2,
          aspectRatio: '16:9',
          outputMimeType: 'image/png',
          negativePrompt: 'blurry',
        },
      });
    });

    it('omits negativePrompt when not provided', async () => {
      mockGenerateImages.mockResolvedValue(makeResponse([{ imageBytes: 'xyz' }]));

      await service.generateImages({ prompt: 'a tree' });

      const call = mockGenerateImages.mock.calls[0][0];
      expect(call.config).not.toHaveProperty('negativePrompt');
    });

    it('filters out images with no imageBytes', async () => {
      mockGenerateImages.mockResolvedValue({
        generatedImages: [
          { image: { imageBytes: 'valid' } },
          { image: null },
          { image: {} },
        ],
      });

      const result = await service.generateImages({ prompt: 'test' });

      expect(result.images).toHaveLength(1);
      expect(result.images[0].base64Data).toBe('valid');
    });

    it('returns empty images when generatedImages is undefined', async () => {
      mockGenerateImages.mockResolvedValue({});

      const result = await service.generateImages({ prompt: 'test' });

      expect(result.images).toHaveLength(0);
    });

    it('throws when API rejects', async () => {
      mockGenerateImages.mockRejectedValue(new Error('API error'));

      await expect(service.generateImages({ prompt: 'test' })).rejects.toThrow('API error');
    });
  });

  describe('generateAndSave', () => {
    it('saves images to disk and returns paths', async () => {
      const { writeFile, mkdir } = await import('node:fs/promises');
      mockGenerateImages.mockResolvedValue(makeResponse([{ imageBytes: 'aGVsbG8=' }]));

      const result = await service.generateAndSave({ prompt: 'a bird' }, '/tmp/images');

      expect(mkdir).toHaveBeenCalledWith('/tmp/images', { recursive: true });
      expect(writeFile).toHaveBeenCalledWith(
        '/tmp/images/test-uuid.jpg',
        Buffer.from('aGVsbG8=', 'base64')
      );
      expect(result.saved).toHaveLength(1);
      expect(result.saved[0]).toEqual({
        filename: 'test-uuid.jpg',
        filePath: '/tmp/images/test-uuid.jpg',
        mimeType: 'image/jpeg',
      });
      expect(result.prompt).toBe('a bird');
    });

    it('uses png extension for image/png mimeType', async () => {
      const { writeFile } = await import('node:fs/promises');
      mockGenerateImages.mockResolvedValue(makeResponse([{ imageBytes: 'data' }]));

      await service.generateAndSave(
        { prompt: 'test', outputMimeType: 'image/png' },
        '/tmp/out'
      );

      expect(writeFile).toHaveBeenCalledWith('/tmp/out/test-uuid.png', expect.any(Buffer));
    });

    it('returns empty saved array when no images generated', async () => {
      mockGenerateImages.mockResolvedValue({});

      const result = await service.generateAndSave({ prompt: 'test' }, '/tmp/out');

      expect(result.saved).toHaveLength(0);
    });
  });
});
