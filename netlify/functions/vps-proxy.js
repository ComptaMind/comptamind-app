/**
 * vps-proxy.js — Proxy HTTPS → VPS HTTP
 * Permet au frontend HTTPS d'appeler le VPS HTTP sans erreur mixed-content.
 * Usage : POST /.netlify/functions/vps-proxy?endpoint=/run
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

  const endpoint = event.queryStringParameters?.endpoint || "/health";
  const isPost = event.httpMethod === "POST";

  const reqHeaders = { "Content-Type": "application/json" };
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) reqHeaders["X-ComptaMind-Secret"] = secret;

  try {
    const fetchOptions = { method: isPost ? "POST" : "GET", headers: reqHeaders };
    if (isPost && event.body) fetchOptions.body = event.body;

    const resp = await fetch(`${VPS_URL}${endpoint}`, fetchOptions);
    const text = await resp.text();

    return {
      statusCode: resp.status,
      headers: CORS,
      body: text,
    };
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
