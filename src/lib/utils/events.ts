/**
 * Typed event bus for app-wide communication
 * Provides type-safe event emission and listening without direct window API usage
 */

/**
 * Application event registry
 * Add new events here to get full TypeScript support across the app
 */
export interface AppEvents {
	/**
	 * Fired when device orientation or configuration changes
	 * No payload - listeners should re-query their state
	 */
	configurationChanged: undefined;

	/**
	 * Fired when the headroom header position changes
	 * Used by BottomNav to sync its visibility state
	 */
	headroomChange: {
		translateY: number;
		fullyVisible: boolean;
		fullyHidden: boolean;
		scrollY: number;
		isOrientationChange: boolean;
	};
}

/**
 * Emit a typed event
 * @param event Event name (must be a key in AppEvents)
 * @param detail Event payload (type-checked against AppEvents)
 */
export function emit<K extends keyof AppEvents>(
	event: K,
	...args: AppEvents[K] extends undefined ? [] : [AppEvents[K]]
): void {
	const detail = args[0];
	window.dispatchEvent(new CustomEvent(event, { detail }));
}

/**
 * Listen to a typed event
 * @param event Event name (must be a key in AppEvents)
 * @param handler Event handler (receives typed detail)
 * @returns Cleanup function to remove the listener
 */
export function listen<K extends keyof AppEvents>(
	event: K,
	handler: (detail: AppEvents[K]) => void
): () => void {
	const listener = (e: Event) => {
		handler((e as CustomEvent<AppEvents[K]>).detail);
	};
	window.addEventListener(event, listener);
	return () => window.removeEventListener(event, listener);
}

/**
 * Listen to an event only once
 * @param event Event name (must be a key in AppEvents)
 * @param handler Event handler (receives typed detail)
 * @returns Cleanup function (in case you want to cancel before it fires)
 */
export function listenOnce<K extends keyof AppEvents>(
	event: K,
	handler: (detail: AppEvents[K]) => void
): () => void {
	const listener = (e: Event) => {
		handler((e as CustomEvent<AppEvents[K]>).detail);
		window.removeEventListener(event, listener);
	};
	window.addEventListener(event, listener, { once: true });
	return () => window.removeEventListener(event, listener);
}
