import { useState, useEffect } from 'react'
import { listRecords } from '../lib/airtable'
import { TBL_CLIENTS, FLD_CLIENT_NAME } from '../lib/airtable-schema'

// IDs à exclure de toute l'interface
export const EXCLUDED_CLIENT_IDS = new Set([
  'recl8Gk8Ea7mwItQ4',
  'rec581fLc6Yhvowyz',
])

/**
 * Charge les vrais clients depuis Airtable.
 * Retourne les enregistrements bruts + un tableau normalisé { id, nom }
 * compatible avec les pages qui utilisaient useAppStore().clients.
 */
export function useAirtableClients() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    listRecords(TBL_CLIENTS)
      .then(all => setRecords(all.filter(r => !EXCLUDED_CLIENT_IDS.has(r.id))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Shape normalisée pour les composants existants
  const clients = records.map(r => ({
    id: r.id,
    nom: r.fields?.[FLD_CLIENT_NAME] || r.fields?.['Client Name'] || r.id,
    fields: r.fields,
  }))

  return { clients, records, loading }
}
