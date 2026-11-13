#!/usr/bin/env bash
# Pasa todas las pruebas de la app de oficios y dice qué bloque falla.
# Uso:  bash pruebas.sh [reglas|navegador|todo]
#   SITIO=<carpeta del sitio>   por defecto, la demo publicada en este repositorio
#   NAVEGADOR=chromium|firefox|webkit   motor para las pruebas de pantallas (por defecto, chromium)
#   TANDAS=100  SEMILLA=20261113   tamaño y semilla de los recorridos al azar
#   MUTANTES=1  añade la prueba de «reglas estropeadas adrede» (tarda unos minutos; en GitHub corre siempre)
#   COPIAS=<carpeta de las copias>   por defecto, frontend/public/oficios; cada copia pasa sus propias pruebas
#   AHORA=2026-11-17T10:30:00+01:00   la hora fija de las pruebas de pantallas (por defecto, un martes laborable a media mañana)
#   HORAS="..."  otras horas a las que se repite la batería de la app (por defecto, un sábado de noche y el cruce de fin de año)
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
# la carpeta del sitio: la del repositorio o, en la copia del PC, la que está al lado (../site)
if [ -z "${SITIO:-}" ]; then for d in "$AQUI/../../frontend/public/demos/ramirez-24h" "$AQUI/../site"; do [ -d "$d" ] && { SITIO="$d"; break; }; done; fi
[ -d "${SITIO:-}" ] || { echo "No encuentro la carpeta del sitio. Pásala así: SITIO=<carpeta> bash pruebas.sh"; exit 2; }
SITIO="$(cd "$SITIO" && pwd)"
QUE="${1:-todo}"; mal=0; R="$AQUI/pruebas-reglas"; OTRO="$R/negocios/voltio.js"
# las copias de la app hechas para cada negocio (ver copias.mjs): en el repositorio o, en la copia del PC, en la carpeta de al lado (../oficios)
if [ -z "${COPIAS:-}" ]; then if [ -d "$AQUI/../../frontend/public" ]; then COPIAS="$AQUI/../../frontend/public/oficios"; else COPIAS="$AQUI/../oficios"; fi; fi
paso(){ echo; echo "── $1"; shift; "$@" || { mal=$((mal+1)); echo "   ✗ FALLA este bloque"; }; }
if [ "$QUE" != navegador ]; then
  paso "Datos de cada negocio" node "$R/valida-negocio.mjs" "$SITIO" "$SITIO/js/oficio-datos.js" "$OTRO"
  paso "El validador caza los archivos mal hechos" node "$R/prueba-valida.mjs" "$SITIO"
  paso "Reglas, con ejemplos" node "$AQUI/prueba-oficio.mjs" "$SITIO"
  paso "Reglas, con recorridos al azar" node "$R/azar.mjs" "$SITIO" --negocio "$SITIO/js/oficio-datos.js" --negocio "$OTRO" --tandas "${TANDAS:-100}" --semilla "${SEMILLA:-20261113}"
  paso "Restos del negocio de muestra en los archivos comunes" node "$R/restos.mjs" "$SITIO"
  paso "Buzón de mejoras, sin navegador" node "$R/prueba-soporte.mjs" "$SITIO"
  paso "Herramienta de copias" node "$R/prueba-copias.mjs" "$SITIO"
  if [ -d "$COPIAS" ]; then
    paso "Copias: todas al día y con datos que valen" node "$AQUI/copias.mjs" comprueba --plantilla "$SITIO" --destino "$COPIAS"
    for d in "$COPIAS"/*/js/oficio-datos.js; do [ -f "$d" ] && paso "Copia $(basename "$(dirname "$(dirname "$d")")"): recorridos al azar" node "$R/azar.mjs" "$SITIO" --negocio "$d" --tandas "${TANDAS_COPIA:-20}" --semilla "${SEMILLA:-20261113}"; done
  fi
  [ "${MUTANTES:-0}" = 1 ] && paso "Reglas estropeadas adrede" node "$R/mutantes.mjs" "$SITIO"
fi
if [ "$QUE" != reglas ]; then
  ( cd "$SITIO" && exec python3 -m http.server 8765 >/dev/null 2>&1 ) & S1=$!
  python3 "$AQUI/pruebas-navegador/servidor_con_rangos.py" "$SITIO" 8766 >/dev/null 2>&1 & S2=$!
  sleep 1.5; cd "$AQUI/pruebas-navegador"
  echo "Motor: ${NAVEGADOR:-chromium}"
  paso "App: cliente, oficina y técnico" python3 app.py
  # la misma batería a otras horas: lo que funciona un martes por la mañana tiene que funcionar de noche, en fin de semana,
  # al cambiar de año y al cambiar la hora. Sin esto, un fallo así solo sale cuando alguien lanza las pruebas a esa hora.
  for h in ${HORAS:-2026-11-14T23:30:00+01:00 2026-12-31T23:58:30+01:00}; do paso "App a otra hora ($h)" env AHORA="$h" python3 app.py; done
  paso "Web y página de los tres móviles" python3 web.py
  paso "Muestra de la demo" python3 muestra.py
  paso "Vídeo de entrada" python3 entrada.py
  paso "Otro negocio, de principio a fin" python3 negocio.py "$OTRO"
  paso "El mismo recorrido con el negocio de muestra" python3 negocio.py "$SITIO/js/oficio-datos.js"
  # cada copia se sirve desde su propia carpeta, no desde la demo: así se ve también si le falta algún archivo
  if [ -d "$COPIAS" ]; then for d in "$COPIAS"/*/js/oficio-datos.js; do [ -f "$d" ] || continue; c="$(dirname "$(dirname "$d")")"
    ( cd "$c" && exec python3 -m http.server 8767 >/dev/null 2>&1 ) & S3=$!; sleep 1
    paso "Copia $(basename "$c"), de principio a fin y servida desde su carpeta" python3 negocio.py "$d" 8767
    kill $S3 2>/dev/null; wait $S3 2>/dev/null
  done; fi
  paso "Horarios, turnos y ausencias en pantalla" python3 horarios.py
  paso "Mapa: la posición del técnico de camino" python3 mapa.py "$OTRO"
  paso "Mejoras: pedir, ver la respuesta y quedarse sin conexión" python3 soporte.py "$OTRO"
  kill $S1 $S2 2>/dev/null
fi
echo; if [ $mal = 0 ]; then echo "TODO BIEN"; else echo "FALLAN $mal BLOQUES"; fi
exit $mal
