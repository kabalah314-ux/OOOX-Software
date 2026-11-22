#!/usr/bin/env bash
# Pasa todas las pruebas de la app de oficios y dice qué bloque falla.
# Uso:  bash pruebas.sh [reglas|navegador|todo]
#   SITIO=<carpeta del sitio>   por defecto, la demo publicada en este repositorio
#   NAVEGADOR=chromium|firefox|webkit   motor para las pruebas de pantallas (por defecto, chromium)
#   TANDAS=100  SEMILLA=20261113   tamaño y semilla de los recorridos al azar
#   MUTANTES=1  añade la prueba de «reglas estropeadas adrede» (tarda unos minutos; en GitHub corre siempre)
#   COPIAS=<carpeta de las copias>   por defecto, frontend/public/oficios; cada copia pasa sus propias pruebas
#   COMPLETOS=<carpeta>   los datos completos de las copias con servidor (<id>.js), que su archivo público no lleva; por
#                         defecto, pruebas-reglas/completos (las copias de prueba). Sin ellos, esa copia se prueba solo por su parte pública
#   AHORA=2026-11-17T10:30:00+01:00   la hora fija de las pruebas de pantallas (por defecto, un martes laborable a media mañana)
#   HORAS="..."  otras horas a las que se repite la batería de la app (por defecto, un sábado de noche y el cruce de fin de año)
#   GRUPO=2/3    solo el tercio 2 de 3 de las pruebas de pantallas (reparto por turnos: cada bloque va a un grupo distinto, así los
#                pesados no se juntan). Los tres grupos juntos hacen lo mismo que sin GRUPO. Sirve para repartir el trabajo en GitHub
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
# la carpeta del sitio: la del repositorio o, en la copia del PC, la que está al lado (../site)
if [ -z "${SITIO:-}" ]; then for d in "$AQUI/../../frontend/public/demos/ramirez-24h" "$AQUI/../site"; do [ -d "$d" ] && { SITIO="$d"; break; }; done; fi
[ -d "${SITIO:-}" ] || { echo "No encuentro la carpeta del sitio. Pásala así: SITIO=<carpeta> bash pruebas.sh"; exit 2; }
SITIO="$(cd "$SITIO" && pwd)"
QUE="${1:-todo}"; mal=0; R="$AQUI/pruebas-reglas"; OTRO="$R/negocios/voltio.js"; COMPLETOS="${COMPLETOS:-$R/completos}"
# los datos con los que se prueba una copia por dentro: los completos si su archivo es el público (17-11-2026) y están a mano;
# si es el público y no están, nada (y se dice); si no, su propio archivo
completos(){ local d="$1" id; id="$(basename "$(dirname "$(dirname "$d")")")"
  if grep -q '^ publico:true' "$d"; then [ -f "$COMPLETOS/$id.js" ] && echo "$COMPLETOS/$id.js"; else echo "$d"; fi; }
# las copias de la app hechas para cada negocio (ver copias.mjs): en el repositorio o, en la copia del PC, en la carpeta de al lado (../oficios)
if [ -z "${COPIAS:-}" ]; then if [ -d "$AQUI/../../frontend/public" ]; then COPIAS="$AQUI/../../frontend/public/oficios"; else COPIAS="$AQUI/../oficios"; fi; fi
# GRUPO=n/total: en las pruebas de pantallas (EN_PANTALLAS=1) cada bloque, por turnos, le toca a un grupo; los demás lo saltan
NBLOQUE=0; EN_PANTALLAS=0; GRUPO_N=""; GRUPO_DE=""
if [ -n "${GRUPO:-}" ]; then
  case "$GRUPO" in [1-9]/[1-9]) GRUPO_N="${GRUPO%/*}"; GRUPO_DE="${GRUPO#*/}"; [ "$GRUPO_N" -le "$GRUPO_DE" ] || { echo "GRUPO=$GRUPO: el grupo no puede pasar del total"; exit 2; } ;; *) echo "GRUPO tiene que ser así: 2/3 (el grupo 2 de 3)"; exit 2 ;; esac
