# Los textos de captación de OOOX Oficios (17-11-2026): la llamada, el WhatsApp, el correo y los dos seguimientos.
# Escritos con lo que enseña Isra Bravo (parar la atención en la primera línea, hablar de él y no de ti, directo y sin
# necesidad, corto, insistir sin pesadez) y lo de Hormozi para el primer contacto (algo hecho para él antes de pedirle
# nada). El primer contacto en frío es la carta (papel, con el código QR de su muestra), después de pasar la lista por la
# Lista Robinson; el WhatsApp y el correo, solo cuando él ha contestado o ha dicho que sí: la ley no deja mandar
# publicidad por correo ni por WhatsApp a quien no la ha pedido (LSSI, art. 21), tampoco a empresas, y las llamadas en
# frío están en duda (pregunta para el abogado). Detalle en la guía, pestaña «Captación».
#
# Cada texto sale de los datos de un negocio:
#   negocio   nombre comercial («Fontanería Serra»)
#   oficio    fontaneria | electricidad | climatizacion | cerrajeria | general
#   persona   con quién habló Oscar (puede ir vacío: entonces, «Hola:»)
#   enlace    su demo con su nombre
#   hasta     hasta cuándo está la demo («domingo 30»)
#   whatsapp  el WhatsApp de Oscar (vacío mientras no lo haya)
import html, re

ESCENA = {
    'fontaneria': 'Estás debajo de un fregadero y suena el móvil. No puedes cogerlo.',
    'electricidad': 'Estás subido a una escalera, con el cuadro abierto, y suena el móvil. No puedes cogerlo.',
    'climatizacion': 'Estás en una azotea montando un aire y suena el móvil. No puedes cogerlo.',
    'cerrajeria': 'Estás abriendo una puerta y suena el móvil. Otra puerta. No puedes cogerlo.',
    'general': 'Estás a mitad de un trabajo y suena el móvil. No puedes cogerlo.',
}

# para presentarse en la llamada: «hago apps para fontaneros»
PARA = {'fontaneria': 'fontaneros', 'electricidad': 'electricistas', 'climatizacion': 'instaladores de aire y calefacción',
        'cerrajeria': 'cerrajeros', 'general': 'negocios de reparaciones'}

def oficio_de(categoria, nombre=''):
    """El oficio a partir de la categoría y el nombre de la lista (PIPELINE-oficios-lista-larga.csv)."""
    t = (categoria + ' ' + nombre).lower()
    if any(p in t for p in ('fontaner', 'lampist', 'desatasc', 'plumb')): return 'fontaneria'
    if any(p in t for p in ('electric', 'elèctric', 'electr')): return 'electricidad'
    if any(p in t for p in ('climatiz', 'aire acond', 'calefac')): return 'climatizacion'
    if any(p in t for p in ('cerraj', 'manyà', 'manya')): return 'cerrajeria'
    return 'general'

def corto(nombre):
    """El nombre comercial, sin la forma jurídica: «Fontanería Serra, S. L.» → «Fontanería Serra»."""
    n = re.sub(r'[,\s]+(s\.?\s?l\.?\s?u?\.?|s\.?\s?a\.?|s\.?\s?c\.?\s?p\.?|s\.?\s?c\.?|c\.?\s?b\.?)\s*$', '', nombre.strip(), flags=re.I)
    return re.sub(r'\s+', ' ', n).strip(' ,.-')

def hola(d):
    return f"Hola, {d['persona']}:" if d.get('persona') else 'Hola:'

def firma(d):
    return 'Oscar' + (f"\n{d['whatsapp']}" if d.get('whatsapp') else '')

def asuntos(d):
    n = d['negocio']
    return [f'Para {n}', f'Lo prometido: {n}', f'{n}, en el móvil']

def llamada(d):
    n = d['negocio']
    return (f"—Hola, ¿es {n}? Soy Oscar, hago apps para {PARA[d['oficio']]}. Te robo treinta segundos.\n"
            f"—Te he preparado una muestra con el nombre de {n}: el cliente pide cita desde la web y tú lo repartes desde el móvil.\n"
            "—¿Te la mando por WhatsApp y la miras cuando puedas? Son tres minutos.\n"
            "  Si dice que sí: «¿A este número? ¿Con quién hablo?». Y se apunta: permiso, fecha y nombre.\n"
            "  Si dice que no: «Sin problema, no te molesto más. Que vaya bien». Y se apunta «no contactar».")

def whatsapp(d):
    p = f", {d['persona']}" if d.get('persona') else ''
    return (f"Hola{p}. Soy Oscar, el de la llamada. Esto es lo que te decía: la web de citas y la app de la oficina, con el nombre de {d['negocio']}.\n\n"
            f"Ábrela y toca, son tres minutos: {d['enlace']}\n\n"
            "Si algo no encaja con cómo trabajáis, lo cambio.")

