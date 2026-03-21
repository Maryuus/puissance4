import { test, expect, Page } from '@playwright/test';
import { MDRoomRow } from '../src/lib/monopolyDealSupabase';
import { MDCard, MDPlayer } from '../src/lib/monopolyDealLogic';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const PLAYER_ID = 'test-player-001';
const ROOM_CODE = 'ABCDEF';
const ROOM_ID = 'room-uuid-001';

function makeMoney(id: string, denom: number): MDCard {
  return { id, type: 'money', name: `$${denom}M`, value: denom, denomination: denom };
}

function makeProperty(id: string, color: string, name: string, value: number): MDCard {
  return { id, type: 'property', name, value, color: color as MDCard['color'] };
}

function makeWild(id: string, colors: string[]): MDCard {
  return { id, type: 'wildProperty', name: 'Joker propriété', value: 1, wildColors: colors as MDCard['color'][] };
}

function makeAction(id: string, action: string, name: string, value: number): MDCard {
  return { id, type: 'action', name, value, action: action as MDCard['action'] };
}

function makeRent(id: string, colors: string[]): MDCard {
  return { id, type: 'action', name: 'Loyer', value: 1, action: 'rent', rentColors: colors as MDCard['color'][] };
}

const ME: MDPlayer = {
  id: PLAYER_ID,
  name: 'TestPlayer',
  bank: [makeMoney('b1', 2)],
  sets: { brown: [makeProperty('p1', 'brown', 'Mediterranean', 1)] },
};

const OTHER: MDPlayer = {
  id: 'other-player',
  name: 'Opponent',
  bank: [makeMoney('ob1', 3)],
  sets: { blue: [makeProperty('op1', 'blue', 'Boardwalk', 4), makeProperty('op2', 'blue', 'Park Place', 4)] },
};

function makeRoom(overrides: Partial<MDRoomRow> = {}): MDRoomRow {
  return {
    id: ROOM_ID,
    room_code: ROOM_CODE,
    status: 'playing',
    host_id: PLAYER_ID,
    players: [ME, OTHER],
    current_player_index: 0,
    deck: Array.from({ length: 20 }, (_, i) => makeMoney(`deck-${i}`, 1)),
    discard_pile: [],
    cards_played_this_turn: 0,
    turn_drawn: true,
    pending_action: null,
    winner_id: null,
    youtube_url: null,
    ...overrides,
  };
}

const HAND: MDCard[] = [
  makeMoney('h1', 2),
  makeMoney('h2', 3),
  makeProperty('h3', 'lightBlue', 'Connecticut', 1),
  makeWild('h4', ['pink', 'orange']),
  makeAction('h5', 'birthday', 'Anniversaire', 2),
  makeAction('h6', 'deal_breaker', 'Coup de Maître', 5),
  makeAction('h7', 'sly_deal', 'Saisie', 3),
  makeAction('h8', 'forced_deal', 'Échange Forcé', 3),
  makeRent('h9', ['brown', 'lightBlue']),
  makeAction('h10', 'just_say_no', 'Non Merci !', 4),
];

// ─── Mock setup ───────────────────────────────────────────────────────────────

