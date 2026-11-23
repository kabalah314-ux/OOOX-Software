# Datos completos de las copias de prueba

Una copia con servidor lleva en su archivo de datos (`js/oficio-datos.js`) solo la parte **pública**: ese archivo lo
baja cualquiera que abra la cita. Del equipo lleva el nombre, la inicial del apellido y el color. Lo demás (apellidos,
horarios, quién es el jefe o hace guardias, su furgoneta) está en el servidor y en el archivo de sus **datos completos**.

Aquí están los datos completos de las copias **de prueba**, que son inventados: hoy, `voltio.js`. Las herramientas los
buscan aquí por el `id` de la copia (`<id>.js`):

- `copias.mjs publica <id>` rehace el archivo público de la copia con ellos.
- `copias.mjs alta <id>` y `subir-datos <id>` los suben al servidor, después de mirar que cuadran con el archivo público.
- `copias.mjs actualizar` y `pruebas.sh` pasan con ellos los recorridos al azar, la app sin servidor y la app contra el
  servidor local.

**Los datos completos de un negocio de verdad no van nunca aquí ni en ningún otro sitio del repositorio, que es
público.** Se guardan en la carpeta privada del PC (`OOOX\02-Business\webs-negocios\privado\<id>.js`) y en el servidor.
Para usarlos con las herramientas: `--datos <archivo>`, `--completos <carpeta>` o `OFICIOS_COMPLETOS=<carpeta>`.
