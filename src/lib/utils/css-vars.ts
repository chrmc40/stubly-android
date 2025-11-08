/**
 * CSS Custom Properties (variables) utility
 * Provides a clean interface for managing CSS variables without direct DOM manipulation
 */

/**
 * Set a CSS custom property on the document root
 */
export function setCSSVar(name: string, value: string): void {
	if (typeof document === 'undefined') return;
	document.documentElement.style.setProperty(name, value);
}

/**
 * Get a CSS custom property value from the document root
 */
export function getCSSVar(name: string): string {
	if (typeof document === 'undefined') return '';
	return getComputedStyle(document.documentElement).getPropertyValue(name);
}

/**
 * Remove a CSS custom property from the document root
 */
export function removeCSSVar(name: string): void {
	if (typeof document === 'undefined') return;
	document.documentElement.style.removeProperty(name);
}

/**
 * Set multiple CSS variables at once
 */
export function setCSSVars(vars: Record<string, string>): void {
	Object.entries(vars).forEach(([name, value]) => {
		setCSSVar(name, value);
	});
}
