# Architecture Guide

This document explains the architectural patterns used in this codebase following Unix philosophy principles.

## Core Principles

1. **Do one thing well** - Each module has a single, clear responsibility
2. **Compose via interfaces** - Modules communicate through well-defined contracts
3. **No tight coupling** - Components can be removed or replaced independently
4. **Type safety** - All contracts are typed and verified at compile time

## Utilities

### Event Bus (`lib/utils/events.ts`)

Provides type-safe event communication across components.

**Features:**
- All events defined in `AppEvents` interface
- Full TypeScript autocomplete and type checking
- Eliminates magic strings and runtime errors

**Usage:**
```typescript
import { emit, listen } from '$lib/utils/events';

// Emit a typed event
emit('headroomChange', {
  translateY: 100,
  fullyVisible: false,
  fullyHidden: false,
  scrollY: 500,
  isOrientationChange: false
});

// Listen to typed events
onMount(() => {
  const cleanup = listen('headroomChange', (detail) => {
    // detail is fully typed!
    console.log(detail.translateY);
  });
  return cleanup;
});
```

**Adding new events:**
```typescript
// In lib/utils/events.ts
export interface AppEvents {
  myNewEvent: { foo: string; bar: number };
}

// Now you can use it anywhere with full type safety
emit('myNewEvent', { foo: 'hello', bar: 42 });
```

### CSS Variables (`lib/utils/css-vars.ts`)

Provides a clean interface for managing CSS custom properties.

**Features:**
- Abstracts DOM manipulation
- SSR-safe (no-ops when window is undefined)
- Easy to test and mock

**Usage:**
```typescript
import { setCSSVar, setCSSVars } from '$lib/utils/css-vars';

// Set a single variable
setCSSVar('--my-color', '#ff0000');

// Set multiple variables at once
setCSSVars({
  '--header-height': '60px',
  '--nav-height': '56px',
  '--primary-color': '#007aff'
});
```

## Component Communication

Components communicate via:

1. **Typed Events** - For cross-component notifications
2. **CSS Variables** - For shared styling values
3. **Svelte Stores** - For reactive shared state

### Example: HeadroomHeader → BottomNav

```
HeadroomHeader (scroll handler)
    ↓ emit('headroomChange', {...})
BottomNav (listens)
    ↓ syncs its own position
CSS Variables (--nav-bar-bottom, etc)
    ↓ used by both components
Result: No imports between components!
```

## File Organization

```
lib/
├── actions/        # Svelte actions
├── components/     # UI components
│   ├── forms/      # Form inputs
│   ├── layout/     # Layout components (Header, Nav, etc)
│   └── ui/         # Reusable UI widgets
├── composables/    # Svelte 5 runes composables
├── config/         # Configuration and plugin definitions
├── server/         # Server-only code
├── stores/         # Svelte stores
├── types/          # TypeScript type definitions
└── utils/          # Pure utility functions
    ├── css-vars.ts # CSS variable management
    ├── events.ts   # Typed event bus
    └── helpers/    # Other helpers
```

## Best Practices

### ✅ Do This

```typescript
// Use typed events
emit('configurationChanged');
const cleanup = listen('headroomChange', (detail) => { ... });

// Use CSS var utilities
setCSSVar('--my-var', '10px');

// Export typed interfaces
export interface MyData {
  foo: string;
}
```

### ❌ Don't Do This

```typescript
// Direct DOM manipulation
document.documentElement.style.setProperty('--my-var', '10px');

// Magic string events
window.dispatchEvent(new CustomEvent('myEvent', { detail: {...} }));

// Direct component imports for communication
import { someState } from './OtherComponent.svelte';
```

## Testing Strategy

Because utilities are small and focused:

1. **CSS vars** - Can be mocked to test without DOM
2. **Events** - Can be tested in isolation
3. **Components** - Can test behavior by emitting events

## Migration Guide

When adding new features:

1. **Define events** in `lib/utils/events.ts`
2. **Define CSS variables** needed (use utilities to set them)
3. **Create component** that uses typed events
4. **Compose** - Your component works with others without imports!

This architecture ensures your codebase remains maintainable, testable, and composable as it grows.
