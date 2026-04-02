import { z } from 'zod';
import { ModelItem, ViewItem, Connector, TextBox, Rectangle } from './model';

// Base AI Types
export interface AIInstruction {
  id: string;
  instruction: string;
  context?: DiagramContext;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: AIResult;
  error?: string;
}

export interface DiagramContext {
  currentElements: ModelItem[];
  currentViewItems: ViewItem[];
  viewId: string;
  availableSpace: { x: number; y: number; width: number; height: number };
  existingConnections: Connector[];
  existingTextBoxes: TextBox[];
  existingRectangles: Rectangle[];
}

export interface AIExecutionOptions {
  onToken?: (token: string) => void;
  signal?: AbortSignal;
  chatHistory?: ChatMessage[];
}

export interface AIResult {
  elements: ViewItem[];
  connectors: Connector[];
  textBoxes: TextBox[];
  rectangles: Rectangle[];
  summary: string;
  confidence: number;
  suggestions?: string[];
}

export interface AIModelResponse {
  summary: string;
  confidence: number;
  suggestions: string[];
  changes?: {
    textBoxes?: TextBox[];
    rectangles?: Rectangle[];
    connectors?: Connector[];
    viewItems?: ViewItem[];
  };
}

// AI Schema Types
export interface AISchema {
  id: string;
  name: string;
  description: string;
  category: 'network' | 'flowchart' | 'architecture' | 'custom';
  elements: AISchemaElement[];
  connections: AIConnection[];
  metadata: AISchemaMetadata;
}

export interface AISchemaElement {
  id: string;
  type: 'server' | 'database' | 'client' | 'router' | 'firewall' | 'generic';
  position: { x: number; y: number };
  label: string;
  iconId?: string;
  properties?: Record<string, any>;
}

export interface AIConnection {
  id: string;
  source: string;
  target: string;
  type: 'data' | 'control' | 'network' | 'logical';
  label?: string;
  style?: Partial<Connector>;
}

export interface AISchemaMetadata {
  author?: string;
  version: string;
  tags: string[];
  complexity: 'simple' | 'medium' | 'complex';
  estimatedElements: number;
}

// AI Settings Types
export interface AISettings {
  provider: 'openai' | 'anthropic' | 'local' | 'custom' | 'mock' | 'google';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableLocalProcessing?: boolean;
  privacyMode: 'public' | 'private' | 'anonymous';
  customEndpoint?: string;
}

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  attachments?: ChatAttachment[];
  metadata?: ChatMessageMetadata;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'file' | 'diagram';
  name: string;
  url?: string;
  data?: any;
}

export interface ChatMessageMetadata {
  processingTime?: number;
  tokensUsed?: number;
  confidence?: number;
  relatedActions?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  context?: DiagramContext;
  createdAt: Date;
  updatedAt: Date;
  settings?: Partial<AISettings>;
}

// AI Command Types (Command Pattern)
export interface AICommand {
  id: string;
  type:
    | 'add_element'
    | 'create_schema'
    | 'modify_layout'
    | 'validate_instruction';
  payload: any;
  timestamp: Date;
  status: 'pending' | 'executed' | 'failed' | 'undone';
  result?: any;
}

export interface AddElementCommand extends AICommand {
  type: 'add_element';
  payload: {
    element: ViewItem;
    position: { x: number; y: number };
    connections?: Partial<Connector>[];
  };
}

export interface CreateSchemaCommand extends AICommand {
  type: 'create_schema';
  payload: {
    schema: AISchema;
    position: { x: number; y: number };
  };
}

// AI Provider Types (Strategy Pattern)
export interface AIProvider {
  name: string;
  type: 'openai' | 'anthropic' | 'local' | 'custom' | 'mock' | 'google';
  isConfigured(): boolean;
  processInstruction(
    instruction: string,
    context: DiagramContext,
    options?: AIExecutionOptions
  ): Promise<AIResult>;
  generateSchema(
    description: string,
    category: AISchema['category']
  ): Promise<AISchema>;
  validateInstruction(instruction: string): Promise<ValidationResult>;
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  suggestions: string[];
  warnings: string[];
  estimatedComplexity: 'simple' | 'medium' | 'complex';
}

// AI State Types
export interface AIState {
  currentInstruction: AIInstruction | null;
  isProcessing: boolean;
  availableProviders: AIProvider[];
  activeProvider: AIProvider | null;
  settings: AISettings;
  chatSessions: ChatSession[];
  activeChatSession: string | null;
  commandHistory: AICommand[];
  schemas: AISchema[];
  error: string | null;
}

