#!/usr/bin/env python3
"""Test UI en diferentes viewports y captura screenshots."""
import asyncio
from playwright.async_api import async_playwright
import os

async def test_ui():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        
        test_cases = [
            ('mobile', 390, 844),
            ('desktop', 1280, 720)
        ]
        
        os.makedirs('artifacts/screenshots', exist_ok=True)
        
        for device_name, width, height in test_cases:
            print(f'\n=== Testing {device_name} ({width}x{height}) ===')
            
            page = await browser.new_page(viewport={'width': width, 'height': height})
            await page.goto('http://localhost:8080/')
            
            await page.wait_for_selector('#app', timeout=10000)
            await asyncio.sleep(1)
            
            await page.screenshot(path=f'artifacts/screenshots/01_{device_name}_home.png', full_page=True)
            print(f'✓ Home page')
            
            await page.click('#btn-fighter-select')
            await asyncio.sleep(0.5)
            await page.screenshot(path=f'artifacts/screenshots/02_{device_name}_fighter_selector.png')
            
            fighter_btns = await page.query_selector_all('.fighter-item')
            for btn in fighter_btns:
                text = await btn.inner_text()
                if 'Link' in text and 'Young Link' not in text and 'Toon Link' not in text:
                    await btn.click()
                    break
            
            await asyncio.sleep(1)
            await page.screenshot(path=f'artifacts/screenshots/03_{device_name}_link_filtered.png', full_page=True)
            print(f'✓ Link filtered view')
            
            cards = await page.query_selector_all('.bg-surface1')
            if cards:
                img_btn = await cards[0].query_selector('button[onclick*="openSkinDetail"]')
                if img_btn:
                    await img_btn.click()
                    await asyncio.sleep(1)
                    await page.screenshot(path=f'artifacts/screenshots/04_{device_name}_link_detail.png')
                    print(f'✓ Link skin detail')
                    
                    close_btn = await page.query_selector('button[onclick*="closest"]')
                    if close_btn:
                        await close_btn.click()
                        await asyncio.sleep(0.5)
            
            await page.click('#btn-view-mode')
            await asyncio.sleep(0.5)
            await page.screenshot(path=f'artifacts/screenshots/05_{device_name}_gallery_view.png', full_page=True)
            print(f'✓ Gallery view')
            
            await page.click('#btn-view-mode')
            await asyncio.sleep(0.5)
            await page.screenshot(path=f'artifacts/screenshots/06_{device_name}_list_view.png', full_page=True)
            print(f'✓ List view')
            
            save_btn = await page.query_selector('button[onclick*="toggleSave"]')
            if save_btn:
                await save_btn.click()
                await asyncio.sleep(0.5)
                await page.screenshot(path=f'artifacts/screenshots/07_{device_name}_saved.png', full_page=True)
                print(f'✓ Saved skin')
            
            await page.click('#nav-saved')
            await asyncio.sleep(1)
            await page.screenshot(path=f'artifacts/screenshots/08_{device_name}_my_selection.png', full_page=True)
            print(f'✓ My selection view')
            
            await page.click('#nav-info')
            await asyncio.sleep(0.5)
            await page.screenshot(path=f'artifacts/screenshots/09_{device_name}_info.png', full_page=True)
            print(f'✓ Info view')
            
            await page.close()
        
        await browser.close()
        print('\n✓ All tests completed! Screenshots saved to artifacts/screenshots/')

if __name__ == '__main__':
    asyncio.run(test_ui())