def respuesta(d):
    """Cuando te escribe él (desde el botón «Lo quiero» de su muestra o por la carta): escuchar antes de vender."""
    p = f", {d['persona']}" if d.get('persona') else ''
    return (f"Hola{p}. Gracias por escribir.\n\n"
            f"Para dejar la de {d['negocio']} como trabajáis: ¿cómo os entran hoy los avisos (por teléfono, por WhatsApp, por la web) y cuántos sois?\n\n"
            "Con eso te la ajusto y te cuento cómo sería ponerla en marcha.")

def correo_texto(d):
    return '\n\n'.join([
        hola(d), 'Lo prometido.', ESCENA[d['oficio']], 'Cuando por fin devuelves la llamada, ya ha llamado a otro.',
        f"Te he preparado una cosa para eso. Lleva el nombre de {d['negocio']}:", '[la imagen, con el enlace]',
        'Tus clientes piden cita desde la web, solo a horas en las que de verdad tienes a alguien libre. Tú lo repartes con un toque. '
        'Tu técnico enseña el precio, el cliente firma en la pantalla y el parte y la garantía salen solos.',
        f"Ábrela y toca. Son tres minutos y no hay que registrarse: {d['enlace']}",
        'Si algo no encaja con cómo trabajáis, lo cambio hasta que encaje.', firma(d),
        f"P.D. La muestra está guardada hasta el {d['hasta']}. Después la quito: lleva el nombre de tu negocio y no quiero que ande por ahí.",
        'Si prefieres que no te escriba más, contesta «no» y no te escribo más.'])

def correo_html(d, imagen):
    """El correo para pegar en Gmail: parece un correo de una persona (sin cabecera ni logotipos), con una sola imagen."""
    e = {k: html.escape(str(v)) for k, v in d.items()}
    p = lambda t: f'<p style="margin:0 0 14px">{t}</p>'
    return ('<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#202124;max-width:560px">'
            + p(html.escape(hola(d))) + p('Lo prometido.') + p(html.escape(ESCENA[d['oficio']]))
            + p('Cuando por fin devuelves la llamada, ya ha llamado a otro.')
            + p(f"Te he preparado una cosa para eso. Lleva el nombre de {e['negocio']}:")
            + f'<p style="margin:0 0 16px"><a href="{e["enlace"]}"><img src="{html.escape(imagen)}" width="560" alt="{e["negocio"]}: la web de citas y la app de la oficina, en tres móviles" '
              'style="display:block;width:100%;max-width:560px;height:auto;border:0;border-radius:10px"></a></p>'
            + p('Tus clientes piden cita desde la web, solo a horas en las que de verdad tienes a alguien libre. Tú lo repartes con un toque. '
                'Tu técnico enseña el precio, el cliente firma en la pantalla y el parte y la garantía salen solos.')
            + p(f'<a href="{e["enlace"]}" style="color:#1a0dab">Ábrela y toca.</a> Son tres minutos y no hay que registrarse.')
            + p('Si algo no encaja con cómo trabajáis, lo cambio hasta que encaje.')
            + p('Oscar' + (f"<br>{e['whatsapp']}" if d.get('whatsapp') else ''))
            + p(f"P.D. La muestra está guardada hasta el {e['hasta']}. Después la quito: lleva el nombre de tu negocio y no quiero que ande por ahí.")
            + '<p style="margin:18px 0 0;font-size:12px;color:#80868b">Si prefieres que no te escriba más, contesta «no» y no te escribo más.</p></div>')

def carta(d):
    """La carta en papel (A5), con el código QR de su muestra en medio. Lo que la ley deja hacer en frío."""
    f = d.get('fuente') or 'Google Maps'
    return '\n\n'.join([f"{d['negocio']}:",
        ESCENA[d['oficio']] + ' Cuando devuelves la llamada, ya ha llamado a otro.',
        'Te he preparado una cosa para eso. Lleva tu nombre.',
        '[el código QR de su muestra] Escanéalo con el móvil.',
        f"Es tu web de citas y la app de tu oficina, con el nombre de {d['negocio']}. Tus clientes piden cita solo a horas en las que "
        'tienes a alguien libre; tú lo repartes con un toque; tu técnico enseña el precio y el cliente firma en la pantalla. '
        'Son tres minutos y no hay que registrarse.',
        'Si te encaja, escríbeme por WhatsApp' + (f": {d['whatsapp']}." if d.get('whatsapp') else '.') + ' Si algo no encaja con cómo trabajáis, lo cambio.',
        'Oscar',
        f"P.D. La muestra estará hasta el {d['hasta']}. Después la quito: lleva el nombre de tu negocio y no quiero que ande por ahí.",
        f"(Al pie, pequeño) Tu dirección la he sacado de tu ficha pública de {f}. Si no quieres que te escriba, dímelo y la borro."])

