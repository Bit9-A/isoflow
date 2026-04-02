import { useCallback, useMemo } from 'react';
import {
  AIExecutionOptions,
  AIInstruction,
  AIResult,
  AISchema,
  AISettings,
  DiagramContext,
  ValidationResult
} from 'src/types/ai';
import { useModelStore } from 'src/stores/modelStore';
import { useSceneStore } from 'src/stores/sceneStore';
import { useScene } from 'src/hooks/useScene';
import * as aiReducers from 'src/stores/reducers/ai';
import type { State } from 'src/stores/reducers/types';
import { generateId } from 'src/utils';
import {
  processInstructionWithProvider,
  generateSchemaWithProvider,
  validateInstructionWithProvider
} from 'src/services/AIProvider';

const DEFAULT_SETTINGS: AISettings = {
  provider: 'google',
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  apiKey: process.env.GEMINI_API_KEY || '',
  privacyMode: 'private',
  temperature: 0.3,
  maxTokens: 2000
};

export const useAI = () => {
  const model = useModelStore((state) => {
    return state;
  });
  const scene = useSceneStore((state) => {
    return state;
  });
  const {
    createViewItem,
    createConnector,
    createTextBox,
    createRectangle,
    currentView,
    items,
    connectors,
    textBoxes,
    rectangles
  } = useScene();

  const aiState = useMemo(() => {
    return {
      instructions: model.aiInstructions || [],
      schemas: model.aiSchemas || [],
      settings: {
        ...DEFAULT_SETTINGS,
        ...(model.aiSettings || {})
      }
    };
  }, [model.aiInstructions, model.aiSchemas, model.aiSettings]);

  const getDiagramContext = useCallback((): DiagramContext => {
    const modelItemMap = new Map(
      model.items.map((item) => {
        return [item.id, item];
      })
    );

    return {
      currentElements: items.map((viewItem) => {
        const modelItem = modelItemMap.get(viewItem.id);

        return {
          id: viewItem.id,
          name: modelItem?.name || viewItem.id,
          description: modelItem?.description,
          icon: modelItem?.icon
        };
      }),
      currentViewItems: items,
      viewId: currentView.id,
      availableSpace: {
        x: 0,
        y: 0,
        width: 1000,
        height: 1000
      },
      existingConnections: connectors,
      existingTextBoxes: textBoxes,
      existingRectangles: rectangles
    };
  }, [items, model.items, currentView.id, connectors, textBoxes, rectangles]);

  const getState = useCallback((): State => {
    return {
      model: model.actions.get(),
      scene: scene.actions.get()
    };
  }, [model.actions, scene.actions]);

  const setState = useCallback(
    (newState: State) => {
      model.actions.set(newState.model);
      scene.actions.set(newState.scene);
    },
    [model.actions, scene.actions]
  );

  const executeInstruction = useCallback(
    async (
      instruction: string,
      options?: AIExecutionOptions
    ): Promise<AIResult> => {
      const instructionId = generateId();
      const context = getDiagramContext();

      const aiInstruction: AIInstruction = {
        id: instructionId,
        instruction,
        context,
        timestamp: new Date(),
        status: 'processing'
      };

      setState(aiReducers.executeAIInstruction(aiInstruction, getState()));

      try {
        const result = await processInstructionWithProvider(
          instruction,
          context,
          aiState.settings,
          options
        );

        setState(
          aiReducers.updateAIInstruction(
            instructionId,
            { status: 'completed', result },
            getState()
          )
        );

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown AI error';

        setState(
          aiReducers.updateAIInstruction(
            instructionId,
            { status: 'error', error: message },
            getState()
          )
        );

        throw error;
      }
    },
    [aiState.settings, getDiagramContext, getState, setState]
  );

  const applyAIResult = useCallback(
    async (result: AIResult): Promise<void> => {
      result.elements.forEach((element) => {
        createViewItem(element);
      });
      result.connectors.forEach((connector) => {
        createConnector(connector);
      });
      result.textBoxes.forEach((textBox) => {
        createTextBox(textBox);
      });
      result.rectangles.forEach((rectangle) => {
        createRectangle(rectangle);
      });
    },
    [createViewItem, createConnector, createTextBox, createRectangle]
  );

  const generateSchema = useCallback(
    async (
      description: string,
      category: AISchema['category']
    ): Promise<AISchema> => {
      const schema = await generateSchemaWithProvider(description, category);
      setState(aiReducers.createAISchema(schema, getState()));
      return schema;
    },
    [getState, setState]
  );

  const validateInstruction = useCallback(
    async (instruction: string): Promise<ValidationResult> => {
      return validateInstructionWithProvider(instruction);
    },
    []
  );

  const updateAISettings = useCallback(
    (settings: Partial<AISettings>) => {
      const newSettings = { ...aiState.settings, ...settings };
      setState(aiReducers.updateAISettings(newSettings, getState()));
    },
    [aiState.settings, getState, setState]
  );

  const clearInstructions = useCallback(() => {
    setState(aiReducers.clearAIInstructions(getState()));
  }, [getState, setState]);

  return {
    aiState,
    instructions: aiState.instructions,
    schemas: aiState.schemas,
    settings: aiState.settings,
    executeInstruction,
    generateSchema,
    validateInstruction,
    applyAIResult,
    updateAISettings,
    clearInstructions,
    getDiagramContext
  };
};
