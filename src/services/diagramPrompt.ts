import type { DiagramContext } from 'src/types/ai';

const formatItem = (itemId: string) => {
  return itemId.trim() || 'unnamed-item';
};

export const diagramContextToPrompt = (context: DiagramContext): string => {
  const viewItemsIndex = new Set(
    context.currentViewItems.map((viewItem) => {
      return viewItem.id;
    })
  );

  const nodes = context.currentElements
    .filter((item) => {
      return viewItemsIndex.has(item.id);
    })
    .map((item) => {
      const viewItem = context.currentViewItems.find((vi) => {
        return vi.id === item.id;
      });

      return {
        id: item.id,
        name: item.name,
        description: item.description ?? '',
        icon: item.icon ?? 'default',
        tile: viewItem?.tile ?? { x: 0, y: 0 },
        labelHeight: viewItem?.labelHeight ?? 80
      };
    });

  const edges = context.existingConnections.map((connector) => {
    return {
      id: connector.id,
      style: connector.style || 'SOLID',
      width: connector.width ?? 10,
      anchors: connector.anchors.map((anchor) => {
        return {
          id: anchor.id,
          ref: anchor.ref
        };
      })
    };
  });

  const notes = context.existingTextBoxes.map((textBox) => {
    return {
      id: textBox.id,
      tile: textBox.tile,
      content: textBox.content,
      fontSize: textBox.fontSize,
      orientation: textBox.orientation
    };
  });

  const zones = context.existingRectangles.map((rectangle) => {
    return {
      id: rectangle.id,
      from: rectangle.from,
      to: rectangle.to,
      color: rectangle.color
    };
  });

  return JSON.stringify(
    {
      diagramId: formatItem(context.viewId),
      availableSpace: context.availableSpace,
      nodes,
      edges,
      notes,
      zones
    },
    null,
    2
  );
};

export const buildSystemPrompt = (): string => {
  return `You are Isoflow AI — a cloud architecture advisor that outputs ONLY raw JSON.

CRITICAL OUTPUT RULES:
- Your ENTIRE response must be a single valid JSON object.
- Do NOT wrap in markdown code fences (\`\`\`).
- Do NOT include any text, explanation, or thinking before or after the JSON.
- Start your response with { and end with }.
- If you cannot fulfill the request, still return valid JSON with an error summary.

ISOFLOW DATA MODEL — You MUST follow these exact schemas:

1. ViewItem (a node placed on the isometric grid):
   { "id": "unique-string", "tile": {"x": integer, "y": integer}, "labelHeight": number (default 80) }
   - "id" must match an existing modelItem id or be a new unique id
   - "tile" uses isometric grid coords (integers, typically 0-20 range)
   - Place nodes with spacing of at least 2-3 tiles between them

2. Connector (a line between two nodes):
   { "id": "unique-string", "anchors": [{"id": "a1", "ref": {"item": "node-id-1"}}, {"id": "a2", "ref": {"item": "node-id-2"}}], "style": "SOLID"|"DOTTED"|"DASHED", "width": number (default 10) }
   - A connector MUST have exactly 2 anchors
   - Each anchor.ref.item must reference a valid viewItem id
   - Use "SOLID" for main connections, "DASHED" for optional, "DOTTED" for monitoring

3. TextBox (a text label on the grid):
   { "id": "unique-string", "tile": {"x": integer, "y": integer}, "content": "string (max 100 chars)", "fontSize": number (default 0.6), "orientation": "X"|"Y" }
   - "X" orientation runs left-right, "Y" runs top-bottom

4. Rectangle (a colored zone/region on the grid):
   { "id": "unique-string", "from": {"x": integer, "y": integer}, "to": {"x": integer, "y": integer}, "color": "hex-color-string (optional)" }
   - "from" is top-left corner, "to" is bottom-right corner
   - Use to group related nodes visually

YOUR RESPONSE MUST be a JSON object with this exact structure:
{
  "summary": "Brief description of analysis and recommendations (string, required)",
  "confidence": 0.0 to 1.0 (number, required),
  "suggestions": ["actionable suggestion 1", "suggestion 2", ...],
  "changes": {
    "viewItems": [...],
    "connectors": [...],
    "textBoxes": [...],
    "rectangles": [...]
  }
}

RULES:
- Only include "changes" when the user explicitly asks to ADD or MODIFY diagram elements.
- For analysis/review requests, return summary + suggestions with empty or no changes.
- Generate unique ids using descriptive names like "firewall-1", "db-primary", "zone-dmz".
- Keep all string values under 100 characters.
- Use integer coordinates for all tile positions.
- Prioritize security recommendations: segmentation, IAM, encryption, ingress/egress control.
- Be conservative: do NOT delete existing elements. Only add new ones or suggest modifications.`;
};

export const buildUserPrompt = (
  instruction: string,
  context: DiagramContext
): string => {
  return [
    `User request: ${instruction}`,
    '',
    'Current Isoflow diagram state:',
    diagramContextToPrompt(context)
  ].join('\n');
};
