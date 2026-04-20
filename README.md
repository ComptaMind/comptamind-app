# ComptaMind — App cabinet

Interface React de l'agent IA comptable ComptaMind, déployée sur `app.comptamind.fr`.

## Développement local

```bash
# Installer les dépendances
npm install

# Lancer le serveur de dev (nécessite Node v20 via nvm)
/bin/bash start-dev.sh
# ou
export PATH="$HOME/.nvm/versions/node/v20.20.1/bin:$PATH" && npm run dev
```

L'app est accessible sur `http://localhost:5173`.

## Variables d'environnement

Créez un fichier `.env.local` à la racine (non versionné) :

```env
VITE_APP_PASSWORD=        # Mot de passe cabinet
VITE_CABINET_NAME=        # Nom du cabinet (ex: "Cabinet Kamgang")
VITE_AIRTABLE_TOKEN=      # Personal Access Token Airtable (scope: base appc6LMeUQJiX8gjG)
VITE_AIRTABLE_BASE_ID=appc6LMeUQJiX8gjG
```

Pour la Netlify Function (côté serveur, non visible dans le bundle) :

```env
WEBHOOK_SECRET=           # Secret partagé avec le VPS pour authentifier les appels
VPS_BASE_URL=             # URL du VPS (défaut: http://204.168.212.22:8080)
```

## Architecture

```
Frontend (React/Vite)
  app.comptamind.fr  ──→  /.netlify/functions/vps-proxy  ──→  VPS FastAPI :8080
                     ──→  api.airtable.com (lecture directe, token limité)

VPS (FastAPI + Claude Sonnet)
  /run          ← lance une tâche ComptaMind
  /run-debug    ← dry run (validation sans exécution)
  /health       ← ping

Airtable (base appc6LMeUQJiX8gjG)
  Clients/Dossiers, Queue, Alertes, Autorisations, Mémoire, Rapports...
```

Pour l'architecture complète, voir le dossier `PACKAGE_CLAUDE_CODE/` dans `~/Documents/How to use Claude/`.

## Déploiement Netlify

- Repo GitHub : `github.com/ComptaMind/comptamind-app`
- Build command : `npm run build`
- Publish directory : `dist`
- Auto-deploy : chaque push sur `main`

## Pages disponibles

| Route | Description |
|---|---|
| `/` | Login (mot de passe cabinet) |
| `/dashboard` | Tableau de bord |
| `/clients` | Liste des dossiers (depuis Airtable) |
| `/clients/:id` | Détail dossier |
| `/comptamind` | Interface de commande ComptaMind |
| `/autonomie` | Tâches planifiées |
| `/autorisations` | Permissions par action |
| `/memoire` | Mémoire ComptaMind |
| `/rapports` | Rapports générés |
| `/parametres` | Paramètres cabinet |

## Règles métier importantes

- **Exercice ≤ 2025** → observation pure : les boutons d'écriture sont grisés
- Les tokens Pennylane ne transitent **jamais** par le frontend
- Toujours utiliser les IDs `tbl...` Airtable, jamais les noms
