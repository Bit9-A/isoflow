import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
  useTheme,
  Fade,
  Grow,
  Stack
} from '@mui/material';
import {
  Close,
  Send,
  SmartToy,
  AutoAwesome,
  Person,
  LightbulbCircle
} from '@mui/icons-material';
import { useScene } from 'src/hooks/useScene';
import { useAI } from 'src/hooks/useAI';
import {
  useAIStateStore,
  useAddChatMessage,
  useCreateChatSession,
  useUpdateChatMessage
} from 'src/stores/aiStateStore';
import { useUiStateStore } from 'src/stores/uiStateStore';
import type { ChatMessage } from 'src/types/ai';
import { extractStreamedText } from 'src/utils/aiUtils';
import { UiElement } from 'src/components/UiElement/UiElement';

const STREAMING_PLACEHOLDER = 'Analizando diagrama...';

const createAssistantMessage = (
  content: string,
  confidence?: number
): Omit<ChatMessage, 'id' | 'timestamp'> => {
  return {
    role: 'assistant',
    content,
    metadata: {
      confidence
    }
  };
};

const ChatPanel: React.FC = () => {
  const theme = useTheme();
  const { items, connectors, textBoxes, rectangles } = useScene();
  const { executeInstruction, applyAIResult } = useAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const isChatOpen = useUiStateStore((state) => {
    return state.isChatOpen;
  });
  const setIsChatOpen = useUiStateStore((state) => {
    return state.actions.setIsChatOpen;
  });

  const createChatSession = useCreateChatSession();
  const addMessage = useAddChatMessage();
  const updateMessage = useUpdateChatMessage();

  const currentSession = useAIStateStore((state) => {
    const activeSessionId = state.activeChatSession;
    return state.chatSessions.find((session) => {
      return session.id === activeSessionId;
    });
  });

  const contextStats = useMemo(() => {
    return {
      nodes: items.length,
      connectors: connectors.length,
      notes: textBoxes.length,
      zones: rectangles.length
    };
  }, [items.length, connectors.length, textBoxes.length, rectangles.length]);

  useEffect(() => {
    if (!currentSession && isChatOpen) {
      createChatSession('Arquitectura asistida por IA');
    }
  }, [createChatSession, currentSession, isChatOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  if (!isChatOpen) {
    return null;
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) {
      return;
    }

    const instruction = inputValue.trim();
    addMessage({ role: 'user', content: instruction });
    setInputValue('');
    setIsProcessing(true);

    const assistantMessage = addMessage(
      createAssistantMessage(STREAMING_PLACEHOLDER)
    );

    let streamBuffer = '';
    const startedAt = performance.now();

    try {
      const result = await executeInstruction(instruction, {
        chatHistory: messages,
        onToken: (token) => {
          streamBuffer += token;
          updateMessage(assistantMessage.id, {
            content: extractStreamedText(streamBuffer) || STREAMING_PLACEHOLDER
          });
        }
      });

      const processingTime = Math.round(performance.now() - startedAt);
      const suggestions = result.suggestions?.length
        ? `\n\nSugerencias:\n- ${result.suggestions.join('\n- ')}`
        : '';

      updateMessage(assistantMessage.id, {
        content: `${result.summary}${suggestions}`,
        metadata: {
          confidence: result.confidence,
          processingTime
        }
      });

      await applyAIResult(result);
    } catch (error) {
      let errorMsg = 'No se pudo completar la consulta de IA.';

      if (error instanceof Error) {
        if (
          error.message.includes('429') ||
          error.message.includes('quota') ||
          error.message.includes('RESOURCE_EXHAUSTED')
        ) {
          errorMsg =
            'Límite de uso alcanzado. Espera unos segundos e intenta de nuevo.';
        } else if (error.message.includes('403')) {
          errorMsg =
            'API key inválida o sin permisos. Verifica tu configuración.';
        } else if (error.message.includes('404')) {
          errorMsg =
            'Modelo no disponible. Verifica la configuración del modelo.';
        } else {
          errorMsg = error.message;
        }
      }

      updateMessage(assistantMessage.id, {
        content: `Error: ${errorMsg}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const messages = currentSession?.messages ?? [];

  return (
    <UiElement
      sx={{
        position: 'absolute',
        width: 400,
        height: 540,
        bottom: 100,
        right: 20,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 1200,
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
        border: '1px solid',
        borderColor: 'grey.300',
        animation: 'chatSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes chatSlideIn': {
          '0%': { opacity: 0, transform: 'translateY(16px) scale(0.98)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
        }
      }}
    >
      {/* ─── Header ─── */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'white',
          borderBottom: '1px solid',
          borderColor: 'grey.200'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <AutoAwesome sx={{ fontSize: 20, color: 'secondary.main' }} />
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: '0.95rem',
              color: 'text.primary',
              letterSpacing: '-0.01em'
            }}
          >
            Isoflow AI
          </Typography>
          {isProcessing && (
            <CircularProgress
              size={14}
              thickness={5}
              sx={{ color: 'secondary.main', ml: 0.5 }}
            />
          )}
        </Box>
        <IconButton
          size="small"
          onClick={() => {
            return setIsChatOpen(false);
          }}
          sx={{
            color: 'grey.400',
            transition: 'all 0.2s',
            '&:hover': {
              color: 'error.main',
              backgroundColor: 'error.light',
              opacity: 0.1
            }
          }}
        >
          <Close sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* ─── Context stats pills ─── */}
      <Box
        sx={{
          px: 2.5,
          py: 1,
          display: 'flex',
          gap: 1,
          flexWrap: 'wrap',
          backgroundColor: 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'grey.100'
        }}
      >
        {[
          { label: 'Nodos', value: contextStats.nodes },
          { label: 'Conex.', value: contextStats.connectors },
          { label: 'Zonas', value: contextStats.zones }
        ].map((stat) => {
          return (
            <Box
              key={stat.label}
              sx={{
                px: 1.2,
                py: 0.4,
                borderRadius: '8px',
                backgroundColor: 'white',
                border: '1px solid',
                borderColor: 'grey.200',
                display: 'flex',
                alignItems: 'center',
                gap: 0.8
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  fontWeight: 500
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.7rem',
                  color: 'primary.main',
                  fontWeight: 700
                }}
              >
                {stat.value}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* ─── Messages area ─── */}
      <Box
        sx={{
          flex: 1,
          px: 2.5,
          py: 2,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          backgroundColor: '#fff',
          '&::-webkit-scrollbar': {
            width: 5
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.300',
            borderRadius: 10
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent'
          }
        }}
      >
        {messages.length === 0 && (
          <Fade in timeout={600}>
            <Box
              sx={{
                p: 3,
                mt: 2,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 1.5,
                border: '1px dashed',
                borderColor: 'grey.300',
                borderRadius: 2,
                backgroundColor: 'grey.50'
              }}
            >
              <LightbulbCircle sx={{ fontSize: 32, color: 'secondary.main' }} />
              <Typography
                variant="body2"
                sx={{ color: 'text.secondary', lineHeight: 1.6 }}
              >
                Describe los cambios que necesitas o pide un análisis de tu
                arquitectura actual para empezar.
              </Typography>
            </Box>
          </Fade>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <Grow in key={message.id}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isUser ? 'flex-end' : 'flex-start',
                  gap: 0.5
                }}
              >
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.2 }}>
                  {isUser ? (
                    <>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                        Tú
                      </Typography>
                      <Person sx={{ fontSize: 14, color: 'primary.main' }} />
                    </>
                  ) : (
                    <>
                      <SmartToy sx={{ fontSize: 14, color: 'secondary.main' }} />
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: 'secondary.main' }}>
                        AI
                      </Typography>
                    </>
                  )}
                </Stack>
                <Box
                  sx={{
                    maxWidth: '90%',
                    p: 1.5,
                    borderRadius: isUser
                      ? '16px 4px 16px 16px'
                      : '4px 16px 16px 16px',
                    backgroundColor: isUser ? 'primary.main' : 'grey.100',
                    border: isUser ? 'none' : '1px solid',
                    borderColor: 'grey.200',
                    boxShadow: isUser ? '0 4px 12px rgba(99, 102, 241, 0.15)' : 'none',
                    transition: 'transform 0.2s',
                    '&:active': {
                      transform: 'scale(0.98)'
                    }
                  }}
                >
                  <Typography
                    sx={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontSize: '0.85rem',
                      lineHeight: 1.5,
                      color: isUser ? 'white' : 'text.primary'
                    }}
                  >
                    {message.content === STREAMING_PLACEHOLDER && !isUser ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={12} thickness={6} color="inherit" />
                        {message.content}
                      </Box>
                    ) : (
                      message.content
                    )}
                  </Typography>

                  {!isUser && message.metadata?.confidence != null && (
                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          color: 'text.disabled',
                          fontWeight: 600
                        }}
                      >
                        Confianza: {Math.round(message.metadata.confidence * 100)}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Grow>
          );
        })}

        <div ref={messagesEndRef} />
      </Box>

      {/* ─── Input area ─── */}
      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'grey.100',
          p: 2,
          backgroundColor: 'white'
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="flex-end">
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ej: Añade un balanceador de carga..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isProcessing}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'grey.50',
                borderRadius: '12px',
                fontSize: '0.85rem',
                '& fieldset': {
                  borderColor: 'grey.200'
                },
                '&:hover fieldset': {
                  borderColor: 'grey.300'
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                  borderWidth: 1.5
                }
              }
            }}
          />
          <IconButton
            onClick={handleSendMessage}
            disabled={isProcessing || !inputValue.trim()}
            sx={{
              width: 44,
              height: 44,
              borderRadius: '12px',
              backgroundColor: isProcessing ? 'grey.100' : 'primary.main',
              color: 'white',
              transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
              '&:hover': {
                backgroundColor: 'primary.dark',
                transform: 'translateY(-2px)'
              },
              '&:active': {
                transform: 'scale(0.95)'
              },
              '&.Mui-disabled': {
                backgroundColor: 'grey.100',
                color: 'grey.400'
              }
            }}
          >
            {isProcessing ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <Send sx={{ fontSize: 20 }} />
            )}
          </IconButton>
        </Stack>
      </Box>
    </UiElement>
  );
};

export default ChatPanel;
