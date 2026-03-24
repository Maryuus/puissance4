# CLAUDE.md — MiniJeux

## Projet

Application web de mini-jeux multijoueur. Initialement "Puissance 4", renommée **MiniJeux**.

- **Live:** https://maryuus-minijeux.vercel.app (alias principal), https://puissance4-lake.vercel.app
- **GitHub:** https://github.com/Maryuus/puissance4
- **Vercel project:** maryuus-projects/puissance4
- **Version courante :** voir `package.json` → `"version"` — affichee dans le footer du Hub

---

## Stack

| Outil | Version | Role |
|---|---|---|
| React | 18 | UI |
| TypeScript | 5 | Typage |
| Vite | 5 | Build / dev server |
| Tailwind CSS | 3 | Utilitaires CSS |
| Framer Motion | 11 | Animations / transitions |
| Zustand | 4 | State management (Puissance 4 uniquement) |
| Supabase | 2 | BDD PostgreSQL + Realtime (online multiplayer) |
| canvas-confetti | — | Effets victoire |
| vite-plugin-pwa | — | PWA / Service Worker |

---

## Architecture

### Point d'entrée

```
src/main.tsx → <AppShell />
```

### AppShell (`src/AppShell.tsx`)

Pas de router. `AppShell` maintient un state local `'hub' | 'puissance4' | 'uno' | 'monopolydeal'` et switche entre les jeux via `<AnimatePresence>`.

Les jeux sont enregistres dans `GAME_COMPONENTS` (Record<GameId, ComponentType>). Pour ajouter un jeu : (1) importer le composant App, (2) l'ajouter dans `GAME_COMPONENTS`, (3) ajouter le type dans `GameId`, (4) ajouter la carte dans `Hub.tsx`.

**Attention — piege critique :** AppShell wrape chaque jeu dans un `motion.div` avec animation d'opacite. Cela cree un stacking/transform context qui **casse `position: fixed`** pour les enfants. Tout composant necessitant un positionnement fixe (ex: MusicPlayer) doit utiliser le prop `inline` pour se positionner relativement.

### Hub (`src/components/Hub.tsx`)

Page d'accueil. Deux arrays :
- `games` — jeux disponibles (Puissance 4, UNO, Monopoly Deal)
- `comingSoon` — jeux a venir (vide actuellement)

Affiche la version du site (`__APP_VERSION__` injecte par Vite depuis `package.json`) dans le footer.

---

## Composants partagés (`src/components/shared/`)

Ces composants sont generiques et reutilisables par tous les jeux en ligne.

### `RoomSetup.tsx`

