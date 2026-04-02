import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  AIState,
  AIInstruction,
  AISchema,
  AISettings,
  AIProvider,
  ChatMessage,
  ChatSession,
  AICommand
} from 'src/types/ai';
import { generateId } from 'src/utils';

interface AIStateStore extends AIState {
  // Actions
  setCurrentInstruction: (instruction: AIInstruction | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  setActiveProvider: (provider: AIProvider | null) => void;
  updateSettings: (settings: Partial<AISettings>) => void;
  addChatSession: (session: ChatSession) => void;
  setActiveChatSession: (sessionId: string | null) => void;
  addMessageToSession: (sessionId: string, message: ChatMessage) => void;
  updateMessageInSession: (
    sessionId: string,
    messageId: string,
    updates: Partial<ChatMessage>
  ) => void;
  addCommand: (command: AICommand) => void;
  undoCommand: (commandId: string) => void;
  addSchema: (schema: AISchema) => void;
  removeSchema: (schemaId: string) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState: AIState = {
  currentInstruction: null,
  isProcessing: false,
  availableProviders: [],
  activeProvider: null,
  settings: {
    provider: 'google',
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    apiKey: process.env.GEMINI_API_KEY || '',
    privacyMode: 'private',
    temperature: 0.3,
    maxTokens: 2000
  },
  chatSessions: [],
  activeChatSession: null,
  commandHistory: [],
  schemas: [],
  error: null
};

export const useAIStateStore = create<AIStateStore>()(
  devtools(
    (set, get) => {
      return {
        ...initialState,

        // Set current instruction
        setCurrentInstruction: (instruction) => {
          set(
            { currentInstruction: instruction },
            false,
            'setCurrentInstruction'
          );
        },

        // Set processing state
        setProcessing: (isProcessing) => {
          set({ isProcessing }, false, 'setProcessing');
        },

        // Set active provider
        setActiveProvider: (provider) => {
          set({ activeProvider: provider }, false, 'setActiveProvider');
        },

        // Update settings
        updateSettings: (newSettings) => {
          const currentSettings = get().settings;
          const updatedSettings = { ...currentSettings, ...newSettings };
          set({ settings: updatedSettings }, false, 'updateSettings');
        },

        // Add chat session
        addChatSession: (session) => {
          const currentSessions = get().chatSessions;
          const updatedSessions = [...currentSessions, session];
          set({ chatSessions: updatedSessions }, false, 'addChatSession');
        },

        // Set active chat session
        setActiveChatSession: (sessionId) => {
          set({ activeChatSession: sessionId }, false, 'setActiveChatSession');
        },

        // Add message to session
        addMessageToSession: (sessionId, message) => {
          const currentSessions = get().chatSessions;
          const updatedSessions = currentSessions.map((session) => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: [...session.messages, message],
                updatedAt: new Date()
              };
            }
            return session;
          });
          set({ chatSessions: updatedSessions }, false, 'addMessageToSession');
        },

        updateMessageInSession: (sessionId, messageId, updates) => {
          const currentSessions = get().chatSessions;
          const updatedSessions = currentSessions.map((session) => {
            if (session.id !== sessionId) {
              return session;
            }

            const messages = session.messages.map((message) => {
              if (message.id !== messageId) {
                return message;
              }

              return {
                ...message,
                ...updates,
                metadata: {
                  ...message.metadata,
                  ...updates.metadata
                }
              };
            });

            return {
              ...session,
              messages,
              updatedAt: new Date()
            };
          });

          set(
            { chatSessions: updatedSessions },
            false,
            'updateMessageInSession'
          );
        },

        // Add command
        addCommand: (command) => {
          const currentHistory = get().commandHistory;
          const updatedHistory = [...currentHistory, command];
          set({ commandHistory: updatedHistory }, false, 'addCommand');
        },

        // Undo command
        undoCommand: (commandId) => {
          const currentHistory = get().commandHistory;
          const updatedHistory = currentHistory.map((command) => {
            if (command.id === commandId) {
              return { ...command, status: 'undone' as const };
            }
            return command;
          });
          set({ commandHistory: updatedHistory }, false, 'undoCommand');
        },

        // Add schema
        addSchema: (schema) => {
          const currentSchemas = get().schemas;
          const existingSchema = currentSchemas.find((s) => {
            return s.id === schema.id;
          });

          if (existingSchema) {
            // Update existing schema
            const updatedSchemas = currentSchemas.map((s) => {
              return s.id === schema.id ? schema : s;
            });
            set({ schemas: updatedSchemas }, false, 'updateSchema');
          } else {
            // Add new schema
            const updatedSchemas = [...currentSchemas, schema];
            set({ schemas: updatedSchemas }, false, 'addSchema');
          }
        },

        // Remove schema
        removeSchema: (schemaId) => {
          const currentSchemas = get().schemas;
          const updatedSchemas = currentSchemas.filter((schema) => {
            return schema.id !== schemaId;
          });
          set({ schemas: updatedSchemas }, false, 'removeSchema');
        },

        // Set error
        setError: (error) => {
          set({ error }, false, 'setError');
        },

        // Reset state
        resetState: () => {
          set(initialState, false, 'resetState');
        }
      };
    },
    {
      name: 'ai-state-store'
    }
  )
);

