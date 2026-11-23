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

# «Nuevo aviso» de la oficina, también paso a paso (20-11-2026): qué le pasa → cuándo → quién → dónde → resumen («Crear el aviso»).
async def sigue_nuevo(pg, siguiente, espera=10000):
    await pg.click('#fNuevo [type=submit]')
    await pg.wait_for_selector(f'#fNuevo[data-paso={siguiente}]', timeout=espera)

async def nuevo_aviso(pg, av='atasco', urg=True, tel='', nomap='', dir='', cp='', nota='', origen='', dia=None, fr=None, crear=True):
    """Rellena «Nuevo aviso» paso a paso. Con urg=False, cita: el día (dia) y la franja (fr) dados o la primera libre."""
    await pg.wait_for_selector('#fNuevo[data-paso=av]')
    await pg.locator(f'#fNuevo [data-b-av={av}]').click(); await sigue_nuevo(pg, 'cu')
    if urg: await pg.locator('#fNuevo [data-b-cu=urg]').click()
    else:
        await pg.locator('#fNuevo [data-b-cu=cita]').click()
        if dia: await pg.locator(f'#fNuevo [data-b-dia="{dia}"]').click()
        await (pg.locator(f'#fNuevo [data-b-fr="{fr}"]') if fr else pg.locator('#fNuevo [data-b-fr]:not([disabled])').first).click()
    await sigue_nuevo(pg, 'qui')
    await pg.fill('#n_tel', tel); await pg.fill('#n_nomap', nomap); await sigue_nuevo(pg, 'don')
    await pg.fill('#n_dir', dir); await pg.fill('#n_cp', cp); await sigue_nuevo(pg, 'fin')
    if origen: await pg.locator(f'#fNuevo [data-b-or={origen}]').click()
    if nota: await pg.fill('#n_nota', nota)
    if crear: await pg.click('#fNuevo [type=submit]')

# Hojas de la app paso a paso (20-11-2026): se pulsa «Continuar» hasta que se ve lo que se busca (el botón de acabar, la firma…).
async def hoja_hasta(pg, sel, max_pasos=5, espera=4000):
    for _ in range(max_pasos):
        if await pg.locator(sel).first.is_visible(): return
        b = pg.locator('dialog[open] [data-hps]')
        if not await b.is_visible(): break
        await b.click(); await pg.wait_for_timeout(200)
    await pg.locator(sel).first.wait_for(state='visible', timeout=espera)
