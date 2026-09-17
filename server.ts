import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is missing.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Helper for resilient Gemini API execution with retry and fallback
async function generateWithRetryAndFallback(params: {
  contents: any;
  config: any;
  primaryModel?: string;
}) {
  const ai = getGeminiClient();
  const modelsToTry = [
    params.primaryModel || 'gemini-3.8-flash',
    'gemini-flash-latest',
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} attempt ${attempt} failed:`, err?.message || err);
        // Wait 1 second if 503 or transient
        if (attempt === 1) {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }
  }

  throw lastError;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// Transcribe and analyze pharmacy audio endpoint
app.post('/api/transcribe-and-analyze', async (req, res) => {
  try {
    const { audioBase64, mimeType, fileName } = req.body;

    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio data is required (base64 string).' });
    }

    const ai = getGeminiClient();

    // Clean base64 string if data URL prefix was passed
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-zA-Z0-9.+_-]+;base64,/, '');
    const cleanMimeType = mimeType || 'audio/webm';

    const promptText = `
You are a senior pharmaceutical specialist and bilingual forensic dialogue analyst specialized in pharmacy customer interactions in Azerbaijan (Baku).
Pharmacy conversations in Baku typically code-switch organically between Azerbaijani (Azəri) and Russian (Русский).
Common medication inquiries include brands like Spasmalgon, Nimesil, Kardiomaqnil, Nurofen, Sumamed (Azithromycin), Linex, Augmentin, No-Shpa, Korvalol, Suprastin, Tebokan, etc.

Your mission is to perform a rigorous end-to-end transcription and clinical/commercial sale evaluation:
1. AUDIO TRANSCRIPTION:
   - Accurately transcribe every utterance word-for-word in its original language, correctly capturing the natural code-switching between Azeri and Russian (e.g., "Salam, sizdə Nimesil var? Bəli, paketi 80 qəpikdir. 5 dənə verin zəhmət olmasa.", "Kardiomaqnil 75 mq bez recepta olar?").
   - Identify each speaker turn: "pharmacist" (Əczaçı / Провизор) or "customer" (Müştəri / Покупатель).
   - Indicate language of each turn: 'az' (Azeri), 'ru' (Russian), or 'mixed'.

2. MEDICAL & PHARMACEUTICAL TERMINOLOGY:
   - Identify every medication and medical product mentioned.
   - For each term, extract:
     * term: exact name as spoken in audio
     * innOrGeneric: the active substance (INN / Təsiredici maddə) in Latin/English or standard nomenclature
     * dosageOrForm: dosage or form (e.g. 75 mg, 100 mq qranul, 20 tablet, sirop, damcı, maz)
     * category: pharmacological group (e.g., Kardiologiya / Antitrombotik, Ağrıkəsici / Qeyri-steroid iltihab əleyhinə (NSAID), Antibiotik, Probiotik, Sedativ)
     * prescriptionStatus: "OTC" (Reseptsiz) or "Prescription (Reseptli)"
     * statusInDialog: 'purchased' (alındı) | 'inquired_not_purchased' | 'out_of_stock' (qalıqda yoxdur) | 'alternative_suggested' | 'refused' (imtina edildi)
     * notes: dosage instructions, contraindications or warnings discussed

3. SALE OCCURRENCE & COMMERCIAL OUTCOME:
   - CRITICALLY DETERMINE WHETHER THE SALE OCCURRED OR NOT:
     * saleOccurred = true: The customer agreed to buy and payment occurred or was committed (e.g. "bükün verin, kartla vurarsız", "buyurun qəbziniz", cash exchanged, change returned, items packaged).
     * saleOccurred = false: The customer left without buying (e.g. medicine out of stock, price deemed too high "çox bahadır, almayacam", prescription required but missing, or customer was only inquiring).
   - confidenceScore: 0 to 100 integer.
   - verdictTitle: Clear punchy outcome title (in Azerbaijani and Russian, e.g. "Satış Baş Tutdu / Продажа состоялась" or "Satış Baş Tutmadı / Продажа не состоялась").
   - verdictExplanation: Precise justification in Azerbaijani and Russian explaining why the sale completed or failed.
   - decisiveEvidence: Spoken quotes/phrases from the recording proving the sale status.
   - nonSaleReason (if false): 'out_of_stock' | 'price_objection' | 'prescription_missing' | 'inquiry_only' | 'alternative_rejected' | 'other'.
   - transactionDetails: currency (e.g. "AZN"), totalAmount (number if mentioned, else null), paymentMethod ('cash' | 'card' | 'unknown').

4. PHARMACIST CONSULTATION QUALITY:
   - Greeting politeness, whether proper dosage explanation was provided, whether prescription was checked for Rx medications.

Output MUST be valid JSON adhering to the provided structure.
`;

    const audioPart = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const response = await generateWithRetryAndFallback({
      primaryModel: 'gemini-3.8-flash',
      contents: {
        parts: [audioPart, { text: promptText }],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.OBJECT,
              properties: {
                fullText: { type: Type.STRING },
                languageMix: {
                  type: Type.OBJECT,
                  properties: {
                    azeriPercentage: { type: Type.NUMBER },
                    russianPercentage: { type: Type.NUMBER },
                  },
                  required: ['azeriPercentage', 'russianPercentage'],
                },
                turns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING, enum: ['pharmacist', 'customer', 'unknown'] },
                      speakerLabel: { type: Type.STRING },
                      originalText: { type: Type.STRING },
                      detectedLanguage: { type: Type.STRING, enum: ['az', 'ru', 'mixed'] },
                      timestampEstimate: { type: Type.STRING },
                    },
                    required: ['speaker', 'speakerLabel', 'originalText', 'detectedLanguage'],
                  },
                },
              },
              required: ['fullText', 'languageMix', 'turns'],
            },
            medicalEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  innOrGeneric: { type: Type.STRING },
                  dosageOrForm: { type: Type.STRING },
                  category: { type: Type.STRING },
                  prescriptionStatus: { type: Type.STRING, enum: ['OTC', 'Prescription (Reseptli)'] },
                  statusInDialog: {
                    type: Type.STRING,
                    enum: ['purchased', 'inquired_not_purchased', 'out_of_stock', 'alternative_suggested', 'refused'],
                  },
                  notes: { type: Type.STRING },
                },
                required: ['term', 'innOrGeneric', 'category', 'prescriptionStatus', 'statusInDialog'],
              },
            },
            saleAnalysis: {
              type: Type.OBJECT,
              properties: {
                saleOccurred: { type: Type.BOOLEAN },
                confidenceScore: { type: Type.NUMBER },
                verdictTitle: { type: Type.STRING },
                verdictExplanation: { type: Type.STRING },
                decisiveEvidence: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nonSaleReason: {
                  type: Type.STRING,
                  enum: ['out_of_stock', 'price_objection', 'prescription_missing', 'inquiry_only', 'alternative_rejected', 'other'],
                },
                nonSaleReasonDescription: { type: Type.STRING },
                transactionDetails: {
                  type: Type.OBJECT,
                  properties: {
                    currency: { type: Type.STRING },
                    totalAmount: { type: Type.NUMBER },
                    paymentMethod: { type: Type.STRING, enum: ['cash', 'card', 'unknown'] },
                    itemsCount: { type: Type.NUMBER },
                  },
                },
              },
              required: ['saleOccurred', 'confidenceScore', 'verdictTitle', 'verdictExplanation', 'decisiveEvidence'],
            },
            pharmacistConsultationScore: {
              type: Type.OBJECT,
              properties: {
                greetingPoliteness: { type: Type.STRING, enum: ['excellent', 'good', 'neutral', 'poor'] },
                dosageExplanationProvided: { type: Type.BOOLEAN },
                prescriptionChecked: { type: Type.BOOLEAN },
                notes: { type: Type.STRING },
              },
            },
          },
          required: ['transcript', 'medicalEntities', 'saleAnalysis'],
        },
      },
    });

    const textOutput = response.text || '';
    let parsedResult;
    try {
      parsedResult = JSON.parse(textOutput);
    } catch {
      // If any trailing character or markdown format
      const cleaned = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    // Attach metadata
    const finalResult = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      fileName: fileName || 'Voice_Recording_' + new Date().toLocaleTimeString(),
      ...parsedResult,
    };

    return res.json(finalResult);
  } catch (error: any) {
    console.error('Error in transcribe-and-analyze:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process audio recording with Gemini.',
      details: error?.toString(),
    });
  }
});

// Process text/dialogue directly (used for instant preset testing and fallback)
app.post('/api/analyze-dialogue-text', async (req, res) => {
  try {
    const { dialogueText, title } = req.body;
    if (!dialogueText) {
      return res.status(400).json({ error: 'dialogueText is required.' });
    }

    const ai = getGeminiClient();
    const promptText = `
You are a senior pharmaceutical specialist and forensic dialogue analyst in Azerbaijan (Baku).
Analyze this transcribed pharmacy dialogue that features natural code-switching between Azerbaijani (Azəri) and Russian (Русский).

Dialogue to analyze:
"""
${dialogueText}
"""

Provide complete analysis:
1. Segment into turns with detected languages (az, ru, mixed).
2. Extract all medical terminology, active substances (INN), dosage/form, OTC/Rx classification, and whether purchased.
3. Determine if the sale occurred (saleOccurred = true/false), confidence score, decisive evidence quotes, payment method/total if mentioned, or reason for non-sale.
4. Pharmacist consultation quality rating.
`;

    const response = await generateWithRetryAndFallback({
      primaryModel: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcript: {
              type: Type.OBJECT,
              properties: {
                fullText: { type: Type.STRING },
                languageMix: {
                  type: Type.OBJECT,
                  properties: {
                    azeriPercentage: { type: Type.NUMBER },
                    russianPercentage: { type: Type.NUMBER },
                  },
                  required: ['azeriPercentage', 'russianPercentage'],
                },
                turns: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      speaker: { type: Type.STRING, enum: ['pharmacist', 'customer', 'unknown'] },
                      speakerLabel: { type: Type.STRING },
                      originalText: { type: Type.STRING },
                      detectedLanguage: { type: Type.STRING, enum: ['az', 'ru', 'mixed'] },
                      timestampEstimate: { type: Type.STRING },
                    },
                    required: ['speaker', 'speakerLabel', 'originalText', 'detectedLanguage'],
                  },
                },
              },
              required: ['fullText', 'languageMix', 'turns'],
            },
            medicalEntities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  innOrGeneric: { type: Type.STRING },
                  dosageOrForm: { type: Type.STRING },
                  category: { type: Type.STRING },
                  prescriptionStatus: { type: Type.STRING, enum: ['OTC', 'Prescription (Reseptli)'] },
                  statusInDialog: {
                    type: Type.STRING,
                    enum: ['purchased', 'inquired_not_purchased', 'out_of_stock', 'alternative_suggested', 'refused'],
                  },
                  notes: { type: Type.STRING },
                },
                required: ['term', 'innOrGeneric', 'category', 'prescriptionStatus', 'statusInDialog'],
              },
            },
            saleAnalysis: {
              type: Type.OBJECT,
              properties: {
                saleOccurred: { type: Type.BOOLEAN },
                confidenceScore: { type: Type.NUMBER },
                verdictTitle: { type: Type.STRING },
                verdictExplanation: { type: Type.STRING },
                decisiveEvidence: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                nonSaleReason: {
                  type: Type.STRING,
                  enum: ['out_of_stock', 'price_objection', 'prescription_missing', 'inquiry_only', 'alternative_rejected', 'other'],
                },
                nonSaleReasonDescription: { type: Type.STRING },
                transactionDetails: {
                  type: Type.OBJECT,
                  properties: {
                    currency: { type: Type.STRING },
                    totalAmount: { type: Type.NUMBER },
                    paymentMethod: { type: Type.STRING, enum: ['cash', 'card', 'unknown'] },
                    itemsCount: { type: Type.NUMBER },
                  },
                },
              },
              required: ['saleOccurred', 'confidenceScore', 'verdictTitle', 'verdictExplanation', 'decisiveEvidence'],
            },
            pharmacistConsultationScore: {
              type: Type.OBJECT,
              properties: {
                greetingPoliteness: { type: Type.STRING, enum: ['excellent', 'good', 'neutral', 'poor'] },
                dosageExplanationProvided: { type: Type.BOOLEAN },
                prescriptionChecked: { type: Type.BOOLEAN },
                notes: { type: Type.STRING },
              },
            },
          },
          required: ['transcript', 'medicalEntities', 'saleAnalysis'],
        },
      },
    });

    const textOutput = response.text || '';
    const parsedResult = JSON.parse(textOutput);

    const finalResult = {
      id: 'text_' + Date.now(),
      timestamp: new Date().toISOString(),
      fileName: title || 'Pharmacy Dialogue Sample',
      ...parsedResult,
    };

    return res.json(finalResult);
  } catch (error: any) {
    console.error('Error in analyze-dialogue-text:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze dialogue.',
    });
  }
});

// Audio conversion endpoint to MP3 and WAV
app.post('/api/convert-audio', async (req, res) => {
  let tmpInPath = '';
  let tmpOutPath = '';

  try {
    const { audioBase64, targetFormat, fileName } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 məlumatı tələb olunur.' });
    }

    const format = (targetFormat || 'mp3').toLowerCase() === 'wav' ? 'wav' : 'mp3';
    const cleanBase64 = audioBase64.includes(',')
      ? audioBase64.split(',')[1]
      : audioBase64;
    const inputBuffer = Buffer.from(cleanBase64, 'base64');

    const randomId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    tmpInPath = path.join(os.tmpdir(), `input_${randomId}`);
    tmpOutPath = path.join(os.tmpdir(), `output_${randomId}.${format}`);

    await fs.promises.writeFile(tmpInPath, inputBuffer);

    const ffmpegArgs = format === 'mp3'
      ? ['-y', '-i', tmpInPath, '-vn', '-ar', '44100', '-ac', '2', '-b:a', '192k', tmpOutPath]
      : ['-y', '-i', tmpInPath, '-vn', '-ar', '44100', '-ac', '2', tmpOutPath];

    execFile('ffmpeg', ffmpegArgs, async (err, stdout, stderr) => {
      try {
        if (err) {
          console.error('ffmpeg conversion error:', stderr);
          return res.status(500).json({ error: 'Audio formatının çevrilməsində xəta baş verdi.', details: stderr });
        }

        const outputBuffer = await fs.promises.readFile(tmpOutPath);
        const mimeType = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
        const sanitizedName = (fileName || 'aptek_ses_yazisi')
          .replace(/[^\w\s\u00C0-\u024F\u0400-\u04FF\-_.]/gi, '_')
          .replace(/\.[^/.]+$/, '');
        const outputFileName = `${sanitizedName}.${format}`;

        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFileName)}"`);
        res.setHeader('Content-Length', outputBuffer.length);
        res.send(outputBuffer);
      } catch (readErr: any) {
        console.error('Error sending converted audio:', readErr);
        res.status(500).json({ error: 'Audio faylını göndərmək mümkün olmadı.' });
      } finally {
        // Clean up temp files
        if (tmpInPath && fs.existsSync(tmpInPath)) {
          fs.promises.unlink(tmpInPath).catch(() => {});
        }
        if (tmpOutPath && fs.existsSync(tmpOutPath)) {
          fs.promises.unlink(tmpOutPath).catch(() => {});
        }
      }
    });
  } catch (err: any) {
    console.error('Conversion endpoint error:', err);
    if (tmpInPath && fs.existsSync(tmpInPath)) {
      fs.promises.unlink(tmpInPath).catch(() => {});
    }
    if (tmpOutPath && fs.existsSync(tmpOutPath)) {
      fs.promises.unlink(tmpOutPath).catch(() => {});
    }
    res.status(500).json({ error: err?.message || 'Server daxili xətası.' });
  }
});

// Vite middleware & Static serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
