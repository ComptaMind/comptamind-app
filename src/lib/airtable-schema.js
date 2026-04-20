/**
 * airtable-schema.js — IDs stables de la base Airtable ComptaMind
 * Source : airtable_client.py (VPS /opt/comptamind)
 * RÈGLE : toujours utiliser ces IDs, JAMAIS les noms (caractères spéciaux → 403)
 */

// Base
export const BASE_ID = "appc6LMeUQJiX8gjG";

// ── Tables ──────────────────────────────────────────────────────────────────
export const TBL_CLIENTS    = "tbltYzbIdiL7xmcLq"; // Clients / Dossiers
export const TBL_CONNECTEURS = "tblXKiirOU63ZUa0L"; // Connecteurs logiciels (tokens Pennylane)
export const TBL_QUEUE      = "tblkL4KNonJDCxYeV"; // Queue de travail (tâches / runs)
export const TBL_ALERTES    = "tbl3TNR0Pqu425WEv"; // Alertes & Incohérences (rapports)
export const TBL_DECISIONS  = "tblz3m938mWkkQsSK"; // Décisions ComptaMind
export const TBL_REGLES     = "tblbtj3QUhsxXiS60"; // Règles & Instructions (backend only)

// ── Champs : Clients / Dossiers ─────────────────────────────────────────────
export const FLD_CLIENT_NAME         = "fldYwpp52BGWVQql1"; // Client Name
export const FLD_CLIENT_SIREN        = "fldvddKLeLGxyqHuS"; // SIREN
export const FLD_CLIENT_PROFIL       = "fldHzxddkKCu7oMVh"; // Profil comptable (EI/SARL/…)
export const FLD_CLIENT_PROFIL_JSON  = "fldiyDDkf7aKFhVpo"; // Profil détail JSON
export const FLD_CLIENT_CONNECTEURS  = "fldlunPbwzAgmuIl1"; // Lien → Connecteurs
export const FLD_CLIENT_LAST_ACTION  = "fldlz3rnylWTkchJZ"; // Dernière action ComptaMind
export const FLD_CLIENT_STATUS       = "fldPF6zbZhiPU1XlK"; // Statut dossier

// ── Champs : Connecteurs ────────────────────────────────────────────────────
export const FLD_CONN_NAME       = "fldSz4a3yYnPIUyxj"; // Nom connecteur
export const FLD_CONN_CLIENT     = "fldOpZSIx5uj2Qo5K"; // Lien → Client
export const FLD_CONN_SOFTWARE   = "fldadOrldefTiskYC"; // Logiciel (Pennylane…)
export const FLD_CONN_STATUS     = "fldire6o9mFZnhCrf"; // Statut
export const FLD_CONN_DOSSIER_ID = "fldMjvBvG5z1sAF7p"; // Dossier ID dans le logiciel
export const FLD_CONN_LAST_SYNC  = "fldEwW6wygysQd4cP"; // Dernière synchro
// ⚠️ FLD_CONN_API_TOKEN (fld4zaG2f11KLA33o) → JAMAIS lire depuis le frontend

// ── Champs : Queue de travail ───────────────────────────────────────────────
export const FLD_TASK_NAME     = "fldeqy0ktUk6AEY7j"; // Nom / référence
export const FLD_TASK_TYPE     = "fldsCklCgqkqMFJoD"; // Type de tâche
export const FLD_TASK_DOSSIER  = "fld2SInM75fWHuuwi"; // Dossier (lien)
export const FLD_TASK_STATUS   = "fld07OI5s7iqGJ8h0"; // Statut
export const FLD_TASK_LOGS     = "fldvGxkMzLUSqhwP1"; // Logs d'exécution
export const FLD_TASK_AUTO     = "flddi8oZBDftQ1FEE"; // Automatique/Manuel

// ── Champs : Alertes ────────────────────────────────────────────────────────
export const FLD_ALERT_NAME      = "fldoWx79Nemg3c9O6";
export const FLD_ALERT_TYPE      = "fldw2aKwxIOO3OO8L";
export const FLD_ALERT_SEVERITY  = "fldelBJMA0uE6Q2sT";
export const FLD_ALERT_DOSSIER   = "fldAD3hacQXCDgZoc";
export const FLD_ALERT_RECOMMEND = "fldUxXDzEcbpJnJ2Y";
export const FLD_ALERT_STATUS    = "fldd8hW3CbQAPVPoS";

// ── Tâches valides (source : run_task.py TACHES_VALIDES) ────────────────────
export const TACHES = [
  { value: "revision_balance",    label: "Révision balance",        writeOp: false },
  { value: "revision_fournisseur",label: "Révision fournisseur",    writeOp: false },
  { value: "revision_client",     label: "Révision client",         writeOp: false },
  { value: "veille_quotidienne",  label: "Veille quotidienne",      writeOp: false },
  { value: "revision_tva",        label: "Révision TVA",            writeOp: true  },
  { value: "saisie_factures",     label: "Saisie factures",         writeOp: true  },
  { value: "rapprochement_bancaire", label: "Rapprochement bancaire", writeOp: true },
  { value: "relance_clients",     label: "Relances clients",        writeOp: true  },
];
