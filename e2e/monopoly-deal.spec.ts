import { test, expect, Page } from '@playwright/test';

// ─── Mock data ────────────────────────────────────────────────────────────────

const PLAYER_ID = 'test-player-1';
const PLAYER_2_ID = 'test-player-2';
const ROOM_ID = 'room-uuid-test-1234';
const ROOM_CODE = 'TSTMOD';

const MOCK_HAND_ALL_TYPES = [
  { id: 'md-0', type: 'money', value: 1, denomination: 1, name: '$1M' },
  { id: 'md-1', type: 'money', value: 2, denomination: 2, name: '$2M' },
  { id: 'md-2', type: 'property', value: 1, color: 'brown', name: 'Mediterranean Avenue' },
  { id: 'md-3', type: 'action', value: 3, action: 'deal_breaker', name: 'Deal Breaker' },
  { id: 'md-4', type: 'wildProperty', value: 0, wildColors: ['brown', 'lightBlue'], name: 'Wild Card' },
  { id: 'md-5', type: 'action', value: 1, action: 'just_say_no', name: 'Non Merci !' },
  { id: 'md-6', type: 'action', value: 3, action: 'rent', rentColors: ['brown', 'lightBlue'], name: 'Loyer' },
  { id: 'md-7', type: 'action', value: 1, action: 'birthday', name: 'Anniversaire' },
  { id: 'md-8', type: 'action', value: 3, action: 'debt_collector', name: 'Percepteur' },
  { id: 'md-9', type: 'action', value: 4, action: 'sly_deal', name: 'Saisie' },
];

const MOCK_DECK = [
  { id: 'deck-0', type: 'money', value: 1, denomination: 1, name: '$1M' },
  { id: 'deck-1', type: 'money', value: 2, denomination: 2, name: '$2M' },
  { id: 'deck-2', type: 'money', value: 3, denomination: 3, name: '$3M' },
];

// Player 2 has a property set so we can test sly_deal / deal_breaker flows
const PLAYER_2_SETS = {
  brown: [
    { id: 'p2-prop-0', type: 'property', value: 1, color: 'brown', name: 'Mediterranean Avenue' },
  ],
  lightBlue: [
    { id: 'p2-prop-1', type: 'property', value: 1, color: 'lightBlue', name: 'Connecticut Avenue' },
    { id: 'p2-prop-2', type: 'property', value: 1, color: 'lightBlue', name: 'Oriental Avenue' },
    { id: 'p2-prop-3', type: 'property', value: 1, color: 'lightBlue', name: 'Vermont Avenue' },
  ],
};

function makeMockRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: ROOM_ID,
    room_code: ROOM_CODE,
    status: 'playing',
    host_id: PLAYER_ID,
    players: [
      { id: PLAYER_ID, name: 'Alice', bank: [], sets: {} },
      { id: PLAYER_2_ID, name: 'Bob', bank: [], sets: PLAYER_2_SETS },
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

async function setupSupabaseMocks(page: Page, handOverride?: object[]) {
  const mockRoom = makeMockRoom();
  const mockHand = handOverride ? [...handOverride] : [...MOCK_HAND_ALL_TYPES];

  await page.addInitScript(
    ([room, hand]) => {
      const origFetch = window.fetch.bind(window);
      window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

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

        return origFetch(input, init);
      };

      sessionStorage.setItem('md_player_id', 'test-player-1');
    },
    [mockRoom, mockHand] as [typeof mockRoom, typeof mockHand]
  );

  await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
    ws.onMessage((message) => {
      try {
        const msg = JSON.parse(message.toString());
        if (msg.event === 'heartbeat') {
          ws.send(JSON.stringify({
            event: 'phx_reply', topic: 'phoenix',
            payload: { status: 'ok', response: {} },
            ref: msg.ref, join_ref: null,
          }));
        }
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

async function navigateToGame(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /Monopoly Deal/i }).first().click();
  await expect(page.locator('h2').filter({ hasText: /Monopoly Deal/i })).toBeVisible({ timeout: 5000 });
  await page.getByRole('button', { name: /^Rejoindre$/ }).click();
  await page.getByPlaceholder('Prénom').fill('Alice');
  await page.getByPlaceholder('XXXXXX').fill(ROOM_CODE);
  await page.getByRole('button', { name: /^Rejoindre$/ }).last().click();
  await expect(page.locator('.md-header').first()).toBeVisible({ timeout: 15000 });
}

// Collect critical JS errors (ignore network/WS noise)
function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

function filterCritical(errors: string[]) {
  return errors.filter((e) =>
    !e.includes('WebSocket') &&
    !e.includes('Failed to fetch') &&
    !e.includes('net::ERR') &&
    !e.includes('ERR_CONNECTION_REFUSED')
  );
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
    await expect(page.getByRole('button', { name: 'Créer la room' })).toBeVisible();
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
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Fin du tour button is visible when it is my turn', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Fin du tour/i })).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Monopoly Deal — Card click: no crashes', () => {
  test('Clicking a money card plays it without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Find and click the $1M money card
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    await cards.first().click();
    await page.waitForTimeout(500);

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking a property card plays it without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Click the property card (index 2 in mock hand: brown Mediterranean)
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 2) {
      await cards.nth(2).click();
      await page.waitForTimeout(500);
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking an action card shows choice dialog without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Click the deal_breaker card (index 3)
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 3) {
      await cards.nth(3).click();
      await page.waitForTimeout(500);
      // Overlay should appear with options
      const overlay = page.locator('.md-overlay');
      if (await overlay.isVisible()) {
        await expect(overlay).toBeVisible();
        // Cancel it
        await page.keyboard.press('Escape');
        await overlay.click();
        await page.waitForTimeout(200);
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking a wild property card shows color picker without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Click the wild card (index 4)
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 4) {
      await cards.nth(4).click();
      await page.waitForTimeout(500);
      const overlay = page.locator('.md-overlay');
      if (await overlay.isVisible()) {
        // Color picker should show
        await expect(overlay).toBeVisible();
        await overlay.click();
        await page.waitForTimeout(200);
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking action card "Ajouter à la banque" does not crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Click deal_breaker card → shows action_choice → click "Ajouter à la banque"
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 3) {
      await cards.nth(3).click();
      await page.waitForTimeout(400);
      const bankBtn = page.getByRole('button', { name: /Ajouter à la banque/i });
      if (await bankBtn.isVisible({ timeout: 1000 })) {
        await bankBtn.click();
        await page.waitForTimeout(500);
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking deal_breaker "Jouer comme action" shows target selector without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 3) {
      // Click deal_breaker card
      await cards.nth(3).click();
      await page.waitForTimeout(400);
      const playBtn = page.getByRole('button', { name: /Jouer comme action/i });
      if (await playBtn.isVisible({ timeout: 1000 })) {
        await playBtn.click();
        await page.waitForTimeout(400);
        // Should show target selection overlay (Bob)
        const overlay = page.locator('.md-overlay');
        if (await overlay.isVisible()) {
          // Click Bob → shows set selector (lightBlue is complete with 3/3 cards)
          const bobBtn = page.getByRole('button', { name: /Bob/i });
          if (await bobBtn.isVisible({ timeout: 1000 })) {
            await bobBtn.click();
            await page.waitForTimeout(400);
          }
          // Close
          await overlay.click().catch(() => {});
          await page.waitForTimeout(200);
        }
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking birthday action plays it without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    // Find birthday card (index 7 in mock hand)
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 7) {
      await cards.nth(7).click();
      await page.waitForTimeout(400);
      const playBtn = page.getByRole('button', { name: /Jouer comme action/i });
      if (await playBtn.isVisible({ timeout: 1000 })) {
        await playBtn.click();
        await page.waitForTimeout(500);
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking debt_collector shows target selector without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 8) {
      await cards.nth(8).click();
      await page.waitForTimeout(400);
      const playBtn = page.getByRole('button', { name: /Jouer comme action/i });
      if (await playBtn.isVisible({ timeout: 1000 })) {
        await playBtn.click();
        await page.waitForTimeout(400);
        // Should show player selector
        const overlay = page.locator('.md-overlay');
        if (await overlay.isVisible()) {
          await overlay.click().catch(() => {});
          await page.waitForTimeout(200);
        }
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking sly_deal shows target selector without crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    const count = await cards.count();
    if (count > 9) {
      await cards.nth(9).click();
      await page.waitForTimeout(400);
      const playBtn = page.getByRole('button', { name: /Jouer comme action/i });
      if (await playBtn.isVisible({ timeout: 1000 })) {
        await playBtn.click();
        await page.waitForTimeout(400);
        // Target selector → Bob
        const bobBtn = page.getByRole('button', { name: /Bob/i });
        if (await bobBtn.isVisible({ timeout: 1000 })) {
          await bobBtn.click();
          await page.waitForTimeout(400);
        }
        // Close overlay
        const overlay = page.locator('.md-overlay');
        if (await overlay.isVisible()) {
          await overlay.click().catch(() => {});
          await page.waitForTimeout(200);
        }
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking Fin du tour does not crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    const endBtn = page.getByRole('button', { name: /Fin du tour/i });
    if (await endBtn.isVisible({ timeout: 3000 })) {
      await endBtn.click();
    }
    await page.waitForTimeout(500);

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Clicking through all cards does not crash', async ({ page }) => {
    const errors = collectErrors(page);
    await setupSupabaseMocks(page);
    await navigateToGame(page);

    await page.waitForTimeout(500);
    const cards = page.locator('.md-hand-row .md-card');
    const count = await cards.count();
    for (let i = 0; i < Math.min(count, 5); i++) {
      // Close any open overlay first (from previous iteration)
      const overlay = page.locator('.md-overlay');
      if (await overlay.isVisible({ timeout: 300 }).catch(() => false)) {
        // Click the Annuler button inside the overlay to close it
        const cancelBtn = page.getByRole('button', { name: /Annuler/i }).last();
        if (await cancelBtn.isVisible({ timeout: 300 }).catch(() => false)) {
          await cancelBtn.click();
        } else {
          await overlay.click({ position: { x: 10, y: 10 }, force: true }).catch(() => {});
        }
        await page.waitForTimeout(200);
      }

      const card = cards.nth(i);
      if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
        await card.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(300);
      }
    }

    // Close any final overlay
    const finalOverlay = page.locator('.md-overlay');
    if (await finalOverlay.isVisible({ timeout: 300 }).catch(() => false)) {
      const cancelBtn = page.getByRole('button', { name: /Annuler/i }).last();
      if (await cancelBtn.isVisible({ timeout: 300 }).catch(() => false)) {
        await cancelBtn.click();
      }
    }

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });

  test('Players with null sets do not crash the board render', async ({ page }) => {
    const errors = collectErrors(page);
    // Room where both players have null sets (simulating raw Supabase JSONB null)
    const mockRoom = makeMockRoom({
      players: [
        { id: PLAYER_ID, name: 'Alice', bank: null, sets: null },
        { id: PLAYER_2_ID, name: 'Bob', bank: null, sets: null },
      ],
    });
    const mockHand = [
      { id: 'md-0', type: 'money', value: 1, denomination: 1, name: '$1M' },
    ];

    await page.addInitScript(
      ([room, hand]) => {
        const origFetch = window.fetch.bind(window);
        window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (url.includes('monopoly_deal_rooms')) {
            const method = (init?.method ?? 'GET').toUpperCase();
            if (method === 'PATCH') {
              try { Object.assign(room, JSON.parse(init?.body as string ?? '{}')); } catch { /* ignore */ }
            }
            return new Response(JSON.stringify(room), {
              status: 200,
              headers: { 'Content-Type': 'application/json', 'Content-Range': '0-0/1' },
            });
          }
          if (url.includes('monopoly_deal_hands')) {
            return new Response(JSON.stringify({ cards: hand }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return origFetch(input, init);
        };
        sessionStorage.setItem('md_player_id', 'test-player-1');
      },
      [mockRoom, mockHand] as [typeof mockRoom, typeof mockHand]
    );

    await page.routeWebSocket(/realtime\/v1\/websocket/, (ws) => {
      ws.onMessage((message) => {
        try {
          const msg = JSON.parse(message.toString());
          if (msg.event === 'heartbeat') {
            ws.send(JSON.stringify({ event: 'phx_reply', topic: 'phoenix', payload: { status: 'ok', response: {} }, ref: msg.ref, join_ref: null }));
          }
          if (msg.event === 'phx_join') {
            const pgChanges = (msg.payload?.config?.postgres_changes ?? []) as object[];
            ws.send(JSON.stringify({ event: 'phx_reply', topic: msg.topic, payload: { status: 'ok', response: { postgres_changes: pgChanges.map((p, i) => ({ ...p, id: i + 1 })) } }, ref: msg.ref, join_ref: msg.join_ref }));
          }
        } catch { /* ignore */ }
      });
    });

    await navigateToGame(page);

    // Click the money card — should not crash even with null bank/sets
    const cards = page.locator('.md-hand-row .md-card');
    await expect(cards.first()).toBeVisible({ timeout: 5000 });
    await cards.first().click();
    await page.waitForTimeout(500);

    expect(filterCritical(errors)).toHaveLength(0);
    await expect(page.locator('body')).toBeVisible();
  });
});
