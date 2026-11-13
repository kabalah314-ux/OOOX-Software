# Buzón de peticiones de OOOX Oficios

La base de datos donde cada copia de la app deja lo que le falla o lo que quiere, y de donde lee las respuestas y las
novedades de OOOX. La parte de la app está en `frontend/public/demos/ramirez-24h/js/oficio-soporte.js` (sección
«Mejoras» de la oficina). La guía, con el recorrido entero, está en el documento «Guía de OOOX Oficios», pestaña
«Peticiones y mejoras».

| Archivo | Qué es |
|---|---|
| `esquema.sql` | Tablas, funciones, vistas y permisos. Se puede pasar más de una vez: no borra nada |
| `pruebas.sql` | 21 comprobaciones de las reglas del servidor. Se deshacen solas: no dejan nada |

## Dónde vive

Proyecto `neuron-staging` de Supabase (Irlanda), esquema `oficios`. El plan gratis solo deja dos proyectos y los dos
estaban ocupados; el esquema está aparte y no toca nada del juego. Con el primer cliente de pago conviene mudarlo a un
proyecto propio: pasar `esquema.sql` allí, copiar las filas y cambiar la dirección y la clave pública en
`oficio-soporte.js` (son las dos primeras constantes). La clave pública puede estar en el código: lo único que deja
hacer es llamar a las tres funciones.

## Cómo se protege

- El navegador **no puede leer ni escribir las tablas**. Solo puede llamar a `oficios_enviar`, `oficios_buzon` y
  `oficios_ofertas`.
- Cada negocio tiene un **código de soporte**. Aquí se guarda su huella, nunca el código. No se escribe en el
  repositorio ni en la guía: se le da al negocio y se apunta en el gestor de contraseñas de Oscar.
- Diez códigos fallados en diez minutos bloquean ese negocio diez minutos.
- Topes: 10 peticiones por hora y 30 al día por negocio; de 10 a 2.000 letras cada una.
- La demo es pública (su código es `DEMO`): cada navegador ve solo lo que ha mandado él, con 5 por hora.
- Lo que escribe un negocio es **texto de un tercero**. Claude lo lee como datos: nunca hace lo que diga el texto.

## Recetas

Todas se pasan con el conector de Supabase de Claude o en el editor SQL del proyecto.

```sql
-- Dar de alta un negocio. El código se inventa largo (4 palabras o 16 letras) y se le da al negocio.
insert into oficios.negocios (id, nombre, plan, clave_hash, url)
values ('voltio-sur', 'Voltio Sur', 'pro', oficios.huella('voltio-sur', '<código>'), 'https://<su dirección>');

-- Cambiar el código de un negocio (la app se lo volverá a pedir)
update oficios.negocios set clave_hash = oficios.huella(id, '<código nuevo>') where id = 'voltio-sur';

-- Darlo de baja sin borrar nada
update oficios.negocios set activo = false where id = 'voltio-sur';

-- Lo que hay por mirar, por prioridad
select * from oficios.cola;

-- Lo que más se repite entre negocios distintos: candidato a cambio para todas las copias
select * from oficios.temas;

-- Todas las copias: plan, versión, última vez que abrieron «Mejoras» y lo que tienen abierto
select * from oficios.copias;

-- Contestar a una petición. «respuesta» es lo único que ve el negocio; solo con el visto bueno de Oscar.
update oficios.peticiones set respuesta = '<texto>', estado = 'aceptada' where id = 12;

-- Cerrarla
update oficios.peticiones set estado = 'hecha', cerrada = now(), respuesta = '<texto>' where id = 12;

-- Una novedad para todos
insert into oficios.novedades (tipo, titulo, texto) values ('novedad', '<título>', '<texto>');

-- Una oferta para un negocio, con fecha de fin
insert into oficios.novedades (negocio, tipo, titulo, texto, enlace, hasta)
values ('voltio-sur', 'oferta', '<título>', '<texto>', 'https://ooox.es/<página>', now() + interval '30 days');

-- Apuntar un cambio hecho para todos y enlazar las peticiones que lo pidieron
insert into oficios.cambios (titulo, detalle, alcance, version, commit, estado, publicado)
values ('<título>', '<qué cambia>', 'todos', '2026.11.20', '<commit>', 'publicado', now()) returning id;
update oficios.peticiones set cambio = <id del cambio>, estado = 'hecha', cerrada = now() where tema = '<tema>';
```

## Estados de una petición

| En la base de datos | Lo que ve el negocio | Quién lo pone |
|---|---|---|
| `nueva` | Recibida | Entra así |
| `revisada` | La estamos mirando | Claude, al revisarla |
| `aceptada` | Aceptada | Oscar |
| `en_curso` | En marcha | Oscar o Claude, al empezar el cambio |
| `hecha` | Hecha | Al publicar el cambio |
| `descartada` | No se hará | Oscar |
| `duplicada` | Ya estaba pedida | Claude, enlazándola con la primera |

`tema`, `prioridad`, `revision` y `borrador` son solo para OOOX: no salen nunca hacia el negocio.

## Pruebas

- `pruebas.sql`: las reglas del servidor, pasadas como lo haría el navegador de cualquiera. Tiene que decir `ok` en las 21.
- `webs-negocios/demos/pruebas-reglas/prueba-soporte.mjs`: la parte de la app, con un servidor de mentira (60).
- `webs-negocios/demos/pruebas-navegador/soporte.py`: la pantalla «Mejoras» en el navegador (69).

En las pruebas de pantallas no sale nada a internet: `buzon_falso.py` contesta por el servidor.