// Zod Schemas for Validation
export const aiInstructionSchema = z.object({
  id: z.string(),
  instruction: z.string().min(1),
  context: z
    .object({
      currentElements: z.array(z.any()),
      viewId: z.string(),
      availableSpace: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number()
      }),
      existingConnections: z.array(z.any()),
      existingTextBoxes: z.array(z.any()),
      existingRectangles: z.array(z.any())
    })
    .optional(),
  timestamp: z.coerce.date(),
  status: z.enum(['pending', 'processing', 'completed', 'error']),
  result: z.any().optional(),
  error: z.string().optional()
});

export const aiSettingsSchema = z.object({
  provider: z.enum([
    'openai',
    'anthropic',
    'local',
    'custom',
    'mock',
    'google'
  ]),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
  enableLocalProcessing: z.boolean().optional(),
  privacyMode: z.enum(['public', 'private', 'anonymous']),
  customEndpoint: z
    .string()
    .refine(
      (value) => {
        return value.startsWith('/') || /^https?:\/\//.test(value);
      },
      { message: 'customEndpoint must be absolute URL or relative path' }
    )
    .optional()
});

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.coerce.date(),
  attachments: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(['image', 'file', 'diagram']),
        name: z.string(),
        url: z.string().optional(),
        data: z.any().optional()
      })
    )
    .optional(),
  metadata: z
    .object({
      processingTime: z.number().optional(),
      tokensUsed: z.number().optional(),
      confidence: z.number().optional(),
      relatedActions: z.array(z.string()).optional()
    })
    .optional()
});

export const aiSchemaSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  description: z.string(),
  category: z.enum(['network', 'flowchart', 'architecture', 'custom']),
  elements: z.array(
    z.object({
      id: z.string(),
      type: z.enum([
        'server',
        'database',
        'client',
        'router',
        'firewall',
        'generic'
      ]),
      position: z.object({ x: z.number(), y: z.number() }),
      label: z.string(),
      iconId: z.string().optional(),
      properties: z.record(z.any()).optional()
    })
  ),
  connections: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      type: z.enum(['data', 'control', 'network', 'logical']),
      label: z.string().optional(),
      style: z.any().optional()
    })
  ),
  metadata: z.object({
    author: z.string().optional(),
    version: z.string(),
    tags: z.array(z.string()),
    complexity: z.enum(['simple', 'medium', 'complex']),
    estimatedElements: z.number().positive()
  })
});

const aiResponseViewItemSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  iconId: z.string().optional(),
  tile: z.object({ x: z.number(), y: z.number() }),
  labelHeight: z.number().optional()
});

const aiResponseConnectorSchema = z.object({
  id: z.string(),
  style: z.enum(['SOLID', 'DOTTED', 'DASHED']).optional(),
  width: z.number().optional(),
  anchors: z.array(
    z.object({
      id: z.string(),
      ref: z
        .object({
          item: z.string().optional(),
          anchor: z.string().optional(),
          tile: z.object({ x: z.number(), y: z.number() }).optional()
        })
        .default({})
    })
  )
});

const aiResponseTextBoxSchema = z.object({
  id: z.string(),
  tile: z.object({ x: z.number(), y: z.number() }),
  content: z.string(),
  fontSize: z.number().optional(),
  orientation: z.enum(['X', 'Y']).optional()
});

const aiResponseRectangleSchema = z.object({
  id: z.string(),
  color: z.string().optional(),
  from: z.object({ x: z.number(), y: z.number() }),
  to: z.object({ x: z.number(), y: z.number() })
});

export const aiModelResponseSchema = z.object({
  summary: z.string().min(1),
  confidence: z.number().min(0).max(1),
  suggestions: z.array(z.string()).default([]),
  changes: z
    .object({
      textBoxes: z.array(aiResponseTextBoxSchema).optional(),
      rectangles: z.array(aiResponseRectangleSchema).optional(),
      connectors: z.array(aiResponseConnectorSchema).optional(),
      viewItems: z.array(aiResponseViewItemSchema).optional()
    })
    .optional()
});

// Type Guards
export function isValidAIInstruction(obj: any): obj is AIInstruction {
  return aiInstructionSchema.safeParse(obj).success;
}

export function isValidAISettings(obj: any): obj is AISettings {
  return aiSettingsSchema.safeParse(obj).success;
}

export function isValidChatMessage(obj: any): obj is ChatMessage {
  return chatMessageSchema.safeParse(obj).success;
}

export function isValidAISchema(obj: any): obj is AISchema {
  return aiSchemaSchema.safeParse(obj).success;
}

export function isValidAIModelResponse(obj: any): obj is AIModelResponse {
  return aiModelResponseSchema.safeParse(obj).success;
}
