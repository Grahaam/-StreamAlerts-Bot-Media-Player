import { test, expect } from '@playwright/test';

test('Test media URL parsing and dashboard layout', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // 1. Switch to "Simulateur" tab
  await page.getByRole('button', { name: /Simulateur/i }).click();

  const links = [
    'https://www.youtube.com/watch?v=6eVOCBb6DzE',
    'https://www.instagram.com/reel/DYnCi2IhHHE/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==',
    'https://www.instagram.com/reel/DYk8aKyhZYq/?utm_source=ig_web_copy_link&igsh=NTc4MTIwNjQ2YQ==',
    'https://www.tiktok.com/@pepe_fails/video/7620170003371003156'
  ];

  for (const url of links) {
    // Fill URL
    const urlInput = page.locator('input[placeholder="Https://images.unsplash.com/..."]');
    await urlInput.fill(url);

    // Trigger
    await page.getByRole('button', { name: /DECLENCHER LA SIMULATION MANUELLE/i }).click();

    // Verify it loads in the overlay (it should appear in the preview)
    // The OBSOverlayView is embedded in the dashboard
    await page.waitForSelector('.animate-neon-pulse', { timeout: 15000 });
    
    // Check if the media is actually present (e.g., iframe or video)
    const media = page.locator('.relative.rounded-xl.mt-2.overflow-hidden');
    await expect(media).toBeVisible();
    
    // Wait for the alert to finish or skip
    await page.waitForTimeout(5000); // Give it some time
    await page.keyboard.press('Escape'); // Skip
  }

  // 3. Test layout adjustments
  await page.getByRole('button', { name: /Styles/i }).click();
  
  // Adjust Scale
  const scaleInput = page.locator('input[type="range"]').first();
  const initialScale = await scaleInput.inputValue();
  await scaleInput.fill('1.5');
  
  // Verify layout adjustment
  // Check if iframe style is updated (it should trigger a POST request to /api/iframe-style)
  // We can check the DOM for the iframe element's transform style
  await page.waitForTimeout(1000);
  
  // Reset scale
  await scaleInput.fill(initialScale);
});
