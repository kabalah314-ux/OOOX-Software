#!/usr/bin/env bash
# Pasa todas las pruebas de la app de oficios y dice qué bloque falla.
# Uso:  bash pruebas.sh [reglas|navegador|todo]
#   SITIO=<carpeta del sitio>   por defecto, la demo publicada en este repositorio
#   NAVEGADOR=chromium|firefox|webkit   motor para las pruebas de pantallas (por defecto, chromium)
#   TANDAS=100  SEMILLA=20261113   tamaño y semilla de los recorridos al azar
#   MUTANTES=1  añade la prueba de «reglas estropeadas adrede» (tarda varios minutos)
set -u
AQUI="$(cd "$(dirname "$0")" && pwd)"
SITIO="$(cd "${SITIO:-$AQUI/../../frontend/public/demos/ramirez-24h}" && pwd)"
QUE="${1:-todo}"; mal=0; R="$AQUI/pruebas-reglas"; OTRO="$R/negocios/voltio.js"
paso(){ echo; echo "── $1"; shift; "$@" || { mal=$((mal+1)); echo "   ✗ FALLA este bloque"; }; }
if [ "$QUE" != navegador ]; then
  paso "Datos de cada negocio" node "$R/valida-negocio.mjs" "$SITIO" "$SITIO/js/oficio-datos.js" "$OTRO"
  paso "El validador caza los archivos mal hechos" node "$R/prueba-valida.mjs" "$SITIO"
  paso "Reglas, con ejemplos" node "$AQUI/prueba-oficio.mjs" "$SITIO"
  paso "Reglas, con recorridos al azar" node "$R/azar.mjs" "$SITIO" --negocio "$SITIO/js/oficio-datos.js" --negocio "$OTRO" --tandas "${TANDAS:-100}" --semilla "${SEMILLA:-20261113}"
  paso "Restos del negocio de muestra en los archivos comunes" node "$R/restos.mjs" "$SITIO"
  [ "${MUTANTES:-0}" = 1 ] && paso "Reglas estropeadas adrede" node "$R/mutantes.mjs" "$SITIO"
fi
if [ "$QUE" != reglas ]; then
  ( cd "$SITIO" && exec python3 -m http.server 8765 >/dev/null 2>&1 ) & S1=$!
  python3 "$AQUI/pruebas-navegador/servidor_con_rangos.py" "$SITIO" 8766 >/dev/null 2>&1 & S2=$!
  sleep 1.5; cd "$AQUI/pruebas-navegador"
  echo "Motor: ${NAVEGADOR:-chromium}"
  paso "App: cliente, oficina y técnico" python3 app.py
  paso "Web y página de los tres móviles" python3 web.py
  paso "Muestra de la demo" python3 muestra.py
  paso "Vídeo de entrada" python3 entrada.py
  paso "Otro negocio, de principio a fin" python3 negocio.py "$OTRO"
  paso "El mismo recorrido con el negocio de muestra" python3 negocio.py "$SITIO/js/oficio-datos.js"
  kill $S1 $S2 2>/dev/null
fi
echo; if [ $mal = 0 ]; then echo "TODO BIEN"; else echo "FALLAN $mal BLOQUES"; fi
exit $mal
