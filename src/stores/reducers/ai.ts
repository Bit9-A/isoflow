import { produce } from 'immer';
import { generateId } from 'src/utils';
import { AIInstruction, AISchema, AICommand, AISettings } from 'src/types/ai';
import type { State } from './types';

// AI Instruction Reducers
export const executeAIInstruction = (
  instruction: AIInstruction,
  state: State
): State => {
  return produce(state, (draft) => {
    // Add instruction to model if not exists
    if (!draft.model.aiInstructions) {
      draft.model.aiInstructions = [];
    }

    const existingIndex = draft.model.aiInstructions.findIndex((inst) => {
      return inst.id === instruction.id;
    });

    if (existingIndex >= 0) {
      draft.model.aiInstructions[existingIndex] = instruction;
    } else {
      draft.model.aiInstructions.push(instruction);
    }

    // Update current instruction status
    draft.model.aiInstructions = draft.model.aiInstructions.map((inst) => {
      return inst.id === instruction.id
        ? { ...inst, status: 'processing', timestamp: new Date() }
        : inst;
    });
  });
};

export const updateAIInstruction = (
  id: string,
  updates: Partial<AIInstruction>,
  state: State
): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiInstructions) return;

    draft.model.aiInstructions = draft.model.aiInstructions.map((inst) => {
      return inst.id === id
        ? { ...inst, ...updates, timestamp: new Date() }
        : inst;
    });
  });
};

export const deleteAIInstruction = (id: string, state: State): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiInstructions) return;

    draft.model.aiInstructions = draft.model.aiInstructions.filter((inst) => {
      return inst.id !== id;
    });
  });
};

// AI Schema Reducers
export const createAISchema = (schema: AISchema, state: State): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiSchemas) {
      draft.model.aiSchemas = [];
    }

    // Ensure schema has unique ID
    const newSchema = {
      ...schema,
      id: schema.id || generateId(),
      metadata: {
        ...schema.metadata,
        version: schema.metadata.version || '1.0.0'
      }
    };

    draft.model.aiSchemas.push(newSchema);
  });
};

export const updateAISchema = (
  id: string,
  updates: Partial<AISchema>,
  state: State
): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiSchemas) return;

    draft.model.aiSchemas = draft.model.aiSchemas.map((schema) => {
      return schema.id === id ? { ...schema, ...updates } : schema;
    });
  });
};

export const deleteAISchema = (id: string, state: State): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiSchemas) return;

    draft.model.aiSchemas = draft.model.aiSchemas.filter((schema) => {
      return schema.id !== id;
    });
  });
};

// AI Settings Reducers
export const updateAISettings = (settings: AISettings, state: State): State => {
  return produce(state, (draft) => {
    // Initialize aiSettings if it doesn't exist
    if (!draft.model.aiSettings) {
      draft.model.aiSettings = {
        provider: 'google',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY || '',
        privacyMode: 'private',
        temperature: 0.3,
        maxTokens: 2000
      };
    }
    draft.model.aiSettings = { ...draft.model.aiSettings, ...settings };
  });
};

// AI Command Reducers (Command Pattern Implementation)
export const addAICommand = (command: AICommand, state: State): State => {
  return produce(state, (draft) => {
    // Initialize command history if needed
    if (!draft.model.aiInstructions) {
      draft.model.aiInstructions = [];
    }

    // Store command in instruction metadata for tracking
    const instruction = draft.model.aiInstructions.find((inst) => {
      return inst.id === command.id;
    });

    if (instruction) {
      instruction.result = {
        elements: [],
        connectors: [],
        textBoxes: [],
        rectangles: [],
        summary: `Command executed: ${command.type}`,
        confidence: 1.0
      };
    }
  });
};

export const undoAICommand = (commandId: string, state: State): State => {
  return produce(state, (draft) => {
    if (!draft.model.aiInstructions) return;

    // Find and mark command as undone
    const instruction = draft.model.aiInstructions.find((inst) => {
      return inst.id === commandId;
    });

    if (instruction) {
      instruction.status = 'error';
      instruction.error = 'Command undone by user';
      instruction.timestamp = new Date();
    }
  });
};

// AI State Management Reducers
export const clearAIInstructions = (state: State): State => {
  return produce(state, (draft) => {
    draft.model.aiInstructions = [];
  });
};

export const clearAISchemas = (state: State): State => {
  return produce(state, (draft) => {
    draft.model.aiSchemas = [];
  });
};

export const resetAISettings = (state: State): State => {
  return produce(state, (draft) => {
    draft.model.aiSettings = {
      provider: 'google',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      apiKey: process.env.GEMINI_API_KEY || '',
      privacyMode: 'private',
      temperature: 0.3,
      maxTokens: 2000
    };
  });
};

// Batch Operations
export const batchUpdateAI = (
  updates: {
    instructions?: AIInstruction[];
    schemas?: AISchema[];
    settings?: AISettings;
  },
  state: State
): State => {
  return produce(state, (draft) => {
    if (updates.instructions) {
      draft.model.aiInstructions = updates.instructions;
    }

    if (updates.schemas) {
      draft.model.aiSchemas = updates.schemas;
    }

    if (updates.settings) {
      // Initialize aiSettings if it doesn't exist
      if (!draft.model.aiSettings) {
        draft.model.aiSettings = {
          provider: 'google',
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          apiKey: process.env.GEMINI_API_KEY || '',
          privacyMode: 'private',
          temperature: 0.3,
          maxTokens: 2000
        };
      }
      draft.model.aiSettings = updates.settings;
    }
  });
};

// Validation and Cleanup
export const validateAIState = (state: State): State => {
  return produce(state, (draft) => {
    // Ensure AI arrays exist
    if (!draft.model.aiInstructions) {
      draft.model.aiInstructions = [];
    }

    if (!draft.model.aiSchemas) {
      draft.model.aiSchemas = [];
    }

    // Clean up invalid instructions
    draft.model.aiInstructions = draft.model.aiInstructions.filter((inst) => {
      return inst.id && inst.instruction;
    });

    // Clean up invalid schemas
    draft.model.aiSchemas = draft.model.aiSchemas.filter((schema) => {
      return schema.id && schema.name && schema.elements;
    });

    // Ensure default settings
    if (!draft.model.aiSettings) {
      draft.model.aiSettings = {
        provider: 'google',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
        apiKey: process.env.GEMINI_API_KEY || '',
        privacyMode: 'private',
        temperature: 0.3,
        maxTokens: 2000
      };
    }
  });
};
