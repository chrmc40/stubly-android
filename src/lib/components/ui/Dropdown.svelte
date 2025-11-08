<script lang="ts">
	import { ChevronDown, Check } from 'lucide-svelte';

	let {
		options = [],
		value = $bindable(''),
		placeholder = 'Select option...'
	} = $props<{
		options: Array<{ value: string; label: string }>;
		value?: string;
		placeholder?: string;
	}>();

	let open = $state(false);

	function toggle() {
		open = !open;
	}

	function select(optionValue: string) {
		value = optionValue;
		open = false;
	}

	function handleClickOutside(e: MouseEvent) {
		const target = e.target as HTMLElement;
		if (!target.closest('.dropdown-container')) {
			open = false;
		}
	}

	$effect(() => {
		if (open) {
			document.addEventListener('click', handleClickOutside);
			return () => document.removeEventListener('click', handleClickOutside);
		}
	});

	const selectedLabel = $derived(
		options.find((opt: { value: string; label: string }) => opt.value === value)?.label ||
			placeholder
	);
</script>

<div class="dropdown-container">
	<button class="dropdown-trigger" onclick={toggle} class:open>
		<span class="dropdown-label" class:placeholder={!value}>
			{selectedLabel}
		</span>
		<ChevronDown size={20} class="chevron" style="transform: rotate({open ? 180 : 0}deg)" />
	</button>

	{#if open}
		<div class="dropdown-menu">
			{#each options as option}
				<button
					class="dropdown-option"
					class:selected={option.value === value}
					onclick={() => select(option.value)}
				>
					<span>{option.label}</span>
					{#if option.value === value}
						<Check size={18} />
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.dropdown-container {
		position: relative;
		width: 100%;
	}

	.dropdown-trigger {
		width: 100%;
		padding: 12px 16px;
		background: var(--bg-input);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		color: var(--text-primary);
		display: flex;
		justify-content: space-between;
		align-items: center;
		transition: var(--ui-transition);
		text-align: left;
	}

	.dropdown-trigger:hover {
		border-color: var(--accent-subdued);
	}

	.dropdown-trigger.open {
		border-color: var(--accent-active);
	}

	.dropdown-label {
		flex: 1;
	}

	.dropdown-label.placeholder {
		color: var(--text-muted);
	}

	.dropdown-menu {
		position: absolute;
		top: calc(100% + 4px);
		left: 0;
		right: 0;
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: var(--border-radius);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: var(--z-dropdown);
		max-height: 300px;
		overflow-y: auto;
		animation: slideDown 0.2s ease;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.dropdown-option {
		width: 100%;
		padding: 12px 16px;
		text-align: left;
		display: flex;
		justify-content: space-between;
		align-items: center;
		color: var(--text-primary);
		transition: var(--ui-transition);
		border-bottom: 1px solid var(--border-color);
	}

	.dropdown-option:last-child {
		border-bottom: none;
	}

	.dropdown-option:hover {
		background: var(--bg-tertiary);
	}

	.dropdown-option.selected {
		background: var(--bg-quaternary);
		color: var(--accent-active);
	}

	.dropdown-option span {
		flex: 1;
	}
</style>
