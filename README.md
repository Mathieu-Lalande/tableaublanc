# Canvas

Tableau blanc collaboratif entre potes : une toile infinie pour noter, dessiner, organiser
ses idées ou jouer, à plusieurs en temps réel (curseurs nommés et colorés, chat, réactions),
avec des modules prêts à l'emploi : mind map, kanban, rétro, flowchart, jeux…

Construit sur le [SDK tldraw](https://tldraw.dev) 5.6 et **tldraw sync** auto-hébergé.
Usage personnel, non commercial : le watermark « made with tldraw » reste affiché (licence hobby).

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Architecture](#architecture)
3. [Développement local](#développement-local)
4. [Tests](#tests)
5. [Déploiement pas à pas (VPS + Docker + HTTPS)](#déploiement-pas-à-pas-vps--docker--https)
6. [Administration](#administration)
7. [Sécurité](#sécurité)
8. [Compromis assumés](#compromis-assumés)
9. [Raccourcis clavier](#raccourcis-clavier)

---

## Fonctionnalités

**Collaboration**

- Synchronisation temps réel (tldraw sync, une room WebSocket par board), persistance SQLite.
- Curseurs avec pseudo et couleur du compte, avatars des présents, **suivre** un pote
  (PeopleMenu natif), pointeur **laser** (`K`), chat au curseur (`/`).
- **Mini chat** du board (lecteurs inclus) et **réactions emoji** flottantes.

**Modules** (Bibliothèque, `Ctrl/⌘ + K`)

- **Mind map** : `Tab` = enfant, `Entrée` = frère, connecteurs automatiques, layout arbre ou
  radial, branches colorées, replier / déplier.
- **Modèles** : kanban, brainstorm avec vote par points, rétro, flowchart, matrice
  d'Eisenhower, timeline, journal de pensées, moodboard.
- **Jeux** : dé animé, minuteur partagé, tableau de score, pictionary (mot secret géré par le
  serveur), morpion et puissance 4 (règles vérifiées par le serveur).
- **Fichier** : export PNG / SVG / JSON (`.tldr`) et import JSON (APIs natives tldraw).

**Comptes et partage**

- Inscription uniquement avec un **code d'invitation** (généré en CLI).
- Rôles par board : **OWNER / EDITOR / VIEWER**, liens d'invitation expirables et révocables.
- Dashboard : récents, favoris, recherche, miniatures ; thème clair / sombre / système.

---

## Architecture

```
tableaublanc/
├─ apps/
│  ├─ web/                 React 19 + Vite 8 + tldraw, Tailwind 4, Radix UI (style shadcn/ui)
│  │  ├─ src/features/     auth · dashboard · board · collaboration · library · modules/…
│  │  └─ e2e/              Playwright (2 navigateurs)
│  └─ server/              Node.js + Fastify 5
│     ├─ src/sync/         RoomManager (TLSocketRoom + SQLite par board), autorisation WS,
│     │                    règles d'écriture par record (authorizeRecord)
│     ├─ src/http/         routes REST, sécurité (helmet/CSP, rate limit, CSRF, erreurs)
│     ├─ src/services/     logique métier (boards, invitations, assets, pictionary…)
│     ├─ src/repositories/ accès Drizzle
│     └─ drizzle/          migrations SQL versionnées
├─ packages/shared/        schémas Zod, schéma tldraw (shapes custom, records), logique pure
│                          (layout mind map, règles des jeux) — partagé client/serveur
├─ Dockerfile · docker-compose.yml · docker/Caddyfile
└─ .github/workflows/ci.yml
```

- **Une seule origine** : en production, le serveur sert l'API, le WebSocket et le front.
  Pas de CORS, cookies `SameSite=Lax`.
- **Données** (`DATA_DIR`) : `app.db` (comptes, boards, membres, invitations, assets),
  `rooms/<boardId>.db` (contenu des boards, format tldraw sync), `assets/` (images).
- Le serveur sync est dérivé du template officiel
  [`templates/simple-server-example`](https://github.com/tldraw/tldraw/tree/main/templates/simple-server-example)
  (Fastify + `TLSocketRoom` + `SQLiteSyncStorage`).

---

## Développement local

Prérequis : Node.js ≥ 22.13 (26 LTS recommandé), pnpm 10.

```bash
pnpm install
cp .env.example .env               # renseigne au moins VITE_TLDRAW_LICENSE_KEY (facultatif en dev)
pnpm --filter @canvas/server admin create-code --uses 5   # code d'inscription
pnpm dev                           # API + sync sur :5858, front sur http://localhost:5173
```

Ouvre http://localhost:5173/register, saisis le code, crée un board, puis ouvre un second
navigateur (ou une fenêtre privée) avec un autre compte et un lien d'invitation.

Scripts utiles (à la racine) : `pnpm lint`, `pnpm format`, `pnpm typecheck`, `pnpm test`,
`pnpm e2e`, `pnpm build`.

---

## Tests

| Niveau  | Outil                        | Contenu                                                                                                                                                         |
| ------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logique | Vitest                       | layout mind map, règles morpion / puissance 4 / pictionary, vote, minuteur                                                                                      |
| API     | Vitest + Supertest           | inscription, connexion, CSRF, boards, rôles, invitations, uploads                                                                                               |
| Sync    | Vitest + vrai `TLSyncClient` | refus sans session / non-membre / origine étrangère, **VIEWER en lecture seule côté serveur**, chat anti-usurpation, anti-triche des jeux, secret du pictionary |
| E2E     | Playwright (2 navigateurs)   | forme synchronisée et curseur distant, lecteur bloqué, mind map, morpion, pictionary                                                                            |

```bash
pnpm test        # unitaires + API + sync
pnpm e2e         # démarre serveur + front automatiquement
```

---

## Déploiement pas à pas (VPS + Docker + HTTPS)

Testé avec l'image `node:26-bookworm(-slim)`. Un VPS à 1 vCPU / 1 Go de RAM suffit pour un
groupe d'amis.

### 1. Préparer le serveur

1. Crée un VPS (Debian 12 / Ubuntu 24.04) et connecte-toi en SSH.
2. Installe Docker Engine et le plugin Compose (doc officielle :
   https://docs.docker.com/engine/install/).
3. Ouvre les ports **80** et **443** (TCP, et UDP 443 pour HTTP/3) dans le pare-feu.

### 2. DNS

Crée un enregistrement **A** (et **AAAA** si IPv6) `canvas.mondomaine.fr` → IP du VPS.
Attends la propagation (`dig +short canvas.mondomaine.fr`).

### 3. Configuration

```bash
git clone <url-du-dépôt> canvas && cd canvas
cp .env.example .env
nano .env
```

```dotenv
DOMAIN=canvas.mondomaine.fr
AUTH_SECRET=<résultat de : openssl rand -base64 48>
VITE_TLDRAW_LICENSE_KEY=<ta clé tldraw>
```

`.env` n'est jamais commité (voir `.gitignore`) ; `chmod 600 .env` conseillé.

### 4. Lancer

```bash
docker compose up -d --build
docker compose ps            # app « healthy », caddy « running »
docker compose logs -f caddy # obtention du certificat Let's Encrypt
```

Caddy obtient et renouvelle automatiquement le certificat HTTPS, redirige HTTP → HTTPS et
transmet les WebSockets.

### 5. Premier compte

```bash
docker compose exec app node dist/admin.js create-code --uses 1 --days 7 --note "moi"
```

Ouvre `https://canvas.mondomaine.fr/register` et inscris-toi avec le code. Génère ensuite un
code par ami (ou un code multi-usages).

### 6. Mises à jour

```bash
git pull
docker compose up -d --build
```

Les migrations de base de données s'appliquent automatiquement au démarrage.

### 7. Sauvegardes

Toutes les données sont dans le volume `canvas-data` (`/data` dans le conteneur). Exemple de
sauvegarde à chaud cohérente (SQLite en WAL), à lancer par cron :

```bash
docker compose exec app node -e "
const D=require('better-sqlite3'); const fs=require('fs');
fs.mkdirSync('/data/backups',{recursive:true});
const stamp=new Date().toISOString().slice(0,10);
new D('/data/app.db').backup('/data/backups/app-'+stamp+'.db').then(()=>console.log('ok'));
"
docker run --rm -v canvas_canvas-data:/data -v "$PWD":/out busybox \
  tar czf /out/canvas-$(date +%F).tgz /data
```

### Fly.io / Railway (alternative)

Utilise le `Dockerfile` tel quel (sans Caddy : HTTPS fourni par la plateforme) :

- monte un volume persistant sur `/data` ;
- définis `PUBLIC_ORIGIN=https://<ton-app>`, `AUTH_SECRET`, et l'argument de build
  `VITE_TLDRAW_LICENSE_KEY` ;
- `CLIENT_IP_HEADER` : en-tête d'IP client fourni par la plateforme
  (Fly.io : `fly-client-ip`) ;
- **une seule instance** (les rooms sont en mémoire dans le process).

Si Docker Hub limite tes téléchargements (erreur 429), utilise un miroir :
`docker build --build-arg NODE_BUILD_IMAGE=mirror.gcr.io/library/node:26-bookworm --build-arg NODE_IMAGE=mirror.gcr.io/library/node:26-bookworm-slim .`

---

## Administration

| Commande                                               | Effet                                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `admin create-code [--uses N] [--days J] [--note "…"]` | crée un code d'inscription (affiché une seule fois, seul son hash est stocké) |
| `admin list-codes`                                     | liste les codes (utilisations, expiration)                                    |

En local : `pnpm --filter @canvas/server admin …` ; en production :
`docker compose exec app node dist/admin.js …`.

Variables d'environnement du serveur : voir `apps/server/src/config/env.ts` (validées par Zod
au démarrage, l'application refuse de démarrer si la configuration est invalide).

---

## Sécurité

- **Mots de passe** : Argon2id (`@node-rs/argon2`, paramètres OWASP m=19 MiB, t=2, p=1),
  via [Better Auth](https://www.better-auth.com) (lib maintenue ; Lucia est dépréciée).
- **Sessions** : cookie `httpOnly`, `SameSite=Lax`, `Secure` en production ; le token n'est
  jamais renvoyé dans le corps des réponses.
- **Inscription** fermée : code d'invitation obligatoire (hash SHA-256, quotas, expiration).
- **Liens d'invitation** : token aléatoire 256 bits, seul le hash est stocké, expiration,
  nombre d'utilisations, révocation ; un membre n'est jamais rétrogradé par une invitation.
- **Sync WebSocket** : vérification de l'`Origin` (anti Cross-Site WebSocket Hijacking), de la
  session et du rôle **avant l'upgrade** ; VIEWER connecté en `isReadonly` (mécanisme officiel
  tldraw sync, imposé par le serveur) ; changement de rôle ⇒ déconnexion forcée.
- **Règles par record côté serveur** (`authorizeRecord`) : auteur des messages imposé, coups
  des jeux validés, état du pictionary non modifiable par les clients.
- **Uploads** : type réel détecté par les octets (PNG, JPEG, WebP, GIF ; SVG refusé), taille
  max, noms générés, servis aux seuls membres avec `nosniff` et `CSP default-src 'none'`.
- **HTTP** : validation Zod de toutes les entrées, requêtes paramétrées (Drizzle), CSP stricte
  (assets tldraw auto-hébergés, aucun CDN), HSTS, rate limiting global + renforcé sur la
  connexion et l'inscription, protection CSRF (Origin + en-tête custom), erreurs génériques.

---

## Compromis assumés

| Sujet                                 | Choix                                                                                   | Conséquence                                                                                                               |
| ------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Email technique                       | Better Auth exige un email : un email non routable (`@users.canvas.invalid`) est généré | invisible pour l'utilisateur ; pas de reset de mot de passe par email (reset = nouveau compte ou intervention admin)      |
| Dés, minuteur, score, vote            | état écrit par les clients EDITOR                                                       | triche possible entre éditeurs (usage entre amis) ; morpion, puissance 4 et pictionary sont, eux, vérifiés par le serveur |
| Pictionary                            | manches en mémoire                                                                      | une manche en cours est perdue si le serveur redémarre                                                                    |
| Présence (pseudo du curseur)          | envoyée par le client                                                                   | un utilisateur modifié peut afficher un autre pseudo sur son curseur (le chat, lui, est signé par le serveur)             |
| `style-src 'unsafe-inline'`           | requis par tldraw                                                                       | pas de `script-src` inline autorisé                                                                                       |
| `frame-src https:` / `img-src https:` | embeds et images distantes de tldraw                                                    | à restreindre si besoin                                                                                                   |
| Mise à l'échelle                      | une instance, rooms en mémoire                                                          | largement suffisant pour un groupe d'amis                                                                                 |
| Miniatures                            | générées par le navigateur                                                              | légèrement en retard sur le contenu                                                                                       |
| Bundle                                | chunk tldraw ≈ 1,8 Mo (≈ 570 Ko gzip) chargé à l'ouverture d'un board                   | login et dashboard restent légers                                                                                         |

---

## Raccourcis clavier

| Touches            | Action                                               |
| ------------------ | ---------------------------------------------------- |
| `Ctrl/⌘ + K`       | Bibliothèque (modules, modèles, jeux, export/import) |
| `Tab`              | Mind map : ajouter un enfant                         |
| `Entrée`           | Mind map : ajouter un frère / valider la saisie      |
| `Maj + Entrée`     | Mind map : retour à la ligne                         |
| Double-clic        | Éditer un nœud ou un post-it                         |
| `K`                | Pointeur laser                                       |
| `/`                | Chat au curseur                                      |
| `Ctrl/⌘ + Alt + /` | Tous les raccourcis natifs tldraw                    |

Support tablette et stylet : natif dans tldraw (pression du stylet, mode stylet,
gestes de zoom et de déplacement).
