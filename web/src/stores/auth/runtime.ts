export const isEmbeddedMode = import.meta.env.VITE_EMBEDDED_MODE === 'true'

export function getOAuthCallbackToken(): string | null {
	return window.location.pathname === '/auth/callback'
		? new URLSearchParams(window.location.search).get('token')
		: null
}