import asyncio
from playwright.async_api import async_playwright
from PIL import Image
import io

SITES = {
    "moog": "https://moog-barcelona.vercel.app",
    "elementia": "https://axie-infinity-style-game.vercel.app/",
    "bolt": "https://usain-bot.vercel.app/",
    "massflow": "https://saas-madajesadomicilio.vercel.app/",
}
OUT = "/app/frontend/public/projects"


async def cap(browser, name, url, w, h, suffix, steps):
    ctx = await browser.new_context(viewport={"width": w, "height": h}, device_scale_factor=1)
    page = await ctx.new_page()
    try:
        await page.goto(url, wait_until="networkidle", timeout=45000)
    except Exception as e:
        print("goto warn", name, e)
    await page.wait_for_timeout(3500)
    frames = []
    for i in range(steps):
        png = await page.screenshot(type="png")
        frames.append(Image.open(io.BytesIO(png)).convert("RGB"))
        if i == 0:
            await page.evaluate("""() => { document.querySelectorAll('body *').forEach(el => { const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') el.style.visibility = 'hidden'; }); }""")
        await page.mouse.wheel(0, h)
        await page.wait_for_timeout(1600)
    # stitch
    total = Image.new("RGB", (w, h * len(frames)))
    for i, f in enumerate(frames):
        total.paste(f, (0, i * h))
    tw = 900 if w > 800 else 420
    s = tw / w
    total = total.resize((tw, int(total.height * s)))
    total.save(f"{OUT}/{name}{suffix}_long.jpg", quality=72)
    first = frames[0].resize((int(w * (1200 / w if w > 800 else 500 / w)), int(h * (1200 / w if w > 800 else 500 / w))))
    first.save(f"{OUT}/{name}{suffix}.jpg", quality=80)
    await ctx.close()
    print("ok", name, suffix, len(frames))


async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(executable_path="/usr/bin/google-chrome", args=["--no-sandbox"])
        for n, u in SITES.items():
            steps = 1 if n == "massflow" else 6
            await cap(browser, n, u, 1440, 900, "", steps)
            pass
        await browser.close()

asyncio.run(main())