Ecran de creation / rejoindre une room. Props :
- `emoji`, `title`, `subtitle` — identite visuelle du jeu
- `codeLength` — longueur du code room (4 pour UNO, 6 pour Monopoly Deal)
- `isConfigured` — si Supabase est configure (sinon affiche un message d'erreur)
- `createRoom(name)`, `joinRoom(code, name)`, `loading`, `error`, `onBack`

Gere : onglets Creer/Rejoindre, saisie du prenom (avec persistance via `playerName.ts`), affichage du code genere, copie presse-papier, validation.

### `RoomWaiting.tsx`

Salle d'attente. Props :
- `emoji`, `roomCode`, `players[]`, `hostId`, `myPlayerId`, `maxPlayers`
- `loading`, `onStart`, `onLeave`

Gere : liste des joueurs avec avatar colore, badge Hote, bouton Lancer (host uniquement), animation d'attente (guests).

**Pour ajouter un nouveau jeu en ligne :** utiliser ces deux composants comme wrappers — voir `UnoSetup.tsx` et `UnoWaiting.tsx` pour des exemples minimaux.

---

## Jeux implementes

### Puissance 4 (`src/components/App.tsx`)

Mode local (2 joueurs), IA, et online.

**State :** Zustand store (`src/store/gameStore.ts`) avec persistance localStorage (`puissance4-storage`) pour : theme, soundEnabled, noms des joueurs, difficulte IA.

**IA (`src/lib/minimax.ts`) :**
- Easy : coup aleatoire
- Medium : minimax profondeur 4 + alpha-beta pruning
- Hard : minimax profondeur 7 + alpha-beta pruning
- Toujours verifie victoire immediate et blocage avant minimax

**Logique (`src/lib/gameLogic.ts`) :** Grille 6x7, alignement de 4. Exports : `dropPiece`, `checkWin`, `checkDraw`, `getValidMoves`.

**Online (`src/lib/supabase.ts` + `src/hooks/useOnlineGame.ts`) :**
- Table `games` : board (JSONB), current_player, status, scores, youtube_url
- Room code 4 caracteres, realtime via `postgres_changes`
- MusicPlayer synchronise entre les 2 joueurs via colonne `youtube_url`

**Sons (`src/lib/sounds.ts`) :** Web Audio API, generes programmatiquement (pas de fichiers audio).

**Screens :** `menu` → `playerSetup` → `difficultyPicker` (si AI) | `onlineSetup` (si online) → `game`

---

### UNO (`src/components/uno/`)

Online uniquement, 2-10 joueurs.

**Fichiers :**
- `src/lib/unoLogic.ts` — types, deck (108 cartes), `canPlay()`, `getNextPlayerIndex()`
- `src/lib/unoSupabase.ts` — CRUD Supabase, realtime
- `src/hooks/useUnoGame.ts` — toute la logique de jeu
- `src/components/uno/UnoApp.tsx` — routing Setup / Waiting / Game
- `src/components/uno/UnoSetup.tsx` — wrapper de `RoomSetup` (emoji 🃏, code 4 chars)
- `src/components/uno/UnoWaiting.tsx` — wrapper de `RoomWaiting` (max 10 joueurs)
- `src/components/uno/UnoGame.tsx` — plateau de jeu
- `src/components/uno/UnoCardComponent.tsx` — rendu des cartes

**Regles implementees :**
- Multi-cartes : cartes identiques (valeur + couleur) jouees simultanement
- Stacking strict : +2 stacke uniquement sur +2, +4 sur +4
- Reverse en 2 joueurs = Skip
- Bouton UNO (visible en permanence) + bouton Counter-UNO (penalite 2 cartes)
- Victoire = premier a 0 cartes (confetti)

**Tables Supabase :**
- `uno_rooms` : room_code, status, host_id, players (JSONB), current_player_index, direction, deck, discard_pile, current_color, draw_stack, winner_id, youtube_url
- `uno_hands` : room_id, player_id, cards (JSONB) — une ligne par joueur, privee

**Realtime :** `subscribeToUnoRoom` + `subscribeToUnoHand`. Utilise des refs pour eviter les closures perimees.

---

### Monopoly Deal (`src/components/monopolydeal/`)

Online uniquement, 2-5 joueurs.

**Fichiers :**
- `src/lib/monopolyDealLogic.ts` — types, constantes (SET_SIZES, RENT, COLOR_BG), deck (96 cartes), helpers
- `src/lib/monopolyDealSupabase.ts` — CRUD Supabase, realtime
- `src/hooks/useMonopolyDealGame.ts` — logique de jeu
- `src/components/monopolydeal/MonopolyDealApp.tsx` — routing
- `src/components/monopolydeal/MonopolyDealSetup.tsx` — wrapper de `RoomSetup` (emoji 🎩, code 6 chars)
- `src/components/monopolydeal/MonopolyDealWaiting.tsx` — wrapper de `RoomWaiting` (max 5 joueurs)
- `src/components/monopolydeal/MonopolyDealGame.tsx` — plateau (layout 100dvh, flex column)
- `src/components/monopolydeal/MDCardComponent.tsx` — rendu cartes (money/property/wildProperty/action)

**Types de cartes :** money, property, wildProperty (wildColors[]), action (ActionType)

**Regles implementees :**
- Piocher 2 (ou 5 si main vide), jouer jusqu'a 3 cartes par tour
- Defausser a 7 en fin de tour
- Victoire : 3 sets complets — bouton Rejouer pour l'hote
- Just Say No chainable (jsnCount dans pending_action)
- JSN disponible aussi contre Sly Deal et Deal Breaker (type steal/steal_set)
- Paiement : banque d'abord, puis proprietes (sets complets inclus), tout si insolvable
- Wild cards repositionnables librement pendant son tour (coute 1 carte jouee)
- Double Loyer : dialog uniquement si la carte est en main

**Pending action system :**
- `type: 'payment'` — file de paiement (loyer, anniversaire, percepteur)
  - `queue[]` : liste des payeurs restants
  - `jsnCount` pair = la cible peut JSN ou payer ; impair = l'acteur peut contre-JSN
  - `acceptCancellation` saute uniquement le joueur JSN (pas toute la file)
- `type: 'steal'` — vol simple (Sly Deal)
  - `targetId`, `targetColor`, `targetCardId`
  - La cible peut JSN ou accepter ; l'acteur confirme avec `confirmSteal`
- `type: 'steal_set'` — vol de set (Deal Breaker)
  - `targetId`, `targetColor`
  - Meme mecanique JSN que steal

**Tables Supabase :**
- `monopoly_deal_rooms` : room_code, status, host_id, players (JSONB), current_player_index, deck, discard_pile, cards_played_this_turn, turn_drawn, pending_action (JSONB|null), winner_id, youtube_url
- `monopoly_deal_hands` : room_id, player_id, cards (JSONB)

**Non implemente (V1) :** Maisons / Hotels

---

## MusicPlayer (`src/components/MusicPlayer.tsx`)

Lecteur YouTube flottant presente dans Puissance 4 et UNO.

**Deux modes :**
- `inline={false}` (defaut) : `position: fixed; bottom: 1.25rem; right: 1.25rem` — Puissance 4
- `inline={true}` : `position: relative` — UNO et Monopoly Deal (dans le header, evite le piege motion.div)

**YouTube IFrame API** (pas un simple `<iframe>`) : permet d'appeler `playVideo()` explicitement, necessaire pour iOS Safari qui bloque l'autoplay iframe.

**iOS PWA fallback :** si le player reste en etat -1 ou 5 apres `onReady`, afficher un bouton "Appuyer pour lancer" qui appelle `playVideo()` dans un vrai geste utilisateur.

**Sync online :** colonne `youtube_url` dans la table de chaque jeu. N'importe quel joueur peut changer l'URL, tous la recoivent via la subscription existante.

---

## Utilitaires partages (`src/lib/`)

- `utils.ts` — `shuffleDeck<T>()`, `generateRoomCode(length)`, `createPlayerId(storageKey)` — utilises par tous les jeux
- `playerName.ts` — `getSavedName()` / `saveName(name)` — localStorage key `'player-name'`
- `supabase.ts` — client Supabase unique, verifie `isSupabaseConfigured` (env vars valides)

---

## Versioning

La version est dans `package.json` → `"version"` et affichee dans le Hub footer via `__APP_VERSION__` (injecte par `vite.config.ts`).

Convention :
- Nouveau jeu : incrémenter le chiffre entier (ex: `3` → `4`)
- Bug fix / feature : incrémenter le decimal (ex: `3.1` → `3.2`)

Toujours bumper la version avant de deployer pour pouvoir verifier que le bon build est en ligne.

---

## Theme

CSS variables dans `src/index.css` :
- `:root` = dark mode (defaut)
- `.light` classe sur `<html>` = light mode

Variables principales : `--bg-primary`, `--bg-secondary`, `--bg-card`, `--text-primary`, `--text-secondary`, `--text-muted`, `--border-color`, `--glass-bg`, `--glass-border`, `--p1-color`, `--p2-color`, `--btn-primary`

**Regle absolue : ne jamais hardcoder une couleur sombre.** Utiliser uniquement les CSS variables. Ajouter un override `.light` si besoin.

---

## Pieges CSS connus

1. **`overflow-x: auto` force `overflow-y: auto`** : clip les stacks de cartes et les hover scale-ups. Fix : pattern deux wrappers (outer scroll div + inner flex row avec `paddingTop` pour l'espace de debordement).

2. **`backdrop-filter` cree un stacking context** : les elements internes ne peuvent pas remonter au-dessus des siblings DOM suivants. Fix : `position: relative; z-index: N` sur l'element.

3. **`position: fixed` dans un `motion.div` avec animation opacite** : peut se casser. Fix : utiliser le prop `inline` sur MusicPlayer.

4. **Service worker PWA** : les deployments ne se mettent pas toujours a jour automatiquement. `skipWaiting: true` et `clientsClaim: true` sont configures dans `vite.config.ts`. Si un bug visuel persiste, verifier la version affichee dans le Hub — si elle est ancienne, vider le cache navigateur.

---

## Deployment

**Auto-deploy** Vercel depuis GitHub est connecte mais parfois annule.

Deploy manuel :
```bash
# Bumper la version dans package.json, puis :
git add -A && git commit -m "..." && git push
npx vercel --prod
npx vercel alias set [deployment-url] maryuus-minijeux.vercel.app
```

**Supabase migrations :**
```bash
npx supabase db push
```
Schema : `supabase/schema.sql`. Migrations : `supabase/migrations/`.

**Variables d'environnement** (dans `.env` local et dans le dashboard Vercel) :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## Workflow

- Apres chaque changement significatif : commit + push + `npx vercel --prod` + re-appliquer l'alias.
- Pas besoin de demander la permission pour les commits, pushes, deploys Vercel, ou migrations SQL.
- Bumper la version dans `package.json` a chaque deploy pour faciliter le debug.

---

## Structure des fichiers

```
src/
  main.tsx                          # Point d'entree
  AppShell.tsx                      # Routing inter-jeux + registre GAME_COMPONENTS
  index.css                         # CSS variables + styles globaux
  vite-env.d.ts                     # Types env + __APP_VERSION__

  components/
    Hub.tsx                         # Landing page (liste jeux + version)
    ThemeToggle.tsx                 # Toggle dark/light
    MusicPlayer.tsx                 # Lecteur YouTube (inline ou fixed)
    ErrorBoundary.tsx               # Fallback erreur global

    shared/                         # Composants reutilisables par tous les jeux
      RoomSetup.tsx                 # Ecran create/join room (generique)
      RoomWaiting.tsx               # Salle d'attente (generique)

    App.tsx                         # Puissance 4 — screens + GameScreen
    MainMenu.tsx                    # Menu P4
    PlayerSetup.tsx                 # Setup joueurs P4
    DifficultyPicker.tsx            # Choix difficulte IA
    OnlineSetup.tsx                 # Create/Join room P4
    Board.tsx                       # Grille P4
    Cell.tsx                        # Cellule P4
    Column.tsx                      # Colonne P4
    ScorePanel.tsx                  # Scores P4
    GameControls.tsx                # Boutons P4
    WinBanner.tsx                   # Banner victoire P4

    uno/
      UnoApp.tsx                    # Routing Setup / Waiting / Game
      UnoSetup.tsx                  # Wrapper RoomSetup (🃏, code 4 chars)
      UnoWaiting.tsx                # Wrapper RoomWaiting (max 10)
      UnoGame.tsx                   # Plateau de jeu
      UnoCardComponent.tsx          # Rendu des cartes
      UnoColorPicker.tsx            # Picker couleur wild

    monopolydeal/
      MonopolyDealApp.tsx           # Routing Setup / Waiting / Game
      MonopolyDealSetup.tsx         # Wrapper RoomSetup (🎩, code 6 chars)
      MonopolyDealWaiting.tsx       # Wrapper RoomWaiting (max 5)
      MonopolyDealGame.tsx          # Plateau (100dvh, flex column, hand dock)
      MDCardComponent.tsx           # Rendu cartes + tooltip action

  hooks/
    useGame.ts                      # Hook P4 logique locale
    useAI.ts                        # Hook IA P4
    useOnlineGame.ts                # Hook online P4
    useUnoGame.ts                   # Hook UNO (tout)
    useMonopolyDealGame.ts          # Hook Monopoly Deal (tout)

  lib/
    utils.ts                        # shuffleDeck, generateRoomCode, createPlayerId
    playerName.ts                   # Persistance prenom joueur (localStorage)
    supabase.ts                     # Client Supabase + CRUD P4
    gameLogic.ts                    # Logique P4 pure
    minimax.ts                      # IA minimax P4
    sounds.ts                       # Sons Web Audio API
    unoLogic.ts                     # Logique UNO pure
    unoSupabase.ts                  # CRUD + realtime UNO
    monopolyDealLogic.ts            # Logique Monopoly Deal pure
    monopolyDealSupabase.ts         # CRUD + realtime Monopoly Deal

  store/
    gameStore.ts                    # Zustand store P4
```
