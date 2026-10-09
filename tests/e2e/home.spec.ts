import {test,expect} from '@playwright/test';

for(const [label,width,height] of [['desktop',1440,900],['tablet',1024,768],['phone',390,844],['compact phone',320,568],['landscape',844,390],['wide landscape',932,430]] as const){
  test(`title screen fits and stays actionable on ${label}`,async({page})=>{
    await page.setViewportSize({width,height});
    await page.goto('/?r=3d');
    await expect(page.locator('#game-title')).toHaveText('SOUSMICE✦');
    await page.waitForTimeout(1000);
    const geometry=await page.evaluate(()=>{
      const box=(id:string)=>document.getElementById(id)!.getBoundingClientRect();
      return {scrollWidth:document.body.scrollWidth,create:box('create').toJSON(),join:box('join').toJSON(),training:box('training').toJSON(),settings:box('settings').toJSON()};
    });
    expect(geometry.scrollWidth).toBeLessThanOrEqual(width);
    for(const target of [geometry.create,geometry.join,geometry.training,geometry.settings]){
      expect(target.left).toBeGreaterThanOrEqual(0);
      expect(target.top).toBeGreaterThanOrEqual(0);
      expect(target.right).toBeLessThanOrEqual(width);
      expect(target.bottom).toBeLessThanOrEqual(height);
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
    }
    expect(geometry.create.bottom).toBeLessThanOrEqual(geometry.training.top);
    await page.locator('#create').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.locator('#entry-form')).toBeVisible();
    await page.locator('#modal-close').click();
    await page.locator('#join').click();
    await expect(page.locator('#room-code')).toBeVisible();
  });
}

test('home animations respect reduced motion and keyboard focus',async({browser})=>{
  const context=await browser.newContext({reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto('/?r=3d');
  const animation=await page.locator('.hero-art').evaluate(el=>getComputedStyle(el).animationName);
  expect(animation).toBe('none');
  await page.keyboard.press('Tab');
  await expect(page.locator('.home-brand')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#settings')).toBeFocused();
  await context.close();
});
