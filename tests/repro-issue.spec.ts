import { test, expect } from '@playwright/test';

test('Reproduce media loading issues and capture diagnostics', async ({ page }) => {
  test.setTimeout(120000); // Increase timeout to 2 minutes
  await page.goto('http://localhost:3000');

  // Switch to "Simulateur" tab
  await page.getByRole('button', { name: /Simulateur/i }).click();

  const links = [
    { name: 'youtube', url: 'https://www.youtube.com/watch?v=6eVOCBb6DzE' },
    { name: 'instagram-1', url: 'https://www.instagram.com/reel/DYnCi2IhHHE/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==' },
    { name: 'instagram-2', url: 'https://www.instagram.com/reel/DYk8aKyhZYq/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==' },
    { name: 'tiktok', url: 'https://www.tiktok.com/@pepe_fails/video/7620170003371003156' }
  ];

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));

  for (const { name, url } of links) {
    console.log(`\n--- Testing URL: ${url} ---`);
    
    // Fill URL
    const urlInput = page.locator('input[placeholder="Https://images.unsplash.com/..."]');
    await urlInput.fill(url);

    // Change type to video manually to see if it makes a difference
    await page.getByRole('button', { name: /Vidéo \(mp4\/webm\)/i }).click();

    // Trigger
    await page.getByRole('button', { name: /DECLENCHER LA SIMULATION MANUELLE/i }).click();
    console.log(`Triggered simulation for ${name}`);

    // Wait for the alert to appear in the DOM (even if not visible)
    // We look for the text "Nouveau média d'abonnés" which is always there in an alert
    try {
      await page.waitForSelector('text=Nouveau média d\'abonnés', { timeout: 15000 });
      console.log(`Alert detected in DOM for ${name}`);
    } catch (e) {
      console.log(`Alert NOT detected in DOM for ${name}`);
    }
    
    // Take a screenshot of the whole dashboard
    await page.screenshot({ path: `test-results/repro-${name}-full.png` });

    // Wait for a bit to see if media loads
    await page.waitForTimeout(5000);
    
    // Take another screenshot after wait
    await page.screenshot({ path: `test-results/repro-${name}-after-wait.png` });

    // Click force play to see if it helps
    console.log(`Clicking FORCE PLAY for ${name}`);
    await page.getByRole('button', { name: /FORCE PLAY/i }).click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `test-results/repro-${name}-after-force-play.png` });

    // Clear alert using the skip button in dashboard if possible, or just wait
    // Actually, let's just wait for the next loop.
    await page.waitForTimeout(1000);
  }
});
