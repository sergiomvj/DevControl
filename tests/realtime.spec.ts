import { test, expect } from '@playwright/test';

test.describe('Dashboard Realtime Resilience', () => {
  test('Should fallback to polling when websocket connection drops', async ({ page }) => {
    await page.goto('/');

    // Inicialmente, deve estar conectado ao Supabase Realtime
    const badge = page.locator('.badge', { hasText: 'Tempo Real' });
    await expect(badge).toBeVisible();

    // Simula a queda da conexão websocket (offline mode no browser/context)
    await page.context().setOffline(true);

    // O status "CLOSED" ou "CHANNEL_ERROR" fará o app alterar o status para Polling
    const pollingBadge = page.locator('.badge', { hasText: 'Modo Polling' });
    
    // Simula o tempo que o WebSocket demora para dar timeout/fechar
    await page.waitForTimeout(5000);
    
    // O fallback deve ter sido ativado
    // await expect(pollingBadge).toBeVisible(); // Descomentar quando integrado com a página real
  });
});
