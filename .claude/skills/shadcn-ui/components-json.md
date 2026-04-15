# components.json Reference

The `components.json` file configures how the shadcn CLI generates and places components. It's created by `shadcn init` and only needed if using the CLI.

## Schema

```json
{
  "$schema": "https://ui.shadcn.com/schema.json"
}
```

## Fields

### style

Component style variant. **Cannot be changed after init.**

```json
{ "style": "new-york" }
```

Note: the `default` style is deprecated. Always use `new-york`.

### rsc

React Server Components support. When `true`, the CLI adds `"use client"` to client components automatically.

```json
{ "rsc": true }
```

### tsx

When `false`, generates `.jsx` files instead of `.tsx`.

```json
{ "tsx": true }
```

### tailwind

| Field | Description | Notes |
|-------|-------------|-------|
| `config` | Path to `tailwind.config.js` | Leave blank for Tailwind v4 |
| `css` | Path to global CSS file | e.g. `app/globals.css` |
| `baseColor` | Base color palette | Cannot change after init |
| `cssVariables` | Use CSS vars for theming | Cannot change after init |
| `prefix` | Tailwind utility prefix | e.g. `tw-` |

### aliases

Controls import paths the CLI uses when generating code.

| Alias | Default | Purpose |
|-------|---------|---------|
| `utils` | `@/lib/utils` | `cn()` utility location |
| `components` | `@/components` | Component root |
| `ui` | `@/components/ui` | UI component directory |
| `lib` | `@/lib` | Library functions |
| `hooks` | `@/hooks` | Custom hooks |

If using `src/` directory, ensure paths are configured in `tsconfig.json`.

### iconLibrary

Icon library to use. Default: `lucide`.

### registries

Configure external component registries:

```json
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/{name}.json",
    "@private": {
      "url": "https://api.company.com/registry/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}"
      },
      "params": {
        "version": "latest"
      }
    }
  }
}
```

`{name}` is replaced with the resource name at install time. Environment variables (`${VAR_NAME}`) are expanded from the environment.

Usage:
```bash
pnpm dlx shadcn@latest add @v0/dashboard
pnpm dlx shadcn@latest add @private/button
```