// Selectors
export const useAIState = () => {
  return useAIStateStore((state) => {
    return state;
  });
};

export const useAIInstructions = () => {
  return useAIStateStore((state) => {
    return state.chatSessions.flatMap((session) => {
      return session.messages;
    });
  });
};

export const useAIChatSessions = () => {
  return useAIStateStore((state) => {
    return state.chatSessions;
  });
};

export const useActiveChatSession = () => {
  const sessions = useAIStateStore((state) => {
    return state.chatSessions;
  });
  const activeSessionId = useAIStateStore((state) => {
    return state.activeChatSession;
  });

  return (
    sessions.find((session) => {
      return session.id === activeSessionId;
    }) || null
  );
};

export const useAISchemas = () => {
  return useAIStateStore((state) => {
    return state.schemas;
  });
};

export const useAICommandHistory = () => {
  return useAIStateStore((state) => {
    return state.commandHistory;
  });
};

export const useAISettings = () => {
  return useAIStateStore((state) => {
    return state.settings;
  });
};

export const useAIProcessing = () => {
  return useAIStateStore((state) => {
    return state.isProcessing;
  });
};

export const useAIError = () => {
  return useAIStateStore((state) => {
    return state.error;
  });
};

// Actions
export const useAIActions = () => {
  const store = useAIStateStore();

  return {
    setCurrentInstruction: store.setCurrentInstruction,
    setProcessing: store.setProcessing,
    setActiveProvider: store.setActiveProvider,
    updateSettings: store.updateSettings,
    addChatSession: store.addChatSession,
    setActiveChatSession: store.setActiveChatSession,
    addMessageToSession: store.addMessageToSession,
    updateMessageInSession: store.updateMessageInSession,
    addCommand: store.addCommand,
    undoCommand: store.undoCommand,
    addSchema: store.addSchema,
    removeSchema: store.removeSchema,
    setError: store.setError,
    resetState: store.resetState
  };
};

// Utility hooks
export const useCreateChatSession = () => {
  const { addChatSession, setActiveChatSession } = useAIActions();

  return (title: string, settings?: Partial<AISettings>) => {
    const newSession: ChatSession = {
      id: generateId(),
      title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      settings
    };

    addChatSession(newSession);
    setActiveChatSession(newSession.id);

    return newSession;
  };
};

export const useAddChatMessage = () => {
  const { addMessageToSession } = useAIActions();
  const activeSessionId = useAIStateStore((state) => {
    return state.activeChatSession;
  });

  return (message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    if (!activeSessionId) {
      throw new Error('No active chat session');
    }

    const fullMessage: ChatMessage = {
      ...message,
      id: generateId(),
      timestamp: new Date()
    };

    addMessageToSession(activeSessionId, fullMessage);

    return fullMessage;
  };
};

export const useUpdateChatMessage = () => {
  const { updateMessageInSession } = useAIActions();
  const activeSessionId = useAIStateStore((state) => {
    return state.activeChatSession;
  });

  return (messageId: string, updates: Partial<ChatMessage>) => {
    if (!activeSessionId) {
      throw new Error('No active chat session');
    }

    updateMessageInSession(activeSessionId, messageId, updates);
  };
};

export const useCreateAICommand = () => {
  const { addCommand } = useAIActions();

  return (
    type: AICommand['type'],
    payload: any,
    status: AICommand['status'] = 'pending'
  ) => {
    const command: AICommand = {
      id: generateId(),
      type,
      payload,
      timestamp: new Date(),
      status
    };

    addCommand(command);

    return command;
  };
};
