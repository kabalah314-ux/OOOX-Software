# La cita va paso a paso desde el 20-11-2026 (qué arreglar → algo que debamos saber → cuándo → dónde → resumen).
# hasta(pg, 'tu') avanza con «Continuar» hasta ese paso; lo que falte (la avería, la franja) lo elige: la primera libre.
# Con meta='resumen', además pulsa «Revisar la cita» y espera el resumen. Sirve igual para la demo y para las copias.
ORDEN = ['av', 'det', 'fr', 'tu']

async def paso(pg):
    if await pg.locator('#rConfirma').count(): return 'resumen'
    f = pg.locator('#f')
    return await f.get_attribute('data-paso') if await f.count() else None

async def hasta(pg, meta='tu', espera=10000):
    await pg.wait_for_selector('#f, #rConfirma', timeout=espera)
    for _ in range(12):
        p = await paso(pg)
        if p == meta: return p
        if p is None: await pg.wait_for_timeout(200); continue
        if p == 'resumen': raise AssertionError('ya está en el resumen')
        if p == 'av' and not await pg.locator('input[name=av]:checked').count():
            await pg.locator('input[name=av]').first.check(force=True); await pg.wait_for_timeout(80)
        if p == 'fr':
            await pg.wait_for_selector('[data-fr]', timeout=espera)
            if not await pg.locator('[data-fr][aria-checked=true]').count():
                await pg.locator('[data-fr]:not([disabled])').first.click(); await pg.wait_for_timeout(80)
        await pg.click('#sigue')
        sig = 'resumen' if p == 'tu' else ORDEN[ORDEN.index(p) + 1]
        if sig == 'resumen': await pg.wait_for_selector('#rConfirma, #revisa, .fallo', timeout=espera)
        else: await pg.wait_for_function("(p)=>{const f=document.querySelector('#f');return f&&f.dataset.paso!==p}", arg=p, timeout=espera)
    raise AssertionError('no llega al paso ' + meta + ' (está en ' + str(await paso(pg)) + ')')
