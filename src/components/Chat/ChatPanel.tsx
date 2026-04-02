import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CircularProgress,
  IconButton,
  Paper,
  TextField,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { Clear, Close, Send, SmartToy, AutoAwesome } from '@mui/icons-material';
import { useScene } from 'src/hooks/useScene';
import { useAI } from 'src/hooks/useAI';
import {
  useAIStateStore,
  useAddChatMessage,
  useCreateChatSession,
  useUpdateChatMessage
} from 'src/stores/aiStateStore';
import type { ChatMessage } from 'src/types/ai';
import { UiElement } from 'src/components/UiElement/UiElement';

interface ChatPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

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

/* ─── Glassmorphism color tokens ──────────────────────── */
const GLASS = {
  bg: 'rgba(15, 23, 42, 0.72)',
  bgLight: 'rgba(30, 41, 59, 0.55)',
  border: 'rgba(99, 102, 241, 0.25)',
  borderLight: 'rgba(148, 163, 184, 0.15)',
  headerGrad: 'linear-gradient(135deg, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.25) 100%)',
  userBubble: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
  aiBubble: 'rgba(30, 41, 59, 0.65)',
  accent: '#818cf8',
  glow: '0 8px 32px rgba(99, 102, 241, 0.18), 0 1.5px 6px rgba(0,0,0,0.25)',
  pill: 'rgba(99, 102, 241, 0.12)',
  pillText: '#a5b4fc',
  inputBg: 'rgba(15, 23, 42, 0.55)',
  inputBorder: 'rgba(99, 102, 241, 0.3)',
  textPrimary: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b'
};

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen = true,
  onClose
}) => {
  const theme = useTheme();
  const { items, connectors, textBoxes, rectangles } = useScene();
  const { executeInstruction, applyAIResult, settings } = useAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (!currentSession && isOpen) {
      createChatSession('Arquitectura asistida por IA');
    }
  }, [createChatSession, currentSession, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  if (!isOpen) {
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
        onToken: (token) => {
          streamBuffer += token;
          updateMessage(assistantMessage.id, {
            content: streamBuffer || STREAMING_PLACEHOLDER
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
        if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('RESOURCE_EXHAUSTED')) {
          errorMsg = '⏳ Límite de uso alcanzado. Espera unos segundos e intenta de nuevo.';
        } else if (error.message.includes('403')) {
          errorMsg = '🔑 API key inválida o sin permisos. Verifica tu configuración.';
        } else if (error.message.includes('404')) {
          errorMsg = '❌ Modelo no disponible. Verifica la configuración del modelo.';
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
        borderRadius: '16px',
        border: `1px solid ${GLASS.border}`,
        boxShadow: GLASS.glow,
        backgroundColor: GLASS.bg,
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        zIndex: 1200,
        animation: 'chatSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        '@keyframes chatSlideIn': {
          '0%': { opacity: 0, transform: 'translateY(20px) scale(0.96)' },
          '100%': { opacity: 1, transform: 'translateY(0) scale(1)' }
        }
      }}
    >
      {/* ─── Header ─── */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: GLASS.headerGrad,
          borderBottom: `1px solid ${GLASS.borderLight}`
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AutoAwesome sx={{ fontSize: 18, color: GLASS.accent }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.9rem',
              color: GLASS.textPrimary,
              letterSpacing: '0.02em'
            }}
          >
            Isoflow AI
          </Typography>
          {isProcessing && (
            <CircularProgress
              size={14}
              sx={{ color: GLASS.accent, ml: 0.5 }}
            />
          )}
        </Box>
        <Tooltip title="Cerrar" arrow>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: GLASS.textSecondary,
              '&:hover': {
                color: GLASS.textPrimary,
                backgroundColor: 'rgba(255,255,255,0.08)'
              }
            }}
          >
            <Close sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ─── Context stats pills ─── */}
      <Box
        sx={{
          px: 2,
          py: 0.8,
          display: 'flex',
          gap: 0.8,
          flexWrap: 'wrap',
          borderBottom: `1px solid ${GLASS.borderLight}`
        }}
      >
        {[
          { label: 'Nodos', value: contextStats.nodes },
          { label: 'Conex.', value: contextStats.connectors },
          { label: 'Notas', value: contextStats.notes },
          { label: 'Zonas', value: contextStats.zones }
        ].map((stat) => {
          return (
            <Box
              key={stat.label}
              sx={{
                px: 1,
                py: 0.2,
                borderRadius: '6px',
                backgroundColor: GLASS.pill,
                display: 'flex',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: GLASS.pillText,
                  fontWeight: 600
                }}
              >
                {stat.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: GLASS.accent,
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
          px: 2,
          py: 1.5,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
          '&::-webkit-scrollbar': {
            width: 4
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'rgba(99,102,241,0.3)',
            borderRadius: 2
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'transparent'
          }
        }}
      >
        {messages.length === 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              backgroundColor: GLASS.bgLight,
              borderRadius: '12px',
              border: `1px solid ${GLASS.borderLight}`
            }}
          >
            <Typography
              sx={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: GLASS.accent,
                mb: 0.5
              }}
            >
              💡 Recomendado
            </Typography>
            <Typography
              sx={{
                fontSize: '0.75rem',
                color: GLASS.textSecondary,
                lineHeight: 1.5
              }}
            >
              &quot;Analiza mi arquitectura actual y sugiere mejoras de
              seguridad&quot;
            </Typography>
          </Paper>
        )}

        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <Box
              key={message.id}
              sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start'
              }}
            >
              <Box
                sx={{
                  maxWidth: '86%',
                  p: 1.2,
                  borderRadius: isUser
                    ? '12px 12px 2px 12px'
                    : '12px 12px 12px 2px',
                  background: isUser ? GLASS.userBubble : GLASS.aiBubble,
                  border: isUser
                    ? 'none'
                    : `1px solid ${GLASS.borderLight}`,
                  boxShadow: isUser
                    ? '0 2px 8px rgba(99,102,241,0.25)'
                    : 'none'
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    mb: 0.3
                  }}
                >
                  {isUser ? (
                    <Typography
                      sx={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: 'rgba(255,255,255,0.8)'
                      }}
                    >
                      Tú
                    </Typography>
                  ) : (
                    <>
                      <SmartToy sx={{ fontSize: 12, color: GLASS.accent }} />
                      <Typography
                        sx={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          color: GLASS.accent
                        }}
                      >
                        AI
                      </Typography>
                      {message.metadata?.confidence != null && (
                        <Typography
                          sx={{
                            fontSize: '0.6rem',
                            color: GLASS.textMuted,
                            ml: 0.5
                          }}
                        >
                          {Math.round(message.metadata.confidence * 100)}%
                        </Typography>
                      )}
                    </>
                  )}
                </Box>
                <Typography
                  component="pre"
                  sx={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: '0.8rem',
                    lineHeight: 1.55,
                    color: isUser ? '#fff' : GLASS.textPrimary
                  }}
                >
                  {message.content}
                </Typography>
              </Box>
            </Box>
          );
        })}

        <div ref={messagesEndRef} />
      </Box>

      {/* ─── Input area ─── */}
      <Box
        sx={{
          borderTop: `1px solid ${GLASS.borderLight}`,
          p: 1.5
        }}
      >
        <Box sx={{ display: 'flex', gap: 0.8, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={3}
            size="small"
            placeholder="Ej: revisa seguridad de red y IAM"
            value={inputValue}
            onChange={(event) => {
              return setInputValue(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
            disabled={isProcessing}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: GLASS.inputBg,
                borderRadius: '10px',
                color: GLASS.textPrimary,
                fontSize: '0.8rem',
                '& fieldset': {
                  borderColor: GLASS.inputBorder
                },
                '&:hover fieldset': {
                  borderColor: GLASS.accent
                },
                '&.Mui-focused fieldset': {
                  borderColor: GLASS.accent,
                  borderWidth: 1.5
                }
              },
              '& .MuiInputBase-input::placeholder': {
                color: GLASS.textMuted,
                opacity: 1
              }
            }}
          />
          <Tooltip title="Limpiar" arrow>
            <span>
              <IconButton
                size="small"
                onClick={() => {
                  return setInputValue('');
                }}
                disabled={isProcessing || !inputValue}
                sx={{
                  color: GLASS.textMuted,
                  '&:hover': { color: GLASS.textSecondary }
                }}
              >
                <Clear sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <IconButton
            onClick={handleSendMessage}
            disabled={isProcessing || !inputValue.trim()}
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: isProcessing
                ? 'transparent'
                : GLASS.userBubble,
              color: '#fff',
              '&:hover': {
                background:
                  'linear-gradient(135deg, #818cf8 0%, #a78bfa 100%)'
              },
              '&.Mui-disabled': {
                color: GLASS.textMuted,
                background: 'rgba(255,255,255,0.05)'
              }
            }}
          >
            {isProcessing ? (
              <CircularProgress size={18} sx={{ color: GLASS.accent }} />
            ) : (
              <Send sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>
      </Box>
    </UiElement>
  );
};

export default ChatPanel;
