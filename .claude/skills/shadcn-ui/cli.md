# CLI Reference

The `shadcn` CLI is the primary tool for managing shadcn/ui projects.

## init

Initialize a new project or configure an existing one.

```bash
pnpm dlx shadcn@latest init [components...] [options]
```

Key options:
- `-t, --template <template>` — Framework: next, vite, start, react-router, laravel, astro
- `-b, --base <base>` — Component library: radix, base
- `-p, --preset [name]` — Preset config (name, URL, or code)
- `-n, --name <n>` — Project name
- `-d, --defaults` — Use default configuration
- `-f, --force` — Force overwrite existing config
- `--monorepo` — Scaffold monorepo project
- `--rtl` — Enable RTL support
- `--css-variables` / `--no-css-variables` — Toggle CSS variable theming

Alias: `create`

## add

Add components to your project.

```bash
pnpm dlx shadcn@latest add [component...] [options]
```

Key options:
- `-o, --overwrite` — Overwrite existing files
- `-a, --all` — Add all available components
- `-p, --path <path>` — Custom destination path
- `--dry-run` — Preview changes without writing
- `--diff [path]` — Show diff for a file
- `--view [path]` — Show file contents

Examples:
```bash
# Single component
pnpm dlx shadcn@latest add button

# Multiple
pnpm dlx shadcn@latest add button card dialog

# From namespace
pnpm dlx shadcn@latest add @v0/dashboard

# Preview before installing
pnpm dlx shadcn@latest add button --dry-run
```

## view

Preview registry items before installing.

```bash
pnpm dlx shadcn@latest view [item...]
```

Examples:
```bash
pnpm dlx shadcn@latest view button card dialog
pnpm dlx shadcn@latest view @acme/auth @v0/dashboard
```

## search

Search items from registries. Alias: `list`

```bash
pnpm dlx shadcn@latest search [registry...] [options]
```

Key options:
- `-q, --query <query>` — Search query string
- `-l, --limit <number>` — Max results per registry (default 100)

Examples:
```bash
pnpm dlx shadcn@latest search @shadcn -q "button"
pnpm dlx shadcn@latest search @shadcn @v0 @acme
```

## build

Generate registry JSON from `registry.json`.

```bash
pnpm dlx shadcn@latest build [registry] [options]
```

Options:
- `-o, --output <path>` — Output directory (default `./public/r`)

## docs

Fetch component documentation and API references.

```bash
pnpm dlx shadcn@latest docs [component]
```

Options:
- `-b, --base <base>` — Base to use: 'base' or 'radix'
- `--json` — Output as JSON

## info

Show project configuration info.

```bash
pnpm dlx shadcn@latest info
```

## migrate

Run project migrations.

```bash
pnpm dlx shadcn@latest migrate [migration] [path]
```

Available migrations:

| Migration | What it does |
|-----------|-------------|
| `icons` | Migrate to a different icon library |
| `radix` | Migrate `@radix-ui/react-*` → unified `radix-ui` package |
| `rtl` | Transform physical CSS → logical properties for RTL support |

### migrate rtl

Transforms:
- `ml-4` → `ms-4`, `mr-4` → `me-4`
- `pl-4` → `ps-4`, `pr-4` → `pe-4`
- `text-left` → `text-start`, `text-right` → `text-end`
- Adds `rtl:space-x-reverse` where needed

Can target specific files:
```bash
pnpm dlx shadcn@latest migrate rtl src/components/ui/button.tsx
pnpm dlx shadcn@latest migrate rtl "src/components/ui/**"
```

### migrate radix

Transforms imports:
```tsx
// Before
import * as DialogPrimitive from "@radix-ui/react-dialog"
// After
import { Dialog as DialogPrimitive } from "radix-ui"
```
