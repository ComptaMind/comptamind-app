/**
 * airtable.js — Client Airtable pour le frontend ComptaMind
 * Token injecté via VITE_AIRTABLE_TOKEN (visible dans bundle, OK pour v1 cabinet interne)
 */

const BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const TOKEN   = import.meta.env.VITE_AIRTABLE_TOKEN;
const API     = "https://api.airtable.com/v0";

async function req(path, init = {}) {
  if (!TOKEN) throw new Error("VITE_AIRTABLE_TOKEN non configuré");
  const url = path.startsWith("http") ? path : `${API}/${BASE_ID}/${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${res.status}: ${text}`);
  }
  return res.json();
}

/** Liste tous les records d'une table avec filtre optionnel */
export async function listRecords(tableId, formula = "") {
  const all = [];
  let offset;
  do {
    const params = new URLSearchParams();
    if (formula) params.set("filterByFormula", formula);
    if (offset)  params.set("offset", offset);
    const qs = params.toString() ? `?${params}` : "";
    const resp = await req(`${tableId}${qs}`);
    all.push(...resp.records);
    offset = resp.offset;
  } while (offset);
  return all;
}

/** Récupère un record par son ID */
export async function getRecord(tableId, recordId) {
  return req(`${tableId}/${recordId}`);
}

/** Crée un record */
export async function createRecord(tableId, fields) {
  return req(tableId, {
    method: "POST",
    body: JSON.stringify({ fields }),
  });
}

/** Modifie un record (PATCH = mise à jour partielle) */
export async function updateRecord(tableId, recordId, fields) {
  return req(`${tableId}/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  });
}

/** Supprime un record */
export async function deleteRecord(tableId, recordId) {
  return req(`${tableId}/${recordId}`, { method: "DELETE" });
}
