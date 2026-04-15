# Theming Reference

## CSS Variables — Full List

shadcn/ui uses oklch color space. Variables are defined under `:root` (light) and `.dark` (dark mode).

### Light Mode (:root)

```css
:root {
  --radius: 0.625rem;

  /* Page */
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);

  /* Card */
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);

  /* Popover */
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);

  /* Primary */
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);

  /* Secondary */
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);

  /* Muted */
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);

  /* Accent */
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);

  /* Destructive */
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.985 0 0);

  /* Border, Input, Ring */
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);

  /* Chart colors (1–5) */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);

  /* Sidebar */
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}
```

### Dark Mode (.dark)

```css
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.269 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.371 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --destructive-foreground: oklch(0.985 0 0);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.439 0 0);
}
```

## Naming Convention

| Variable pattern | Usage |
|-----------------|-------|
| `--{name}` | Background color of the element |
| `--{name}-foreground` | Text color on that element |

Example: `bg-primary text-primary-foreground`

The `background` suffix is omitted — `--primary` IS the background color.

## Adding New Colors

Three steps:
1. Define the CSS variable in `:root` and `.dark`
2. Register with `@theme inline` directive (Tailwind v4)
3. Use in components via utility classes

```css
/* 1. Define */
:root {
  --success: oklch(0.72 0.19 142);
  --success-foreground: oklch(0.98 0 0);
}
.dark {
  --success: oklch(0.45 0.15 142);
  --success-foreground: oklch(0.98 0 0);
}

/* 2. Register */
@theme inline {
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

```tsx
// 3. Use
<div className="bg-success text-success-foreground">Done!</div>
```

## Available Base Colors

Set during `init` via `baseColor` in `components.json`:

- **Neutral** (default)
- **Stone**
- **Zinc**
- **Mauve**
- **Olive**
- **Mist**
- **Taupe**
