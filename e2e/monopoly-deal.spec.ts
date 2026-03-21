import { test, expect, Page } from '@playwright/test';

// ─── Mock data ────────────────────────────────────────────────────────────────

const PLAYER_ID = 'test-player-1';
const PLAYER_2_ID = 'test-player-2';
const ROOM_ID = 'room-uuid-test-1234';
const ROOM_CODE = 'TSTMOD'; // 6 chars

const MOCK_HAND = [
  { id: 'md-0', type: 'money', value: 1, denomination: 1, name: '$1M' },
  { id: 'md-1', type: 'money', value: 2, denomination: 2, name: '$2M' },
  { id: 'md-2', type: 'property', value: 1, color: 'brown', name: 'Mediterranean Avenue' },
  { id: 'md-3', type: 'action', value: 3, action: 'deal_breaker', name: 'Deal Breaker' },
  { id: 'md-4', type: 'wildProperty', value: 0, wildColors: ['brown', 'lightBlue'], name: 'Wild Card' },
];

const MOCK_DECK = [
  { id: 'deck-0', type: 'money', value: 1, denomination: 1, name: '$1M' },
  { id: 'deck-1', type: 'money', value: 2, denomination: 2, name: '$2M' },
  { id: 'deck-2', type: 'money', value: 3, denomination: 3, name: '$3M' },
];

function makeMockRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: ROOM_ID,
    room_code: ROOM_CODE,
    status: 'playing',
    host_id: PLAYER_ID,
    players: [
      { id: PLAYER_ID, name: 'Alice', bank: [], sets: {} },
      { id: PLAYER_2_ID, name: 'Bob', bank: [], sets: {} },
    ],
    current_player_index: 0,
    deck: MOCK_DECK,
    discard_pile: [],
    cards_played_this_turn: 0,
    turn_drawn: true,
    pending_action: null,
    winner_id: null,
    youtube_url: null,
    ...overrides,
  };
}

// ─── Supabase mock setup ──────────────────────────────────────────────────────

async function setupSupabaseMocks(page: Page) {
  const mockRoom = makeMockRoom();
  const mockHand = [...MOCK_HAND];

  // Replace window.fetch before any app code runs
  await page.addInitScript(
    ([room, hand]) => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

        // Intercept monopoly_deal_rooms requests
        if (url.includes('monopoly_deal_rooms')) {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'PATCH') {
            try {
              const body = JSON.parse(init?.body as string ?? '{}');
              Object.assign(room, body);
            } catch { /* ignore */ }
          }
          return new Response(JSON.stringify(room), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
          });
        }

        // Intercept monopoly_deal_hands requests
        if (url.includes('monopoly_deal_hands')) {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'PATCH' || method === 'POST' || method === 'PUT') {
            try {
              const body = JSON.parse(init?.body as string ?? '{}');
              if (body.cards) hand.splice(0, hand.length, ...body.cards);
            } catch { /* ignore */ }
          }
          return new Response(JSON.stringify({ cards: hand }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Pass through all other requests
        return origFetch(input, init);
      };

      // Store player ID so the hook uses the same ID as the mock room
      sessionStorage.setItem('md_player_id', 'test-player-1');
    },
    [mockRoom, mockHand] as [typeof mockRoom, typeof mockHand]
  );

  // Mock WebSocket for Supabase realtime (just accept connections silently)
  await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    ws.onMessage((message) => {
      try {
        const msg = JSON.parse(message.toString());
        // Respond to heartbeat
        if (msg.event === 'heartbeat') {
          ws.send(JSON.stringify({
            event: 'phx_reply', topic: 'phoenix',
            payload: { status: 'ok', response: {} },
            ref: msg.ref, join_ref: null,
          }));
        }
        // Respond to channel join requests
        if (msg.event === 'phx_join') {
          const pgChanges = (msg.payload?.config?.postgres_changes ?? []) as object[];
          ws.send(JSON.stringify({
            event: 'phx_reply', topic: msg.topic,
            payload: {
              status: 'ok',
              response: { postgres_changes: pgChanges.map((p, i) => ({ ...p, id: i + 1 })) },
            },
            ref: msg.ref, join_ref: msg.join_ref,
          }));
        }
      } catch { /* ignore */ }
    });
  });
}

