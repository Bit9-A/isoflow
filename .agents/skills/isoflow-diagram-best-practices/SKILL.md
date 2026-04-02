---
name: isoflow-diagram-best-practices
description: Use when generating or improving Isoflow diagrams via AI. Defines the exact spatial rules, icon catalog, color semantics, label placement, and layout patterns extracted from the official reference diagram.
---

# Isoflow Diagram Best Practices

## Overview

This skill defines the **golden rules** for generating professional isometric architecture diagrams in Isoflow. All rules are extracted from the official reference export (`Airport management software system` — 21 nodes, 20 connections, 6 zones, 5 labels).

**When to use:** Any time the AI generates or modifies an Isoflow diagram — whether from text descriptions, database schemas, or analysis requests.

## 1. Icon Catalog (34 Isoflow + 1028 Cloud)

### Isoflow Collection (isometric, always available)

| Icon ID | Best For |
|---------|----------|
| `block` | Generic component, default fallback |
| `storage` | Database, data warehouse, persistent storage |
| `server` | Server, backend, compute instance |
| `cloud` | Cloud service, SaaS, external API |
| `desktop` | Desktop workstation, on-premises server |
| `laptop` | User device, end-user client |
| `mobiledevice` | Mobile device, phone, tablet |
| `firewall` | Firewall, security gateway, WAF |
| `lock` | Authentication, IAM, encryption |
| `dns` | DNS, name resolution |
| `cache` | Cache, Redis, Memcached, in-memory |
| `loadbalancer` | Load balancer, reverse proxy |
| `router` | Router, network switch, gateway |
| `switch-module` | Network switch |
| `cube` | Container, Docker, microservice |
| `diamond` | Decision point, routing logic |
| `document` | Document, log, config file |
| `cardterminal` | Payment terminal, POS |
| `paymentcard` | Payment, billing, invoicing |
| `cronjob` | Scheduled task, batch job, cron |
| `function-module` | Serverless function, Lambda |
| `package-module` | Package, module, library |
| `queue` | Queue, message broker, event stream |
| `mail` | Email service |
| `mailmultiple` | Email distribution |
| `image` | Media, CDN asset |
| `office` | Office, building, facility |
| `user` | User, person, actor |
| `plane` | Aviation, transport, logistics |
| `truck` | Delivery, shipping |
| `truck-2` | Heavy transport |
| `printer` | Printer, output device |
| `speech` | Voice, chatbot, IVR |
| `sphere` | Globe, world, network |
| `pyramid` | Hierarchy, layers, stack |
| `tower` | Antenna, tower, broadcast |
| `vm` | Virtual machine |

### Cloud Icons (use when platform is specified)
- **AWS** (320 icons): prefix `aws-*` (e.g., `aws-ec2`, `aws-lambda`, `aws-rds`)
- **Azure** (369 icons): prefix `azure-*` (e.g., `azure-virtual-machine`, `azure-sql-database`)
- **GCP** (280 icons): prefix `gcp-*` (e.g., `gcp-compute-engine`, `gcp-cloud-sql`)
- **Kubernetes** (56 icons): prefix `k8s-*` (e.g., `k8s-pod`, `k8s-svc`, `k8s-deploy`)

> **Rule:** If unsure about an icon, ALWAYS default to `block`. Never invent icon IDs.

## 2. Color Palette (7 fixed colors)

| ID | Hex | Visual | Recommended Semantic Usage |
|----|-----|--------|---------------------------|
| `color1` | `#a5b8f3` | 🔵 Blue | Internal operations, management |
| `color2` | `#bbadfb` | 🟣 Purple | External systems, APIs, airside |
| `color3` | `#f4eb8e` | 🟡 Yellow | Warnings, analytics, reporting |
| `color4` | `#f0aca9` | 🔴 Red | Security, errors, critical systems |
| `color5` | `#fad6ac` | 🟠 Orange | Core hub, central database |
| `color6` | `#a8dc9d` | 🟢 Green | Financial, billing, revenue |
| `color7` | `#b3e5e3` | 🌊 Teal | Information display, monitoring |

> **Rule:** Use color IDs (`"color1"`), NEVER hex values. Colors cannot be extended.

## 3. Spatial Layout Rules

### The Hub-and-Spoke Pattern