# ---------- Correos en frío (17-11-2026, noche) ----------
# Si Oscar decide escribir sin contacto previo. Siguen siendo publicidad no pedida (LSSI, art. 21): una infracción leve
# si es uno a uno, grave si es masivo o insistente. Para reducirlo a lo mínimo, y porque es lo que mejor funciona: el
# primero no lleva enlace ni imagen y pide permiso («¿Te la mando?»); con un «sí», lo demás ya va pedido. Como mucho
# tres por negocio, y al primer «no» o tras el tercero sin respuesta, no se le vuelve a escribir. Texto plano, menos de
# 80 palabras, con quién escribe, de dónde salió su correo y cómo decir que no.

def num(x):
    """«4.8» → «4,8»."""
    return str(x).strip().replace('.', ',')

def primera_linea(d):
    """La primera línea, con lo que se sabe de él (la nota y las reseñas de su ficha, si hace urgencias, si tiene web)."""
    n, nota, res = d['negocio'], d.get('nota'), d.get('resenas')
    if nota and res and d.get('h24'):
        return f"Con un {num(nota)} en Google, {res} reseñas y urgencias las 24 horas, a {n} no le faltan llamadas. Lo difícil es cogerlas todas."
    if nota and res:
        return f"Con un {num(nota)} en Google y {res} reseñas, clientes no os faltan. Lo que se escapa son las llamadas que no da tiempo a coger."
    if d.get('web') is False:
        return f"He buscado {n} en Google y no he encontrado dónde pedir cita sin llamar."
    return ESCENA[d['oficio']]

def pie_frio(d):
    return f"Tu correo lo he sacado de {d.get('fuente_correo') or 'vuestra web'}. Si no quieres que te escriba, contesta «no» y no vuelvo a hacerlo."

def asuntos_frio(d):
    n = d['negocio']
    return [f'Para {n}', f'Muestra para {n}', f'{n}: una pregunta']

def frio_1(d):
    """El primero: sin enlace ni imagen; pide permiso."""
    return '\n\n'.join([hola(d), primera_linea(d),
        f"Os he preparado una muestra: la web de citas y la app de la oficina, con el nombre de {d['negocio']}. "
        'El cliente pide hora solo cuando tenéis a alguien libre, y el técnico cierra cada trabajo con el precio firmado en el móvil.',
        '¿Te la mando? Son tres minutos.', 'Oscar · OOOX (ooox.es)', pie_frio(d)])

def frio_2(d):
    """A los 4 días, en el mismo hilo: una línea."""
    return '\n\n'.join([hola(d),
        f"¿Te la mando o lo dejo estar? Es la muestra de {d['negocio']}: su web de citas y la app de la oficina. Con un «sí», te llega hoy.",
        'Oscar', pie_frio(d)])

def frio_3(d):
    """A los 10 días, en el mismo hilo: el último, sin presión. Después, nada más."""
    return '\n\n'.join([hola(d),
        f"Último correo, prometido. Si algún día quieres ver cómo quedaría {d['negocio']} con su web de citas y su app, contesta «sí» y te la mando. "
        'Si no, no vuelvo a escribirte.', 'Suerte con los avisos.', 'Oscar', pie_frio(d)])

RESPUESTAS = {
    '¿Cuánto cuesta?': 'Alta de 400 € (a los primeros negocios, 200 € y el primer mes gratis) y 30 € al mes con IVA, sin permanencia. '
                       'La muestra que te mando es la misma app, con tu nombre.',
    'Ya tenemos programa': '¿Cuál usáis? Si os va bien, no te hago cambiar. Esto encaja cuando los avisos entran por teléfono o WhatsApp '
                           'y se apuntan a mano. Si quieres, te digo en dos líneas qué cambiaría.',
    'No tengo tiempo': 'Por eso es corta: tres minutos, desde el móvil. Y si te encaja, la pongo en marcha yo.',
    '¿Quién eres?': 'Oscar, de OOOX (ooox.es). Hago apps para oficios: la web de citas, la oficina en el móvil y los papeles del técnico.',
}

def seguimiento_1(d):
    """A los dos o tres días, si no ha contestado: una pregunta, para escuchar (y ajustar su muestra)."""
    return '\n\n'.join([hola(d),
        'Una pregunta y te dejo tranquilo: ¿cómo os entran hoy los avisos? ¿Por teléfono, por WhatsApp, por la web?',
        f"Te lo pregunto porque la muestra de {d['negocio']} la puedo dejar como trabajáis ahora. Cuéntamelo en dos líneas y te la ajusto.",
        d['enlace'], firma(d)])

def seguimiento_2(d):
    """El último, antes de quitarla: sin presión y con la oferta de los primeros."""
    return '\n\n'.join([hola(d),
        f"El {d['hasta']} quito la muestra de {d['negocio']}, como te dije.",
        'Si te interesa, contesta con un «sí» y la dejo una semana más. Si no, ningún problema: no te escribo más.',
        firma(d),
        'P.D. A los primeros negocios se la dejo a 200 € en vez de 400 €, con el primer mes gratis. Después, 30 € al mes con IVA, sin permanencia.'])