async function setupMocks(page: Page, roomOverrides: Partial<MDRoomRow> = {}) {
  const room = makeRoom(roomOverrides);

  await page.addInitScript(({ playerId, roomCode }: { playerId: string; roomCode: string }) => {
    // Persist player ID so useMonopolyDealGame picks it up
    sessionStorage.setItem('md_player_id', playerId);
    localStorage.setItem('player-name', 'TestPlayer');
  }, { playerId: PLAYER_ID, roomCode: ROOM_CODE });

  await page.addInitScript(
    ({ room, hand, playerId, roomId }: { room: MDRoomRow; hand: MDCard[]; playerId: string; roomId: string }) => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;

        // Mock monopoly_deal_rooms SELECT (join/get room)
        if (url.includes('monopoly_deal_rooms') && (!init?.method || init.method === 'GET')) {
          return new Response(
            JSON.stringify(room),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' } },
          );
        }

        // Mock monopoly_deal_rooms UPDATE (upsert/update)
        if (url.includes('monopoly_deal_rooms') && init?.method === 'PATCH') {
          return new Response(
            JSON.stringify(room),
            { status: 200, headers: { 'Content-Type': 'application/json', 'Prefer': 'return=representation' } },
          );
        }

        // Mock monopoly_deal_hands GET (my hand)
        if (url.includes('monopoly_deal_hands') && url.includes(`player_id=eq.${playerId}`) && (!init?.method || init.method === 'GET')) {
          return new Response(
            JSON.stringify({ room_id: roomId, player_id: playerId, cards: hand }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // Mock monopoly_deal_hands UPDATE
        if (url.includes('monopoly_deal_hands') && init?.method === 'PATCH') {
          return new Response(
            JSON.stringify({ room_id: roomId, player_id: playerId, cards: hand }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        // Mock monopoly_deal_hands INSERT (upsert for start game)
        if (url.includes('monopoly_deal_hands') && init?.method === 'POST') {
          return new Response(
            JSON.stringify([]),
            { status: 201, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return origFetch(input, init);
      };
    },
    { room, hand: HAND, playerId: PLAYER_ID, roomId: ROOM_ID },
  );

  // Mock WebSocket for Supabase Realtime
  await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    ws.onMessage(() => {
      // Silently consume messages; no realtime events needed for tests
    });
  });
}

async function navigateToGame(page: Page) {
  await page.goto('/');
  await page.getByText('Monopoly Deal').first().click();
  // Should be on setup screen — join with the room code
  await page.getByPlaceholder('Prénom').first().fill('TestPlayer');
  await page.getByRole('button', { name: 'Rejoindre' }).first().click();
  const codeInput = page.getByPlaceholder('XXXXXX');
  await codeInput.fill(ROOM_CODE);
  await page.getByRole('button', { name: 'Rejoindre' }).last().click();
  // Wait for game board
  await page.waitForSelector('.md-header', { timeout: 8000 });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Monopoly Deal — Game Board', () => {
  test('shows game board after joining', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    await expect(page.locator('.md-header')).toBeVisible();
    await expect(page.getByText('Monopoly Deal')).toBeVisible();
  });

  test('shows my hand cards', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    const handCards = page.locator('.md-hand-row .md-card');
    await expect(handCards).toHaveCount(HAND.length);
  });

  test('shows other players area', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    await expect(page.getByText('Opponent')).toBeVisible();
  });

  test('shows my turn indicator', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    await expect(page.getByText(/Ton tour/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Fin du tour' })).toBeVisible();
  });

  test('shows deck and discard info', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    await expect(page.getByText(/Pioche/)).toBeVisible();
    await expect(page.getByText(/Défausse/)).toBeVisible();
  });
});

test.describe('Monopoly Deal — Card Clicks (no crash)', () => {
  test('clicking a money card does not crash', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    const moneyCard = page.locator('.md-hand-row .md-card').first();
    await moneyCard.click();
    // Game board should still be visible (no crash)
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking a property card does not crash', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h3 is a property (index 2)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(2).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking a wild property card opens color picker', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h4 is wildProperty (index 3)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(3).click();
    // Color picker overlay should appear
    await expect(page.getByText('Choisir la couleur')).toBeVisible();
    // Dismiss
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking birthday action opens action choice overlay', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h5 is birthday action (index 4)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(4).click();
    await expect(page.getByText("Jouer l'action")).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking deal_breaker opens action choice then deal_breaker target', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h6 is deal_breaker (index 5)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(5).click();
    await expect(page.getByText("Jouer l'action")).toBeVisible();
    await page.getByRole('button', { name: "Jouer l'action" }).click();
    // Should show target picker
    await expect(page.getByText('Voler le set complet de qui')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking sly_deal opens target picker', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h7 is sly_deal (index 6)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(6).click();
    await expect(page.getByText("Jouer l'action")).toBeVisible();
    await page.getByRole('button', { name: "Jouer l'action" }).click();
    await expect(page.getByText('Voler une propriété de qui')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking forced_deal opens my card picker', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h8 is forced_deal (index 7)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(7).click();
    await expect(page.getByText("Jouer l'action")).toBeVisible();
    await page.getByRole('button', { name: "Jouer l'action" }).click();
    await expect(page.getByText('Quelle propriété donner en échange')).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking rent card opens action choice', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    // h9 is rent (index 8)
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(8).click();
    await expect(page.getByText("Jouer l'action")).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('playing action as bank money does not crash', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);
    const cards = page.locator('.md-hand-row .md-card');
    await cards.nth(4).click();
    await page.getByRole('button', { name: /Banque/ }).click();
    await expect(page.locator('.md-header')).toBeVisible();
  });

  test('clicking all cards sequentially does not crash', async ({ page }) => {
    await setupMocks(page);
    await navigateToGame(page);

    for (let i = 0; i < HAND.length; i++) {
      const cards = page.locator('.md-hand-row .md-card');
      const count = await cards.count();
      if (i >= count) break;

      await cards.nth(i).click();

      // Close any overlay that appeared
      const cancelBtn = page.getByRole('button', { name: 'Annuler' });
      if (await cancelBtn.isVisible({ timeout: 500 }).catch(() => false)) {
        await cancelBtn.click();
      }
      // Also close action choice overlays
      const actionBtn = page.getByText("Jouer l'action");
      if (await actionBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        const cancelBtn2 = page.getByRole('button', { name: 'Annuler' });
        if (await cancelBtn2.isVisible({ timeout: 300 }).catch(() => false)) {
          await cancelBtn2.click();
        }
      }

      // Verify no crash
      await expect(page.locator('.md-header')).toBeVisible();
    }
  });
});

test.describe('Monopoly Deal — Pending Action (payment)', () => {
  test('shows payment panel when I must pay', async ({ page }) => {
    const room = makeRoom({
      current_player_index: 1, // other player's turn
      turn_drawn: true,
      pending_action: {
        type: 'payment',
        actorId: 'other-player',
        actionType: 'birthday',
        queue: [{ playerId: PLAYER_ID, amount: 2 }],
        jsnCount: 0,
        card: makeAction('act1', 'birthday', 'Anniversaire', 2),
      },
    });
    await setupMocks(page, room);
    await navigateToGame(page);

    await expect(page.getByText(/Anniversaire — demandé par/)).toBeVisible();
    await expect(page.getByText(/Payer/)).toBeVisible();
  });

  test('shows JSN button when I have just_say_no in hand and must pay', async ({ page }) => {
    const room = makeRoom({
      current_player_index: 1,
      turn_drawn: true,
      pending_action: {
        type: 'payment',
        actorId: 'other-player',
        actionType: 'rent',
        queue: [{ playerId: PLAYER_ID, amount: 3 }],
        jsnCount: 0,
        card: makeRent('rent1', ['blue']),
      },
    });
    await setupMocks(page, room);
    await navigateToGame(page);

    await expect(page.getByRole('button', { name: 'Non Merci !' })).toBeVisible();
  });
});

test.describe('Monopoly Deal — Winner', () => {
  test('shows winner banner when game is finished', async ({ page }) => {
    const winner = { ...ME, sets: {
      brown: [makeProperty('w1', 'brown', 'Med', 1), makeProperty('w2', 'brown', 'Baltic', 1)],
      blue:  [makeProperty('w3', 'blue', 'Boardwalk', 4), makeProperty('w4', 'blue', 'Park', 4)],
      lightBlue: [
        makeProperty('w5', 'lightBlue', 'Connecticut', 1),
        makeProperty('w6', 'lightBlue', 'Oriental', 1),
        makeProperty('w7', 'lightBlue', 'Vermont', 1),
      ],
    }};
    const room = makeRoom({
      status: 'finished',
      winner_id: PLAYER_ID,
      players: [winner, OTHER],
    });
    await setupMocks(page, room);
    await navigateToGame(page);

    await expect(page.getByText(/a gagné avec 3 sets complets/)).toBeVisible();
  });
});