```
                    Billing (color6)
                    (2-5, -11 to -7)
                         |
   Passenger (color1)    |    Airside (color2)
   (-12 to -4, -10 to -6) |  (15-17, -4 to 4)
          \              |              /
           \             |             /
            \     AODB (color5)      /
             --- (3-5, -1 to 1) ---
            /            |           \
           /             |            \
   Terminal (color1)     |    Info Display (color7)
   (-12 to -4, 6 to 9)  |    (0-8, 11 to 13)
```

### Spacing Rules (CRITICAL)

| Rule | Value | Description |
|------|-------|-------------|
| **Within-group** | **3 tiles** | Nodes inside the same zone rectangle |
| **Between-group** | **6-15 tiles** | Distance between different zone rectangles |
| **Rectangle padding** | **1 tile** | Around contained nodes |
| **Label offset** | **1-2 tiles** | TextBox placed outside rectangle edge |
| **Grid extent (~20 nodes)** | **30×25 tiles** | x=[-12,17], y=[-12,13] |
| **Central hub position** | **(4, 0)** | Core DB/API at center |

### Node Placement Examples (from reference)

```
Zone: Airside (vertical, 3 nodes)
  Node 1: (16, -3)   ← 3 tiles apart
  Node 2: (16,  0)   ← 3 tiles apart
  Node 3: (16,  3)
  Rectangle: from=(15,-4), to=(17,4)  ← 1 tile padding

Zone: Info Display (horizontal, 3 nodes)
  Node 1: (1, 12)    ← 3 tiles apart
  Node 2: (4, 12)    ← 3 tiles apart
  Node 3: (7, 12)
  Rectangle: from=(0,11), to=(8,13)   ← 1 tile padding
```

## 4. TextBox Labels (Zone Titles)

| Property | Value | Notes |
|----------|-------|-------|
| `fontSize` | **Always `0.6`** | Do NOT use larger values |
| `orientation` | `"X"` or `"Y"` | X=horizontal, Y=vertical |
| Position | **Outside the rectangle** | 1-2 tiles offset from edge |

### Placement Convention

- **Orientation `"X"`**: Place to the **left** of the zone, vertically centered
  - Example: "Terminal management" at `(-12, 5)` for zone `(-12,-4) to (9,6)`
- **Orientation `"Y"`**: Place to the **left** of vertical zones
  - Example: "Airside operations" at `(14, -1)` for zone `(15,-4) to (17,4)`

## 5. labelHeight Rules

| Value | When to Use |
|-------|-------------|
| `80` | **Default** for most nodes |
| `140` | **Hub nodes** (e.g., central database, core API) |
| `180` | **Primary category nodes** (e.g., top-level modules like "Landside Operations") |

> **Important:** labelHeight is NOT based on name length. It's based on **node importance**.

## 6. Connection Patterns

### Chain Pattern (most common)
```
Child Node → Group Hub → Central Hub
Example: "Border Control" → "Passenger Services" → "Landside" → "AODB"
```

### Connection Rules
- Each connector has **exactly 2 anchors**: `[{ref: {item: "id-1"}}, {ref: {item: "id-2"}}]`
- Default style: `"SOLID"`, width: `10`
- All child nodes connect to their **group hub**, group hubs connect to the **central hub**
- Avoid crossing connections — use the hub-and-spoke layout to minimize crossings

## 7. Large Input Handling

When the user provides complex inputs (Prisma schemas, database ERDs, long text descriptions):

1. **Group entities into modules** (8-10 module nodes max)
2. Each module's `description` should list its key entities
3. Target **15-20 viewItems** total
4. Use **rectangles** to visually group related modules
5. Keep `summary` under 200 chars, `suggestions` to 3-5 items

## 8. Language Rules

- **summary/suggestions**: Respond in the **same language as the user's message**
- **IDs**: Always use English kebab-case (e.g., `"mod-geography"`, `"zone-core"`)
- **Technical terms in names**: Use the user's language but keep proper nouns in English

## 9. Validation Checklist

Before generating output, verify:

- [ ] All `iconId` values are from the catalog (default to `"block"` if unsure)
- [ ] All `color` values are `"color1"` through `"color7"`
- [ ] Within-group spacing is ~3 tiles
- [ ] Between-group spacing is 6+ tiles
- [ ] Every zone has a TextBox label placed outside its rectangle
- [ ] Rectangle padding is exactly 1 tile
- [ ] TextBox fontSize is `0.6`
- [ ] Hub nodes use labelHeight `140`, categories use `180`, rest use `80`
- [ ] All connectors have exactly 2 anchors with valid item references
- [ ] JSON is complete — starts with `{`, ends with `}`
- [ ] No markdown code fences around the JSON
