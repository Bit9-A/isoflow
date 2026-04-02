import {
  AIExecutionOptions,
  AIModelResponse,
  AIResult,
  AISchema,
  AISettings,
  DiagramContext,
  ValidationResult,
  aiModelResponseSchema
} from 'src/types/ai';
import { generateId } from 'src/utils';
import { buildSystemPrompt, buildUserPrompt } from './diagramPrompt';

const GEMINI_MODELS_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models';

const fallbackResult = (instruction: string): AIResult => {
  return {
    elements: [],
    connectors: [],
    textBoxes: [],
    rectangles: [],
    summary: `Analisis mock completado para: ${instruction}`,
    confidence: 0.6,
    suggestions: [
      'Habilitar cifrado en transito y en reposo.',
      'Aplicar principio de minimo privilegio en IAM.'
    ]
  };
};

const parseSsePayloadToken = (line: string): string => {
  if (!line.startsWith('data: ')) {
    return '';
  }

  const payload = line.slice(6);

  if (!payload || payload === '[DONE]') {
    return '';
  }

  try {
    const parsed = JSON.parse(payload) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>;
        };
      }>;
    };

    const parts = parsed.candidates?.[0]?.content?.parts ?? [];

    // For thinking models: skip parts where thought === true
    // Only concatenate actual output text
    return parts
      .filter((part) => {
        return !part.thought;
      })
      .map((part) => {
        return part.text ?? '';
      })
      .join('');
  } catch {
    return '';
  }
};

