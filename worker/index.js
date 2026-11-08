/**
 * Static asset Worker for F1 Career Simulator.
 *
 * Serves the Vite build from the assets binding. The application uses a single
 * HTML entry point, so unknown extension-less paths fall back to index.html.
 * No server-side state, no secrets, no network calls.
 */
export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404 || request.method !== 'GET') return response;

    const url = new URL(request.url);
    const lastSegment = url.pathname.split('/').pop() ?? '';
    if (lastSegment.includes('.')) return response;

    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request));
  },
};
