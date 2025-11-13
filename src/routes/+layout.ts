import { browser } from '$app/environment';
import { redirect } from '@sveltejs/kit';

export const prerender = true;
export const ssr = false;

export async function load({ url }) {
	// Only run client-side checks
	if (!browser) return {};

	const currentPath = url.pathname;

	// Skip checks for these routes
	if (currentPath === '/setup' ||
	    currentPath === '/demo' ||
	    currentPath === '/pick-username' ||
	    currentPath === '/') {
		return {};
	}

	// Check auth state - this will be handled in the layout onMount
	return {};
}