// Navigate through setup to reach the game board
async function navigateToGame(page: Page) {
  await page.goto('/');

  // Click Monopoly Deal game card on Hub
  await page.getByRole('button', { name: /Monopoly Deal/i }).first().click();

  // Wait for setup screen
  await expect(page.locator('h2').filter({ hasText: /Monopoly Deal/i })).toBeVisible({ timeout: 5000 });

  // Switch to "Rejoindre" tab
  await page.getByRole('button', { name: /^Rejoindre$/ }).click();

  // Fill player name and room code
  await page.getByPlaceholder('Prénom').fill('Alice');
  await page.getByPlaceholder('XXXXXX').fill(ROOM_CODE);

  // Click the submit "Rejoindre" button (now enabled)
  await page.getByRole('button', { name: /^Rejoindre$/ }).last().click();

  // Wait for the game board header to appear
  await expect(page.locator('.md-header').first()).toBeVisible({ timeout: 15000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Hub — Monopoly Deal rules modal', () => {
  test('Hub renders with all game cards', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Monopoly Deal').first()).toBeVisible();
    await expect(page.getByText('Puissance 4').first()).toBeVisible();
    await expect(page.getByText('UNO').first()).toBeVisible();
  });

  test('Rules button opens the rules modal', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Règles du Monopoly Deal/i }).click();

    await expect(page.getByRole('heading', { name: /Règles.*Monopoly Deal/i })).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('But du jeu').first()).toBeVisible();
    await expect(page.getByText('Anniversaire').first()).toBeVisible();
    await expect(page.getByText('Non Merci !').first()).toBeVisible();
    await expect(page.getByText('Coup de Maître').first()).toBeVisible();
  });

  test('Rules modal closes on ✕ button click', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Règles du Monopoly Deal/i }).click();
    await expect(page.getByRole('heading', { name: /Règles.*Monopoly Deal/i })).toBeVisible({ timeout: 3000 });

    await page.getByRole('button', { name: '✕' }).click();
    await expect(page.getByRole('heading', { name: /Règles.*Monopoly Deal/i })).not.toBeVisible({ timeout: 3000 });
  });
});

test.describe('Monopoly Deal — Setup screen', () => {
  test('Clicking Monopoly Deal opens setup screen', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Monopoly Deal/i }).first().click();
    await expect(page.locator('h2').filter({ hasText: /Monopoly Deal/i })).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder('Prénom')).toBeVisible();
  });

  test('Tabs switch between Créer and Rejoindre forms', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Monopoly Deal/i }).first().click();
    await expect(page.locator('h2').filter({ hasText: /Monopoly Deal/i })).toBeVisible({ timeout: 5000 });

    // Default tab has "Créer la room"
    await expect(page.getByRole('button', { name: 'Créer la room' })).toBeVisible();

    // Switch to Rejoindre — shows room code field
    await page.getByRole('button', { name: /^Rejoindre$/ }).click();
    await expect(page.getByPlaceholder('XXXXXX')).toBeVisible();
  });

  test('Back button returns to Hub', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Monopoly Deal/i }).first().click();
    await expect(page.locator('h2').filter({ hasText: /Monopoly Deal/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /Retour/i }).click();
    await expect(page.getByText('Puissance 4').first()).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Monopoly Deal — Game board', () => {
  test.beforeEach(async ({ page }) => {
    await setupSupabaseMocks(page);
    await navigateToGame(page);
  });

  test('Game board renders with player hand cards', async ({ page }) => {
    // Hand row should contain the mock cards
    const cards = page.locator('.md-card, [class*="md-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Fin du tour button is visible when it is my turn', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Fin du tour/i })).toBeVisible({ timeout: 5000 });
  });

  test('Clicking a money card does not crash the page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.waitForTimeout(500);

    // Find and click first card in hand
    const card = page.locator('.md-card').first();
    if (await card.isVisible()) {
      await card.click();
    }

    await page.waitForTimeout(500);

    const critical = errors.filter((e) =>
      !e.includes('WebSocket') && !e.includes('Failed to fetch') && !e.includes('net::ERR')
    );
    expect(critical).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking Fin du tour does not crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    const endBtn = page.getByRole('button', { name: /Fin du tour/i });
    if (await endBtn.isVisible({ timeout: 3000 })) {
      await endBtn.click();
    }
    await page.waitForTimeout(500);

    const critical = errors.filter((e) =>
      !e.includes('WebSocket') && !e.includes('Failed to fetch') && !e.includes('net::ERR')
    );
    expect(critical).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('No JavaScript errors during card interactions', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.waitForTimeout(500);

    // Click through cards in hand
    const cards = page.locator('.md-card');
    const count = await cards.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      const card = cards.nth(i);
      if (await card.isVisible()) {
        await card.click();
        await page.waitForTimeout(300);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
      }
    }

    const critical = errors.filter((e) =>
      !e.includes('WebSocket') &&
      !e.includes('Failed to fetch') &&
      !e.includes('net::ERR') &&
      !e.includes('ERR_CONNECTION_REFUSED')
    );
    expect(critical).toHaveLength(0);
  });
});
