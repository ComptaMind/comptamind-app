/**
 * api.js — Client VPS ComptaMind via proxy Netlify Functions
 * Le frontend appelle /.netlify/functions/vps-proxy?endpoint=/run
 * Le proxy ajoute le WEBHOOK_SECRET (côté serveur Netlify, non visible client)
 */

const PROXY = "/.netlify/functions/vps-proxy";

async function call(endpoint, method = "GET", body = null) {
  const url = `${PROXY}?endpoint=${encodeURIComponent(endpoint)}`;
  const init = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) init.body = JSON.stringify(body);

  const res = await fetch(url, init);

  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch (_) {
    throw new Error(`Réponse inattendue du serveur (HTTP ${res.status}). Vérifiez que la Netlify Function est bien déployée.`);
  }

  if (!res.ok) {
    throw new Error(data.erreur || data.detail || `Erreur ${res.status}`);
  }
  return data;
}

/** Vérifie que le VPS répond */
export async function healthCheck() {
  return call("/health");
}

/**
 * Valide un run sans l'exécuter (dry run)
 * @param {string} client   - ex: "ATALAO"
 * @param {string} tache    - ex: "revision_balance"
 * @param {string} exercice - ex: "2025"
 * @param {string} fournisseur - optionnel
 */
export async function runDebug({ client, tache, exercice, fournisseur = "" }) {
  return call("/run-debug", "POST", { client, tache, exercice, fournisseur });
}

/**
 * Lance un run ComptaMind
 * Response : { status: "started", run_id: "...", eta_seconds: 300 }
 */
export async function runTask({ client, tache, exercice, fournisseur = "" }) {
  return call("/run", "POST", { client, tache, exercice, fournisseur });
}

/**
 * Récupère le dernier rapport de révision
 * @param {string} client - ex: "ATALAO"
 * @param {string} scope  - ex: "class4"
 */
export async function fetchLatestReport({ client, scope = "class4" }) {
  return call(`/latest-report?client=${encodeURIComponent(client)}&scope=${encodeURIComponent(scope)}`);
}
