# Modal System Documentation

Modern Svelte 5 modal management system with type-safe registry and lazy loading.

## Architecture

```
src/lib/modals/
├── modalRegistry.ts       # Registry of all modals with types
├── modalStore.svelte.ts   # Global modal state (Svelte 5 runes)
├── ModalManager.svelte    # Renders active modal
├── components/            # Individual modal components
│   └── ExampleModal.svelte
└── README.md             # This file
```

## Quick Start

### 1. Create a Modal Component

```svelte
<!-- src/lib/modals/components/CreateFolderModal.svelte -->
<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';

	interface Props {
		path: string[];
		onComplete?: (result?: any) => void;
	}

	let { path, onComplete }: Props = $props();
	let open = $state(true);
	let folderName = $state('');

	function handleClose() {
		open = false;
		onComplete?.({ status: 'cancelled' });
	}

	function handleCreate() {
		open = false;
		onComplete?.({
			status: 'completed',
			data: { folderName }
		});
	}
</script>

<Modal bind:open title="Create Folder">
	<input bind:value={folderName} placeholder="Folder name" />
	<button onclick={handleClose}>Cancel</button>
	<button onclick={handleCreate}>Create</button>
</Modal>
```

### 2. Register the Modal

```typescript
// src/lib/modals/modalRegistry.ts

export const modals = {
	CreateFolder: async () => (await import('./components/CreateFolderModal.svelte')).default,
	// ... other modals
} as const;

export interface ModalPropsMap {
	CreateFolder: { path: string[] };
	// ... other modal props
}
```

### 3. Open the Modal

**Simple open:**
```typescript
import { openModal } from '$lib/modals/modalStore.svelte';

openModal('CreateFolder', { path: ['foo', 'bar'] });
```

**With Promise-based result:**
```typescript
import { showModal } from '$lib/modals/modalStore.svelte';

const result = await showModal('CreateFolder', { path: ['foo', 'bar'] });

if (result.status === 'completed') {
	console.log('Folder created:', result.data.folderName);
}
```

**From anywhere in the app:**
```typescript
import { modalStore } from '$lib/modals/modalStore.svelte';

modalStore.open('CreateFolder', { path: ['foo', 'bar'] });
```

## API Reference

### `openModal<K>(name: K, props?: ModalProps<K>): Promise<void>`
Opens a modal by key with given props. Returns immediately.

### `closeModal(): void`
Closes the currently open modal.

### `showModal<K>(name: K, props?: ModalProps<K>): Promise<any>`
Opens a modal and returns a Promise that resolves when the modal completes.

### `updateModalProps<K>(props: Partial<ModalProps<K>>): void`
Updates props of the currently open modal.

### `modalStore.current`
Reactive getter for current modal state.

## Modal Component Pattern

Every modal component should:

1. **Accept `onComplete` prop** - Callback for completion/cancellation
2. **Use bindable `open` state** - Control modal visibility
3. **Call `onComplete` with status** - Either 'completed' or 'cancelled'
4. **Wrap content in `Modal` component** - Use the base Modal component

```typescript
interface Props {
	// Your custom props
	myProp: string;

	// Required for registry system
	onComplete?: (result?: any) => void;
	__modalKey?: string;
}
```

## Result Object Pattern

```typescript
// Cancelled
{ status: 'cancelled' }

// Completed with data
{
	status: 'completed',
	data: {
		// Your result data
	}
}

// Partial update (doesn't close modal)
{
	status: 'updating',
	data: {
		// Partial update data
	}
}
```

## Type Safety

The system is fully type-safe:

- Modal keys are typed as `ModalKey`
- Props are typed per modal in `ModalPropsMap`
- TypeScript will error if you try to open a non-existent modal
- Props are validated at compile time

## Benefits vs Direct Import

### Registry System (Current)
✅ Lazy loading (better performance)
✅ Open modals from anywhere (stores, utils)
✅ Type-safe modal keys
✅ Centralized management
✅ Promise-based results
✅ Easy to track all modals

### Direct Import (Old Way)
❌ All modals bundled together
❌ Must be in component tree
❌ No centralized control
❌ Harder to track state

## Porting from sn5

When porting modals from sn5, follow these steps:

1. Copy the modal component to `src/lib/modals/components/`
2. Update to use `Modal` wrapper component from `$lib/components/ui/Modal.svelte`
3. Convert Svelte 4 patterns to Svelte 5 runes:
   - `export let` → `let { ... } = $props()`
   - `let foo = false` → `let foo = $state(false)`
   - `$: derived` → `let derived = $derived(...)`
4. Register in `modalRegistry.ts`
5. Add TypeScript types to `ModalPropsMap`
6. Update any calls from `modalStore.open()` to use new import

## Examples

See `ExampleModal.svelte` for a complete working example.
