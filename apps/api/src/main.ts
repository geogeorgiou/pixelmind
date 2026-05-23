import express from 'express';
import { ImageGenerationService } from '@org/api-google-genai';
import { apiConfig } from './config';
import { generateImageSchema } from './api.model';

const { host, port, geminiApiKey, outputDir, serviceName } = apiConfig;

const app = express();
const imageService = new ImageGenerationService(geminiApiKey);

app.use(express.json());
app.use('/images', express.static(outputDir));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get('/', (_req, res) => {
  res.json({ message: serviceName });
});

app.post('/api/images/generate', async (req, res) => {
  const parsed = generateImageSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.flatten().fieldErrors });
  }

  const { prompt, numberOfImages, aspectRatio, outputMimeType, save } = parsed.data;

  try {
    const options = { prompt, numberOfImages, aspectRatio, outputMimeType };

    if (save) {
      const result = await imageService.generateAndSave(options, outputDir);
      const baseUrl = `http://${host}:${port}`;
      return res.json({
        success: true,
        data: {
          prompt: result.prompt,
          images: result.saved.map((img) => ({
            filename: img.filename,
            url: `${baseUrl}/images/${img.filename}`,
            mimeType: img.mimeType,
          })),
        },
      });
    }

    const result = await imageService.generateImages(options);
    return res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Image generation failed';
    return res.status(500).json({ success: false, error: message });
  }
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
