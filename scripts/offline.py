import asyncio, base64, os, shutil, time, json
from playwright.async_api import async_playwright

FRAMES = "/app/scripts/frames"
CMD = "/app/scripts/cmd.txt"
LOG = "/app/scripts/ctl.log"
W, H = 960, 600
VFPS = 15
t0 = time.time()

INIT = f"""
(() => {{
  window.__three = [];
  window.__THREE_DEVTOOLS__ = new EventTarget();
  window.__THREE_DEVTOOLS__.addEventListener('observe', (e) => window.__three.push(e.detail));
  const og = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {{
    if (type && String(type).startsWith('webgl')) attrs = Object.assign({{}}, attrs || {{}}, {{ preserveDrawingBuffer: true }});
    return og.call(this, type, attrs);
  }};
  let vt = 0, q = [], id = 0;
  const start = Date.now();
  performance.now = () => vt;
  Date.now = () => start + vt;
  window.requestAnimationFrame = (cb) => {{ q.push([++id, cb]); return id; }};
  window.cancelAnimationFrame = (i) => {{ q = q.filter(([k]) => k !== i); }};
  window.__step = (n = 1) => {{
    for (let s = 0; s < n; s++) {{
      vt += 1000 / {VFPS};
      const cbs = q; q = [];
      for (const [, cb] of cbs) {{ try {{ cb(vt); }} catch (e) {{ console.error(e); }} }}
    }}
    return vt;
  }};
  window.__grab = () => {{
    const cs = Array.from(document.querySelectorAll('canvas')).sort((a, b) => b.width * b.height - a.width * a.height);
    return cs.length ? cs[0].toDataURL('image/jpeg', 0.86) : null;
  }};
}})();
"""


def log(*a):
    with open(LOG, "a") as f:
        f.write(f"[{time.time()-t0:7.1f}s] " + " ".join(str(x) for x in a) + "\n")


class Ctl:
    def __init__(self, page):
        self.page = page
        self.n = 0
        self.auto = True

    async def step(self, save):
        await self.page.evaluate("__step(1)")
        if save:
            d = await self.page.evaluate("__grab()")
            if d:
                self.n += 1
                with open(f"{FRAMES}/f_{self.n:05d}.jpg", "wb") as f:
                    f.write(base64.b64decode(d.split(",", 1)[1]))

    async def run(self, line):
        parts = line.strip().split(" ", 2)
        op = parts[0]
        if op == "hold":
            for k in parts[1].split("+"):
                await self.page.keyboard.down(k)
        elif op == "release":
            for k in parts[1].split("+"):
                await self.page.keyboard.up(k)
        elif op == "press":
            await self.page.keyboard.press(parts[1])
        elif op == "click":
            await self.page.mouse.click(int(parts[1]), int(parts[2]))
        elif op == "rec":  # rec N  -> renderiza N frames guardándolos
            for _ in range(int(parts[1])):
                await self.step(True)
        elif op == "skip":  # skip N -> avanza N frames sin guardar
            for _ in range(int(parts[1])):
                await self.step(False)
        elif op == "auto":
            self.auto = parts[1] == "on"
        elif op == "shot":
            await self.step(False)
            d = await self.page.evaluate("__grab()")
            if d:
                with open("/app/scripts/latest.jpg", "wb") as f:
                    f.write(base64.b64decode(d.split(",", 1)[1]))
        elif op == "js":
            r = await self.page.evaluate(parts[1] + (" " + parts[2] if len(parts) > 2 else ""))
            log("js ->", json.dumps(r)[:2000])
        elif op == "mark":
            log("MARK frame", self.n, parts[1] if len(parts) > 1 else "")
        log("done:", line.strip(), "| frames:", self.n)


async def main():
    shutil.rmtree(FRAMES, ignore_errors=True)
    os.makedirs(FRAMES, exist_ok=True)
    open(LOG, "w").close()
    open(CMD, "w").close()
    async with async_playwright() as p:
        browser = await p.chromium.launch(args=["--use-gl=swiftshader", "--ignore-gpu-blocklist"])
        page = await browser.new_page(viewport={"width": W, "height": H})
        await page.add_init_script(INIT)
        page.on("pageerror", lambda e: log("pageerror", str(e)[:200]))
        ctl = Ctl(page)
        try:
            await page.goto("https://usain-bot.vercel.app", wait_until="domcontentloaded", timeout=60000)
            for _ in range(10):
                await ctl.step(False)
            await page.evaluate("Array.from(document.querySelectorAll('button')).find(b=>/3D SANDBOX/i.test(b.innerText)).click()")
            log("READY")
            while True:
                lines = open(CMD).read().strip()
                if lines:
                    open(CMD, "w").close()
                    for line in lines.splitlines():
                        if line.strip() == "quit":
                            raise SystemExit
                        try:
                            await ctl.run(line)
                        except Exception as e:
                            log("ERR", line, str(e)[:300])
                elif ctl.auto:
                    await ctl.step(False)
                else:
                    await asyncio.sleep(0.3)
        except SystemExit:
            pass
        finally:
            log("closing, frames:", ctl.n)
            await browser.close()


asyncio.run(main())