fi
paso(){
  if [ "$EN_PANTALLAS" = 1 ] && [ -n "$GRUPO_N" ]; then NBLOQUE=$((NBLOQUE+1)); [ $(( (NBLOQUE-1) % GRUPO_DE + 1 )) = "$GRUPO_N" ] || return 0; fi
  local nombre="$1" reg; shift; echo; echo "── $nombre"
  # en GitHub, lo que falla se escribe además como aviso («::error::»): los avisos se pueden leer sin sesión y el registro no (21-11-2026)
  # un bloque colgado no puede dejar el trabajo entero parado: a los 15 minutos se corta y se cuenta como fallo (22-11-2026)
  if [ -n "${GITHUB_ACTIONS:-}" ]; then echo "::notice title=Empieza (${NAVEGADOR:-reglas}${GRUPO:+ $GRUPO})::$nombre"; reg="$(mktemp)"; { timeout 900 "$@"; } 2>&1 | tee "$reg"; local st=${PIPESTATUS[0]}
    if [ "$st" != 0 ]; then mal=$((mal+1)); echo "   ✗ FALLA este bloque"
      echo "::error title=Bloque que falla (${NAVEGADOR:-reglas}${GRUPO:+ $GRUPO})::$nombre — $(grep -E 'MAL|FALLA|Error|Traceback|error|Peticiones|aviso:|File "|waiting for|locator|intercepts|not visible|not stable|outside' "$reg" | tail -n 14 | cut -c1-220 | tr '\n' '|' | cut -c1-1800) /// $(sed -n '/Call log/,$p' "$reg" | head -n 14 | cut -c1-200 | tr '\n' '|' | cut -c1-1500)"; fi
    rm -f "$reg"
  else "$@" || { mal=$((mal+1)); echo "   ✗ FALLA este bloque"; }; fi; }
# el servidor de la fase 2 (el «juez»): está en el repositorio, en webs-negocios/oficios-servidor; en la copia del PC, al lado (../servidor)
JUEZ=""; for d in "$AQUI/../oficios-servidor" "$AQUI/../servidor"; do [ -f "$d/juez.mjs" ] && { JUEZ="$(cd "$d" && pwd)"; break; }; done
if [ "$QUE" != navegador ]; then
  paso "Datos de cada negocio" node "$R/valida-negocio.mjs" "$SITIO" "$SITIO/js/oficio-datos.js" "$OTRO"
  paso "El validador caza los archivos mal hechos" node "$R/prueba-valida.mjs" "$SITIO"
  paso "La base de servicios y la hoja de cada negocio" node "$R/prueba-servicios.mjs" "$SITIO"
  paso "Precios de la web: los mismos que la cita y el catálogo" node "$R/precios-web.mjs" "$SITIO"
  paso "Versión de las reglas: si cambian, cambia VERSION (y está apuntada)" node "$R/prueba-version.mjs" "$SITIO" "$AQUI/reglas.lock.json"
  paso "Reglas, con ejemplos" node "$AQUI/prueba-oficio.mjs" "$SITIO"
  paso "Reglas, con recorridos al azar" node "$R/azar.mjs" "$SITIO" --negocio "$SITIO/js/oficio-datos.js" --negocio "$OTRO" --tandas "${TANDAS:-100}" --semilla "${SEMILLA:-20261113}"
  paso "Restos del negocio de muestra en los archivos comunes" node "$R/restos.mjs" "$SITIO"
  paso "Idiomas: la cita, la zona del cliente y los papeles, en catalán y en inglés" node "$R/idiomas.mjs" "$SITIO" "$SITIO/js/oficio-datos.js" "$OTRO"
  paso "Buzón de mejoras, sin navegador" node "$R/prueba-soporte.mjs" "$SITIO"
  paso "Vigía de fallos, sin navegador" node "$R/prueba-vigia.mjs" "$SITIO"
  paso "Herramienta de copias" node "$R/prueba-copias.mjs" "$SITIO"
  if [ -d "$COPIAS" ]; then
    paso "Copias: todas al día y con datos que valen" node "$AQUI/copias.mjs" comprueba --plantilla "$SITIO" --destino "$COPIAS" --completos "$COMPLETOS"
    paso "Copias: lo de cada negocio, en catalán y en inglés" node "$R/idiomas.mjs" "$SITIO" "$COPIAS"/*/js/oficio-datos.js
    for d in "$COPIAS"/*/js/oficio-datos.js; do [ -f "$d" ] || continue; c="$(basename "$(dirname "$(dirname "$d")")")"; f="$(completos "$d")"
      if [ -n "$f" ]; then paso "Copia $c: recorridos al azar" node "$R/azar.mjs" "$SITIO" --negocio "$f" --tandas "${TANDAS_COPIA:-20}" --semilla "${SEMILLA:-20261113}"
      else echo; echo "── Copia $c: sin sus datos completos (COMPLETOS=<carpeta>), no se pasan los recorridos al azar"; fi; done
  fi
  # la demo «en uso»: el negocio de nueve semanas, hecho con las reglas, a ocho horas distintas y con sus cuentas (pruebas-uso/LISTA.md)
  [ -f "$COPIAS/ramirez-uso/js/oficio-datos.js" ] && paso "Uso real: el negocio en marcha, a ocho horas distintas y con sus cuentas" node "$R/uso-real.mjs" "$SITIO" "$COPIAS/ramirez-uso/js/oficio-datos.js"
  if [ -n "$JUEZ" ]; then
    paso "El juez (servidor), con ejemplos" env OFICIOS_SERVIDOR="$JUEZ" node "$R/prueba-juez.mjs" "$SITIO"
    paso "El juez, con varios aparatos a la vez y al azar" env OFICIOS_SERVIDOR="$JUEZ" node "$R/azar-juez.mjs" "$SITIO" --tandas "${TANDAS_JUEZ:-60}" --semilla "${SEMILLA:-20261114}"
    # el «espejo»: la parte de la app que habla con el servidor (js/oficio-espejo.js), contra ese mismo juez
    paso "El espejo (la app con servidor), con ejemplos" env OFICIOS_SERVIDOR="$JUEZ" node "$R/prueba-espejo.mjs" "$SITIO"
    paso "El espejo, con varios aparatos, red que falla y al azar" env OFICIOS_SERVIDOR="$JUEZ" node "$R/azar-espejo.mjs" "$SITIO" --tandas "${TANDAS_ESPEJO:-150}" --semilla "${SEMILLA:-20261114}"
  fi
  [ "${MUTANTES:-0}" = 1 ] && paso "Reglas estropeadas adrede" node "$R/mutantes.mjs" "$SITIO"
  [ "${MUTANTES:-0}" = 1 ] && [ -n "$JUEZ" ] && paso "Protecciones del juez quitadas adrede" env OFICIOS_SERVIDOR_ORIGEN="$JUEZ" node "$R/mutantes-juez.mjs" "$SITIO"
  [ "${MUTANTES:-0}" = 1 ] && [ -n "$JUEZ" ] && paso "Protecciones del espejo quitadas adrede" env OFICIOS_SERVIDOR="$JUEZ" node "$R/mutantes-espejo.mjs" "$SITIO"
