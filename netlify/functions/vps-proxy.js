/**
 * vps-proxy.js — Proxy HTTPS → VPS HTTP
 * Permet au frontend HTTPS d'appeler le VPS HTTP sans erreur mixed-content.
 * Usage : POST /.netlify/functions/vps-proxy?endpoint=/run
 *
 * CORRECTIF 2026-04-20 : /run redirigé vers /run-async (réponse immédiate)
 * pour éviter le timeout Netlify (30s) sur les tâches longues (~260s).
 */

const VPS_URL = process.env.VPS_BASE_URL || "http://204.168.212.22:8080";

exports.handler = async (event) => {
  const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const rawEndpoint = event.queryStringParameters?.endpoint || "/health";

  // /run → /run-async : le VPS répond immédiatement (202) et traite en arrière-plan.
  // Évite le timeout Netlify sur les tâches longues (saisie, révision, etc.)
  const endpoint = rawEndpoint === "/run" ? "/run-async" : rawEndpoint;

  const isPost = event.httpMethod === "POST";

  const reqHeaders = { "Content-Type": "application/json" };
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) reqHeaders["X-ComptaMind-Secret"] = secret;

  try {
    const fetchOptions = {
      method: isPost ? "POST" : "GET",
      headers: reqHeaders,
      signal: AbortSignal.timeout(10000), // 10s max (réponse immédiate attendue)
    };
    if (isPost && event.body) fetchOptions.body = event.body;

    const resp = await fetch(`${VPS_URL}${endpoint}`, fetchOptions);
    const text = await resp.text();

    // Si la réponse n'est pas du JSON valide, on wrappe l'erreur
    let body = text;
    try {
      JSON.parse(text);
    } catch (_) {
      body = JSON.stringify({
        succes: false,
        erreur: `Le VPS a renvoyé une réponse inattendue (HTTP ${resp.status})`,
        detail: text.slice(0, 200),
      });
    }

    return { statusCode: resp.status, headers: CORS, body };
  } catch (err) {
    return {
      statusCode: 502,
      headers: CORS,
      body: JSON.stringify({
        succes: false,
        erreur: "VPS inaccessible",
        detail: err.message,
      }),
    };
  }
};
