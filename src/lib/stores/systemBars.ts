import { writable } from 'svelte/store';
import { SystemBars } from '$lib/config/system-bars';
import { setCSSVars } from '$lib/utils/css-vars';
import { emit } from '$lib/utils/events';

export interface SystemBarsData {
	orientation: number;
	statusBar: number;
	navigationBar: number;
	navBarLeft: number;
	navBarRight: number;
	navBarSide: 'left' | 'right' | 'bottom';
	notch: boolean;
	notchTop: number;
	notchBottom: number;
	notchLeft: number;
	notchRight: number;
}

const defaultData: SystemBarsData = {
	orientation: 0,
	statusBar: 0,
	navigationBar: 0,
	navBarLeft: 0,
	navBarRight: 0,
	navBarSide: 'bottom',
	notch: false,
	notchTop: 0,
	notchBottom: 0,
	notchLeft: 0,
	notchRight: 0
};

export const systemBarsData = writable<SystemBarsData>(defaultData);

let configListener: any = null;

/**
 * Initialize system bars detection and update CSS variables
 */
export async function initSystemBars() {
	if (typeof window === 'undefined') return;

	// Get initial system bar measurements
	await updateSystemBars();

	// Listen for configuration changes (orientation, etc)
	if ((window as any).Capacitor?.isNativePlatform?.()) {
		configListener = await SystemBars.addListener('configurationChanged', async () => {
			console.log('Configuration changed - updating system bars');
			await updateSystemBars();

			// Dispatch typed event for other components to react
			emit('configurationChanged');
		});
	}
}

/**
 * Fetch system bar data and update both store and CSS variables
 */
async function updateSystemBars() {
	if (typeof window === 'undefined') return;
	if (!(window as any).Capacitor?.isNativePlatform?.()) return;

	try {
		const data = await SystemBars.getHeights();
		const dpr = window.devicePixelRatio || 1;

		// Convert physical pixels to CSS pixels
		const statusBarHeight = data.statusBar / dpr;
		const navBarBottom = data.navigationBar / dpr;
		const navBarLeft = data.navBarLeft / dpr;
		const navBarRight = data.navBarRight / dpr;
		const notchLeft = data.notchLeft / dpr;
		const notchRight = data.notchRight / dpr;

		// Calculate total side padding (nav bar + notch on opposite sides)
		let totalLeft = 0;
		let totalRight = 0;

		if (data.navBarSide === 'left') {
			totalLeft = navBarLeft;
			totalRight = notchRight; // Notch on opposite side
		} else if (data.navBarSide === 'right') {
			totalLeft = notchLeft; // Notch on opposite side
			totalRight = navBarRight;
		} else {
			// Portrait mode - no side padding (status bar covers notch)
			totalLeft = 0;
			totalRight = 0;
		}

		// Update CSS variables using utility
		setCSSVars({
			'--status-bar-height': `${statusBarHeight}px`,
			'--nav-bar-bottom': `${navBarBottom}px`,
			'--nav-bar-left': `${totalLeft}px`,
			'--nav-bar-right': `${totalRight}px`
		});

		// Update store
		systemBarsData.set({
			orientation: data.orientation,
			statusBar: Math.round(statusBarHeight),
			navigationBar: Math.round(navBarBottom),
			navBarLeft: Math.round(navBarLeft),
			navBarRight: Math.round(navBarRight),
			navBarSide: data.navBarSide,
			notch: data.notch,
			notchTop: Math.round(data.notchTop / dpr),
			notchBottom: Math.round(data.notchBottom / dpr),
			notchLeft: Math.round(notchLeft),
			notchRight: Math.round(notchRight)
		});

		console.log('System bars updated:', {
			statusBar: statusBarHeight,
			navBottom: navBarBottom,
			navLeft: navBarLeft,
			navRight: navBarRight,
			notchLeft: notchLeft,
			notchRight: notchRight,
			totalLeft: totalLeft,
			totalRight: totalRight,
			side: data.navBarSide
		});
	} catch (error) {
		console.error('Failed to get system bar heights:', error);
	}
}

/**
 * Clean up listeners
 */
export function cleanupSystemBars() {
	if (configListener) {
		configListener.remove();
		configListener = null;
	}
}