fi
if [ "$QUE" != reglas ]; then
  EN_PANTALLAS=1
  ( cd "$SITIO" && exec python3 -m http.server 8765 >/dev/null 2>&1 ) & S1=$!
  python3 "$AQUI/pruebas-navegador/servidor_con_rangos.py" "$SITIO" 8766 >/dev/null 2>&1 & S2=$!
  sleep 1.5; cd "$AQUI/pruebas-navegador"
  echo "Motor: ${NAVEGADOR:-chromium}"
  paso "App: cliente, oficina y técnico" python3 app.py
  # la misma batería a otras horas: lo que funciona un martes por la mañana tiene que funcionar de noche, en fin de semana,
  # al cambiar de año y al cambiar la hora. Sin esto, un fallo así solo sale cuando alguien lanza las pruebas a esa hora.
  for h in ${HORAS:-2026-11-14T23:30:00+01:00 2026-12-31T23:58:30+01:00}; do paso "App a otra hora ($h)" env AHORA="$h" python3 app.py; done
  paso "Lo del 15-11: desistimiento, «Facturada», el mes para la gestoría, fincas y quién va" python3 novedades.py
  paso "Auditoría UX: «Ahora» y «Después», «Deshacer», la barra de la ficha, el tablero, los mensajes y los papeles" python3 auditoria.py
  paso "Lo del repaso del 16-11: es garantía, rebajar, corregir el cobro, el enlace en los mensajes y el plazo de la garantía" python3 repaso.py
  paso "La app en el móvil: manifiesto, iconos y abrir sin cobertura" python3 instalable.py
  paso "Web y página de los tres móviles" python3 web.py
  paso "Demo guiada: el recorrido con flechas, en el ordenador y en el móvil" python3 guia.py
  paso "Muestra de la demo" python3 muestra.py
  paso "La muestra con el nombre de un negocio: el enlace de las cartas de captación" python3 muestra_enlace.py
  paso "Zona del cliente: entrar con el teléfono y ver lo suyo" python3 cliente.py
  paso "Idiomas: la cita, la zona del cliente y los papeles, en catalán y en inglés" python3 idiomas.py
  paso "Vídeo de entrada" python3 entrada.py
  paso "Vigía de fallos: lo que ve, lo que manda y lo que guarda sin red" python3 vigia.py "$COPIAS"
  paso "Otro negocio, de principio a fin" python3 negocio.py "$OTRO"
  paso "El mismo recorrido con el negocio de muestra" python3 negocio.py "$SITIO/js/oficio-datos.js"
  # cada copia se sirve desde su propia carpeta, no desde la demo: así se ve también si le falta algún archivo
  if [ -d "$COPIAS" ]; then for d in "$COPIAS"/*/js/oficio-datos.js; do [ -f "$d" ] || continue; c="$(dirname "$(dirname "$d")")"; f="$(completos "$d")"
    ( cd "$c" && exec python3 -m http.server 8767 >/dev/null 2>&1 ) & S3=$!; sleep 1
    # sin servidor, con sus datos completos (los del archivo público solo valen con servidor)
    if [ -n "$f" ]; then paso "Copia $(basename "$c"), de principio a fin y servida desde su carpeta" python3 negocio.py "$f" 8767
    else echo; echo "── Copia $(basename "$c"): sin sus datos completos (COMPLETOS=<carpeta>), no se recorre sin servidor"; fi
    paso "Copia $(basename "$c"): la zona del cliente" python3 cliente.py 8767 --copia
    kill $S3 2>/dev/null; wait $S3 2>/dev/null
    # si la copia va con servidor, además se prueba así: desde su carpeta, contra un servidor local (nunca contra el de verdad)
    # que tiene sus datos completos, mientras el navegador baja su archivo público, como pasa de verdad
    if [ -n "$JUEZ" ] && grep -q "servidor" "$d" && [ -n "$f" ]; then
      if [ "$f" = "$d" ]; then OFICIOS_SERVIDOR="$JUEZ" node "$AQUI/pruebas-navegador/servidor_local.mjs" "$c" 8768 >/dev/null 2>&1 & S4=$!
      else OFICIOS_SERVIDOR="$JUEZ" node "$AQUI/pruebas-navegador/servidor_local.mjs" "$c" 8768 --completos "$f" >/dev/null 2>&1 & S4=$!; fi; sleep 1.5
      paso "Copia $(basename "$c") con servidor: oficina, técnicos y cliente, cada uno en su navegador" python3 servidor.py 8768
      kill $S4 2>/dev/null; wait $S4 2>/dev/null
    fi
  done; fi
  # la demo «en uso», en el navegador: cada pantalla con nueve semanas de datos, y cada persona haciendo su trabajo
  if [ -f "$COPIAS/ramirez-uso/js/oficio-datos.js" ]; then
    ( cd "$COPIAS/ramirez-uso" && exec python3 -m http.server 8769 >/dev/null 2>&1 ) & S5=$!; sleep 1
    paso "Uso real en el navegador: la demo en uso, pantalla a pantalla" python3 uso.py 8769
    kill $S5 2>/dev/null; wait $S5 2>/dev/null
  fi
  # el modo servidor con los archivos de la plantilla y los datos del otro negocio, contra un servidor local con el mismo juez
  if [ -n "$JUEZ" ]; then
    OFICIOS_SERVIDOR="$JUEZ" node "$AQUI/pruebas-navegador/servidor_local.mjs" "$SITIO" 8768 --datos "$OTRO" >/dev/null 2>&1 & S4=$!; sleep 1.5
    paso "Modo servidor: oficina, técnicos y cliente, cada uno en su navegador" python3 servidor.py 8768
    kill $S4 2>/dev/null; wait $S4 2>/dev/null
  fi
  # una copia de verdad (sin «prueba», con servidor y sin él) no enseña nada de la demo: ni «muestra», ni el código compartido
  paso "Copia de verdad: nada de la demo" python3 real.py
  paso "Horarios, turnos y ausencias en pantalla" python3 horarios.py
  paso "Mapa: la posición del técnico de camino" python3 mapa.py "$OTRO"
  paso "Mejoras: pedir, ver la respuesta y quedarse sin conexión" python3 soporte.py "$OTRO"
  kill $S1 $S2 2>/dev/null
fi
echo; if [ $mal = 0 ]; then echo "TODO BIEN"; else echo "FALLAN $mal BLOQUES"; fi
exit $mal
