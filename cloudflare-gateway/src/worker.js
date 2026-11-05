/**
 * Cloudflare Worker Edge Gateway for TikTok Live Text-to-Speech (TTS) Platform.
 *
 * This Worker acts as an intelligent edge reverse-proxy and security shield:
 * 1. Global Anycast Edge: Terminate TLS and route requests to backend with low latency.
 * 2. Full Secure WebSocket (WSS) Support: Proxies both OBS Studio overlay widgets and Streamer Dashboards.
 * 3. DDoS & Bot Protection: Leverages Cloudflare edge firewall and Rate Limiting.
 * 4. Zero-Cost Architecture: Operates within Cloudflare Workers Free Tier (100,000 requests/day).
 */

export default {
  /**
   * Main entrypoint for Cloudflare Worker HTTP & WebSocket requests.
   *
   * @param {Request} request - Incoming client Request object from browser or OBS.
   * @param {Object} env - Environment bindings and variables configured in wrangler.jsonc.
   * @param {Object} ctx - Execution context for background tasks.
   * @returns {Promise<Response>} Upstream proxied response or error payload.
   */
  async fetch(request, env, ctx) {
    // 1. Resolve backend target origin (e.g., Hugging Face Spaces or container endpoint)
    const backendOrigin = (env.BACKEND_URL || "https://phuriphat-tiktok-live-tts.hf.space").replace(/\/+$/, "");
    const incomingUrl = new URL(request.url);

    // 2. Build target URL preserving pathname and query parameters (tokens, session IDs)
    const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendOrigin);

    // 3. Clone and sanitize headers for upstream proxying
    const forwardHeaders = new Headers(request.headers);
    forwardHeaders.set("Host", targetUrl.host);
    forwardHeaders.set("X-Forwarded-Host", incomingUrl.host);
    forwardHeaders.set("X-Forwarded-Proto", incomingUrl.protocol.replace(":", ""));
    forwardHeaders.set("X-Real-IP", request.headers.get("CF-Connecting-IP") || "");

    // 4. Handle HTTP request method and body
    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const requestInit = {
      method: request.method,
      headers: forwardHeaders,
      redirect: "follow",
    };

    if (hasBody) {
      requestInit.body = request.body;
    }

    // 5. Dispatch fetch upstream (Fetch API in Cloudflare Workers automatically proxies WebSockets when Upgrade header is present)
    try {
      const upstreamResponse = await fetch(targetUrl.toString(), requestInit);

      // Return upstream response directly with original status and headers
      return upstreamResponse;
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Bad Gateway (502)",
          message: "Could not establish connection to the TikTok Live TTS backend container.",
          backend_target: targetUrl.origin,
          detail: error.message || String(error),
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  },
};
