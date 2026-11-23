# La base de servicios de OOOX Oficios

`servicios.mjs` es la lista de trabajos concretos de cada oficio (hoy, fontanería y electricidad): lo que incluye cada
uno, una propuesta de lo que tarda y lo que se suele cobrar en el mercado, con la página de donde sale.

Para qué sirve:

- **Para dar de alta un negocio.** El dueño rellena la hoja de servicios, precios y tiempos
  (https://claude.ai/artifact/MXymNY6J1yRz3XwshEKqne): marca los servicios que hace y pone su precio y lo que tarda.
  Con eso se escribe el catálogo de su archivo de datos.
- **En el catálogo del negocio**, cada servicio lleva `base` (el `id` de esta lista) y `dur` (lo que tarda, `[normal,
  máximo]` en minutos por unidad). La app suma lo que tardan las líneas de un presupuesto para saber lo que dura cada
  trabajo y en cuánto puede llegar cada técnico a una urgencia.
- **El validador** (`demos/pruebas-reglas/valida-negocio.mjs`) comprueba que cada `base` existe aquí, y avisa si a un
  servicio le falta lo que tarda o si su precio queda muy lejos de lo que se suele cobrar.

Los tiempos son una propuesta de partida: los confirma o los cambia cada dueño. Los precios de mercado son una
orientación para comparar (unas fuentes los dan con IVA y otras sin él), nunca el precio de un negocio.

Para añadir un oficio: una entrada más en `OFICIOS`, con su lista de servicios. Los `id` no se cambian una vez usados.