const streamGeminiResponse = async (
  response: Response,
  onToken?: (token: string) => void
): Promise<string> => {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error('No se pudo iniciar el stream de respuesta.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const readNext = async (): Promise<void> => {
    const readChunk = await reader.read();

    if (readChunk.done) {
      return;
    }

    buffer += decoder.decode(readChunk.value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (let index = 0; index < lines.length; index += 1) {
      const token = parseSsePayloadToken(lines[index].trim());

      if (token) {
        fullText += token;
        if (onToken) {
          onToken(token);
        }
      }
    }

    await readNext();
  };

  await readNext();

  // eslint-disable-next-line no-console
  console.debug('[Isoflow AI] Raw response text:', fullText.substring(0, 500));

  return fullText.trim();
};

const extractJsonObject = (text: string): unknown => {
  // eslint-disable-next-line no-console
  console.debug('[Isoflow AI] extractJsonObject input length:', text.length);
  // eslint-disable-next-line no-console
  console.debug('[Isoflow AI] extractJsonObject input preview:', text.substring(0, 400));

  // Strip markdown code fences that thinking models may add
  let cleaned = text
    .replace(/```(?:json)?\s*/gi, '')
    .replace(/```/g, '')
    .trim();

  // Strip thinking tags if present
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Remove any leading/trailing non-JSON text (e.g. "Here is the JSON:")
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // Try direct parse first (ideal case)
  try {
    return JSON.parse(cleaned);
  } catch {
    // fall through
  }

  // Find the first { and match braces to extract the JSON object
  const start = cleaned.indexOf('{');

  if (start === -1) {
    // eslint-disable-next-line no-console
    console.error('[Isoflow AI] No JSON object found in response:', cleaned.substring(0, 500));
    throw new Error('La respuesta de IA no contiene un JSON valido.');
  }

  let depth = 0;
  let end = -1;

  for (let i = start; i < cleaned.length; i += 1) {
    if (cleaned[i] === '{') depth += 1;
    if (cleaned[i] === '}') depth -= 1;

    if (depth === 0) {
      end = i;
      break;
    }
  }

  if (end === -1) {
    // eslint-disable-next-line no-console
    console.error('[Isoflow AI] Unbalanced braces in response:', cleaned.substring(0, 500));
    throw new Error('La respuesta de IA no contiene un JSON valido.');
  }

  const candidate = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch (parseError) {
    // eslint-disable-next-line no-console
    console.error('[Isoflow AI] Failed to parse extracted JSON:', candidate.substring(0, 500), parseError);
    throw new Error('La respuesta de IA no contiene un JSON valido.');
  }
};

const mapResponseToResult = (payload: AIModelResponse): AIResult => {
  const changes = payload.changes ?? {};

  return {
    elements: changes.viewItems ?? [],
    connectors: changes.connectors ?? [],
    textBoxes: changes.textBoxes ?? [],
    rectangles: changes.rectangles ?? [],
    summary: payload.summary,
    confidence: payload.confidence,
    suggestions: payload.suggestions
  };
};

const resolveModel = (settings: AISettings): string => {
  return settings.model?.trim() || 'gemini-2.5-flash';
};

const resolveEndpoint = (settings: AISettings): string | null => {
  if (!settings.customEndpoint) {
    return null;
  }

  return settings.customEndpoint;
};

const handleProviderError = (
  error: unknown,
  fallbackMessage: string
): never => {
  if (error instanceof Error) {
    throw error;
  }

  if (typeof error === 'string') {
    throw new Error(error);
  }

  throw new Error(fallbackMessage);
};

export const processInstructionWithProvider = async (
  instruction: string,
  context: DiagramContext,
  settings: AISettings,
  options?: AIExecutionOptions
): Promise<AIResult> => {
  const { provider } = settings;
  const endpointFromProxy = resolveEndpoint(settings);

  if (endpointFromProxy) {
    const response = await fetch(endpointFromProxy, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: options?.signal,
      body: JSON.stringify({
        generationConfig: {
          temperature: settings.temperature ?? 0.3,
          maxOutputTokens: settings.maxTokens ?? 2000,
          responseMimeType: 'application/json'
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: buildUserPrompt(instruction, context) }]
          }
        ],
        systemInstruction: {
          parts: [{ text: buildSystemPrompt() }]
        }
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Proxy AI request failed (${response.status}): ${body}`);
    }

    const rawText = await streamGeminiResponse(response, options?.onToken);
    const parsed = extractJsonObject(rawText);
    const validated = aiModelResponseSchema.parse(parsed);

    return mapResponseToResult(validated);
  }

  if (provider === 'google') {
    const apiKey = settings.apiKey?.trim();

    if (!apiKey) {
      throw new Error('Google AI requires apiKey or customEndpoint proxy.');
    }

    const model = resolveModel(settings);
    const endpoint = `${GEMINI_MODELS_ENDPOINT}/${model}:generateContent?key=${apiKey}`;

    const maxRetries = 3;

    const requestBody = {
      generationConfig: {
        temperature: settings.temperature ?? 0.3,
        maxOutputTokens: settings.maxTokens ?? 4096,
        responseMimeType: 'application/json'
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: buildUserPrompt(instruction, context) }]
        }
      ],
      systemInstruction: {
        parts: [{ text: buildSystemPrompt() }]
      }
    };

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        // eslint-disable-next-line no-console
        console.debug(`[Isoflow AI] Attempt ${attempt}/${maxRetries} — ${model}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: options?.signal,
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const body = await response.text();

          // On 429 rate limit, wait and retry
          if (response.status === 429 && attempt < maxRetries) {
            // eslint-disable-next-line no-console
            console.warn(`[Isoflow AI] Rate limited, retrying in 2s...`);
            await new Promise((resolve) => {
              return setTimeout(resolve, 2000);
            });
            continue;
          }

          throw new Error(
            `Error HTTP ${response.status} al consultar Gemini: ${body}`
          );
        }

        const json = await response.json();

        // eslint-disable-next-line no-console
        console.debug(
          '[Isoflow AI] Response keys:',
          Object.keys(json),
          'candidates:',
          json.candidates?.length ?? 0
        );

        // Extract text from all non-thought parts across all candidates
        const candidates = json.candidates ?? [];

        if (candidates.length === 0) {
          // eslint-disable-next-line no-console
          console.warn('[Isoflow AI] No candidates in response:', JSON.stringify(json).substring(0, 500));

          if (attempt < maxRetries) {
            await new Promise((resolve) => {
              return setTimeout(resolve, 1000);
            });
            continue;
          }

          throw new Error('La IA no generó ninguna respuesta. Intenta de nuevo.');
        }

        const allParts = candidates[0]?.content?.parts ?? [];

        // eslint-disable-next-line no-console
        console.debug(
          '[Isoflow AI] Parts count:',
          allParts.length,
          'Types:',
          allParts.map((p: { thought?: boolean; text?: string }) => {
            return p.thought ? 'THOUGHT' : 'TEXT';
          })
        );

        const rawText = allParts
          .filter((p: { thought?: boolean }) => {
            return !p.thought;
          })
          .map((p: { text?: string }) => {
            return p.text ?? '';
          })
          .join('');

        // eslint-disable-next-line no-console
        console.debug('[Isoflow AI] Extracted text length:', rawText.length);
        // eslint-disable-next-line no-console
        console.debug('[Isoflow AI] Extracted text preview:', rawText.substring(0, 300));

        if (!rawText.trim()) {
          // eslint-disable-next-line no-console
          console.warn('[Isoflow AI] Empty text after filtering thoughts. Raw parts:', JSON.stringify(allParts).substring(0, 500));

          if (attempt < maxRetries) {
            await new Promise((resolve) => {
              return setTimeout(resolve, 1000);
            });
            continue;
          }

          throw new Error(
            'La IA devolvió una respuesta vacía. Intenta reformular tu pregunta.'
          );
        }

        // Deliver text to UI
        if (options?.onToken) {
          const words = rawText.split(' ');
          for (let wi = 0; wi < words.length; wi += 1) {
            options.onToken((wi > 0 ? ' ' : '') + words[wi]);
          }
        }

        const parsed = extractJsonObject(rawText);
        const validated = aiModelResponseSchema.parse(parsed);

        return mapResponseToResult(validated);
      } catch (error) {
        if (attempt >= maxRetries) {
          handleProviderError(error, 'Fallo en proveedor Google AI');
        }

        // eslint-disable-next-line no-console
        console.warn(`[Isoflow AI] Attempt ${attempt} failed:`, error);
        await new Promise((resolve) => {
          return setTimeout(resolve, 1000);
        });
      }
    }

    throw new Error('Se agotaron los reintentos con la IA.');
  }

  const mock = fallbackResult(instruction);
  if (options?.onToken) {
    Array.from(mock.summary).forEach((char) => {
      options.onToken?.(char);
    });
  }

  return mock;
};

export const generateSchemaWithProvider = async (
  description: string,
  category: AISchema['category']
): Promise<AISchema> => {
  return {
    id: generateId(),
    name: `Generated ${category} schema`,
    description,
    category,
    elements: [],
    connections: [],
    metadata: {
      version: '1.0.0',
      tags: [category, 'ai-generated'],
      complexity: 'medium',
      estimatedElements: 0
    }
  };
};

export const validateInstructionWithProvider = async (
  instruction: string
): Promise<ValidationResult> => {
  const confidence = instruction.trim().length > 12 ? 0.85 : 0.4;
  const hasLowConfidence = confidence < 0.5;

  return {
    isValid: instruction.trim().length > 0,
    confidence,
    suggestions: hasLowConfidence
      ? ['Describe el objetivo tecnico y restricciones del diagrama.']
      : [],
    warnings: hasLowConfidence
      ? ['La instruccion es demasiado breve para cambios precisos.']
      : [],
    estimatedComplexity: instruction.length > 80 ? 'complex' : 'medium'
  };
};
