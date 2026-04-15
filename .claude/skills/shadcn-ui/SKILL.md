---
name: shadcn-ui
description: Build frontend projects using shadcn/ui — a code-distribution component system for React. Use this skill whenever the user mentions shadcn, shadcn/ui, wants to set up a new React project with a component library, asks to add UI components (Button, Dialog, Card, Table, Form, Sidebar, etc.), needs help with shadcn CLI commands (init, add, build, migrate), wants to customize themes or CSS variables for a Tailwind-based design system, or asks about components.json configuration. Also trigger when the user wants to create a Next.js/Vite/Astro/React Router/Laravel/TanStack Start project with a prebuilt component system, needs help with Radix UI primitives in a shadcn context, asks about dark mode setup, RTL support, or monorepo configuration for UI components. If the user references any of the ~60 shadcn/ui components by name (e.g. Accordion, Alert Dialog, Combobox, Data Table, Drawer, Sheet, Sonner, etc.), use this skill.
---

# shadcn/ui Frontend Skill

This skill guides you through building frontend projects with shadcn/ui — an open-code component system that gives you actual component source code (not an NPM dependency) built on Radix UI primitives and Tailwind CSS.

## Core Concept

shadcn/ui is NOT a traditional component library you install from NPM. It copies component source code directly into your project. You own and modify the code. This is a fundamental difference — understand it before advising the user.

Key implications:
- Components live in the user's codebase (typically `@/components/ui/`)
- Customization happens by editing the source directly, not by overriding styles
- The CLI (`shadcn`) is used to pull components, not `import` from an external package
- Updates are pulled selectively, not through `npm update`

## Project Setup

### Quick Start (new project)

```bash
pnpm dlx shadcn@latest init
```

This interactive wizard will ask for framework, icon library, base color, and theme. It sets up `components.json`, installs dependencies, configures Tailwind CSS, and creates the `cn()` utility.

### Framework-specific init

```bash
# Next.js
pnpm dlx shadcn@latest init -t next

# Vite
pnpm dlx shadcn@latest init -t vite

# TanStack Start
pnpm dlx shadcn@latest init -t start

# React Router
pnpm dlx shadcn@latest init -t react-router

# Laravel
pnpm dlx shadcn@latest init -t laravel

# Astro
pnpm dlx shadcn@latest init -t astro
```

For monorepos, add `--monorepo` flag.

### Adding components

```bash
# Single component
pnpm dlx shadcn@latest add button

# Multiple at once
pnpm dlx shadcn@latest add button card dialog

# All components
pnpm dlx shadcn@latest add --all

# From a registry namespace
pnpm dlx shadcn@latest add @v0/dashboard
```

After adding, import from local path:

```tsx
import { Button } from "@/components/ui/button"
```

## components.json

This is the project configuration file. Key fields:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "app/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

Important notes:
- `style` and `baseColor` cannot be changed after init — re-init if needed
- `rsc: true` adds `"use client"` directives automatically to client components
- `tsx: false` generates `.jsx` files instead of `.tsx`
- Leave `tailwind.config` blank for Tailwind CSS v4
- `aliases.ui` controls where component files are placed

For detailed field reference, see `references/components-json.md`.

## Theming

shadcn/ui uses CSS variables with the oklch color space and a `background`/`foreground` naming convention.

### Color convention

- `--primary` → background color of primary elements
- `--primary-foreground` → text color on primary elements
- Applied via Tailwind: `bg-primary text-primary-foreground`

### Core CSS variables

For the full variable list and dark mode overrides, see `references/theming.md`.

### Adding custom colors

```css
:root {
  --warning: oklch(0.84 0.16 84);
  --warning-foreground: oklch(0.28 0.07 46);
}

.dark {
  --warning: oklch(0.41 0.11 46);
  --warning-foreground: oklch(0.99 0.02 95);
}

@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
}
```

Then use: `<div className="bg-warning text-warning-foreground" />`

### Base colors

Available: Neutral, Stone, Zinc, Mauve, Olive, Mist, Taupe.

## CLI Commands

| Command | Purpose |
|---------|---------|
| `init` | Initialize project, install deps, configure CSS variables |
| `add [component]` | Add components to project |
| `view [item]` | Preview registry items before installing |
| `search [registry]` | Search items from registries |
| `build` | Generate registry JSON from `registry.json` |
| `docs [component]` | Fetch component docs and API references |
| `info` | Show project configuration info |
| `migrate [migration]` | Run migrations (icons, radix, rtl) |

For full CLI option reference, see `references/cli.md`.

## Available Components

shadcn/ui provides ~60 components built on Radix UI primitives. The complete list:

**Layout & Navigation:** Accordion, Breadcrumb, Collapsible, Navigation Menu, Pagination, Resizable, Scroll Area, Separator, Sidebar, Tabs

**Data Display:** Avatar, Badge, Calendar, Card, Carousel, Chart, Data Table, Hover Card, Table, Typography

**Forms & Input:** Button, Button Group, Calendar, Checkbox, Combobox, Command, Date Picker, Field, Input, Input Group, Input OTP, Label, Native Select, Radio Group, Select, Slider, Switch, Textarea, Toggle, Toggle Group

**Feedback:** Alert, Empty, Progress, Skeleton, Sonner (toast), Spinner, Toast

**Overlays:** Alert Dialog, Context Menu, Dialog, Drawer, Dropdown Menu, Menubar, Popover, Sheet, Tooltip

**Utilities:** Aspect Ratio, Direction, Item, Kbd

## Component Usage Pattern

Every shadcn/ui component follows a composable pattern:

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function MyCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
        <CardDescription>Description</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Content here</p>
      </CardContent>
      <CardFooter>
        <p>Footer</p>
      </CardFooter>
    </Card>
  )
}
```

This composable sub-component pattern (Card → CardHeader, CardTitle, etc.) is consistent across all components. It makes components predictable for both humans and AI.

## Dark Mode

Dark mode works via the `.dark` CSS class on `<html>` or a parent element. All CSS variables have dark variants defined in `.dark {}`. Recommended approach: use `next-themes` for Next.js or a class-toggle utility for other frameworks.

## RTL Support

Enable RTL via:
```bash
pnpm dlx shadcn@latest migrate rtl
```

This transforms physical CSS properties to logical equivalents (`ml-4` → `ms-4`, `text-left` → `text-start`) and adds `rtl:` variants where needed.

## Registry System

shadcn/ui includes a code distribution registry system. You can:
- Consume components from the official registry or third-party registries
- Create and host your own component registry
- Use namespaced registries (`@acme/button`, `@v0/dashboard`)
- Configure private registries with auth headers in `components.json`

## Best Practices When Helping Users

1. Always use the `shadcn` CLI to add components — don't manually create component files unless the user specifically asks for it
2. Use CSS variables (oklch) for theming, not hardcoded colors
3. Follow the composable sub-component pattern when building custom components
4. Use `cn()` utility (from `@/lib/utils`) for conditional class merging — it combines `clsx` and `tailwind-merge`
5. Prefer the `new-york` style (the `default` style is deprecated)
6. When customizing components, edit the source in `@/components/ui/` directly
7. For forms, recommend React Hook Form + Zod validation or TanStack Form
8. Always check the user's framework before suggesting installation commands
