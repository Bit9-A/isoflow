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

AVAILABLE ICONS — use the "iconId" field in viewItems to assign the right icon:
  "block"             → Generic component / default
  "storage"           → Database, data warehouse, persistent storage
  "cloud"             → Cloud service, SaaS provider, external API
  "desktop"           → Desktop workstation, on-premises server
  "laptop"            → User device, end-user client
  "firewall"          → Firewall, security gateway, WAF
  "dns"               → DNS server, name resolution
  "cache"             → Cache, Redis, Memcached, in-memory store
  "loadbalancer"      → Load balancer, traffic distributor, reverse proxy
  "lock"              → Authentication, IAM, security service, encryption
  "cube"              → Container, Docker, microservice, generic service
  "diamond"           → Decision point, routing logic, conditional flow
  "document"          → Document, report, log file, configuration
  "cardterminal"      → Payment terminal, POS, billing
  "cronjob"           → Scheduled task, batch job, cron
  "function-module"   → Serverless function, Lambda, Cloud Function
  "image"             → Media service, image processing, CDN asset
  Also available: GCP icons (gcp-*), Azure icons (azure-*), K8s icons (k8s-*)

AVAILABLE COLORS for rectangles (use these IDs, NOT hex values):
  "color1" (#a5b8f3 blue), "color2" (#bbadfb purple), "color3" (#f4eb8e yellow),
  "color4" (#f0aca9 red), "color5" (#fad6ac orange), "color6" (#a8dc9d green),
  "color7" (#b3e5e3 teal)

ISOFLOW DATA MODEL — You MUST follow these exact schemas:

1. ViewItem (a node on the isometric grid):
   { "id": "unique-string", "name": "Label", "description": "optional", "iconId": "icon-id-from-catalog", "tile": {"x": int, "y": int}, "labelHeight": 80 }
   - "iconId" MUST be one of the available icons listed above. Choose the most semantically appropriate icon.
   - "name" is REQUIRED for new nodes.

2. Connector (line between two nodes):
   { "id": "unique-string", "anchors": [{"id": "a1", "ref": {"item": "node-id-1"}}, {"id": "a2", "ref": {"item": "node-id-2"}}], "style": "SOLID"|"DOTTED"|"DASHED", "width": 10 }
   - A connector MUST have exactly 2 anchors. Each anchor.ref.item must reference a valid viewItem id.

3. TextBox (text label):
   { "id": "unique-string", "tile": {"x": int, "y": int}, "content": "string (max 100)", "fontSize": 0.6, "orientation": "X"|"Y" }

4. Rectangle (colored zone):
   { "id": "unique-string", "from": {"x": int, "y": int}, "to": {"x": int, "y": int}, "color": "color1" }
   - "color" MUST be one of: color1, color2, color3, color4, color5, color6, color7

SPATIAL POSITIONING RULES:
- Read the existing nodes' positions from the diagram state provided.
- Compute the bounding box of all existing nodes (minX, maxX, minY, maxY).
- Place NEW nodes OUTSIDE or ADJACENT to the existing bounds to avoid overlap.
- If the diagram is empty, start placing nodes around coordinates (0, 0).
- Space nodes at least 3-4 tiles apart from each other.
- Arrange nodes in logical groups (e.g., clients on one side, servers in middle, databases on other side).
- Place rectangles (zones) to visually group related nodes, with 1-2 tiles of padding around them.
- Place text labels near their related zone, offset by 1 tile.

YOUR RESPONSE MUST be a JSON object:
{
  "summary": "Brief description (string, required)",
  "confidence": 0.0 to 1.0,
  "suggestions": ["suggestion 1", ...],
  "changes": {
    "viewItems": [...],
    "connectors": [...],
    "textBoxes": [...],
    "rectangles": [...]
  }
}

RULES:
- Only include "changes" when the user asks to ADD or MODIFY elements.
- For analysis requests, return summary + suggestions with empty changes.
- Generate descriptive ids like "firewall-1", "db-primary", "zone-dmz".
- Keep strings under 100 characters. Use integer coordinates.
- Be conservative: do NOT delete existing elements.`;
};

export const buildUserPrompt = (
  instruction: string,
  context: DiagramContext,
  chatHistory?: import('src/types/ai').ChatMessage[]
): string => {
  // Keep only the last 6 messages and truncate long assistant messages
  const recentHistory = chatHistory ? chatHistory.slice(-6) : [];
  const historyOutput =
    recentHistory.length > 0
      ? `\nChat History:\n${recentHistory
          .map((m) => {
            const role = m.role === 'user' ? 'User' : 'Assistant';
            const content =
              m.role === 'assistant' && m.content.length > 300
                ? m.content.substring(0, 300) + '...'
                : m.content;
            return `${role}: ${content}`;
          })
          .join('\n')}`
      : '';

  return [
    `User request: ${instruction}`,
    historyOutput,
    '',
    'Current Isoflow diagram state:',
    diagramContextToPrompt(context)
  ]
    .filter(Boolean)
    .join('\n');
};
