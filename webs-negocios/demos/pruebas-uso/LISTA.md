# Pruebas de uso real

La app ya está vendida y en marcha: Ramírez 24 h, nueve semanas después de empezar. Esta lista dice qué se prueba,
qué tiene que pasar para dar cada prueba por buena y cómo se comprueba.

## El método

1. **Un negocio en marcha, hecho con las reglas de verdad.** Los datos no se escriben a mano. Un programa hace, día a
   día, lo que haría el negocio: entran urgencias y citas, la oficina reparte, los técnicos van, firman, terminan y
   cobran, se facturan los trabajos, se venden contratos, alguien falta. Cada paso pasa por las mismas reglas que la
   app. Si las reglas rechazan un paso, la prueba falla.
2. **Hoy está a medias, como un día de verdad.** Hay trabajos hechos esta mañana, uno en marcha, uno de camino, una
   urgencia recién entrada y citas para hoy y los próximos días. Todo se calcula desde la hora a la que se abre.
3. **Tres niveles de prueba:**
   - **Reglas, sin pantalla** (`uso-real.mjs`): el negocio a ocho horas y días distintos y lo que tiene que cuadrar.
   - **Pantallas, en el navegador** (`uso.py`): cada pantalla con nueve semanas de datos, y cada persona tocando
     los botones de su trabajo.
   - **Lo que ya había:** los ejemplos de las reglas, las reglas estropeadas, los recorridos al azar, el servidor y
     los tres navegadores (Chromium, Firefox y WebKit, el de Safari).
4. **Cada prueba dice qué tiene que cumplir.** Si no lo cumple, se mira por qué: un fallo de la app, de la prueba o
   de lo que se esperaba. Se arregla y la prueba se queda, para que no vuelva a pasar.
5. **Lo que se puede mejorar se apunta** al final, aunque no sea un fallo.

## Los flujos: días de trabajo inventados

| Flujo | Qué pasa |
|---|---|
| F1. Un martes normal | Diez a catorce trabajos entre tres técnicos: citas por la mañana y por la tarde y dos urgencias |
| F2. La urgencia de las 13:00 | Entra una fuga con los tres ocupados: quién llega antes y en cuánto |
| F3. Sábado por la noche | Una fuga con el técnico de guardia: tarifa de urgencia y suplemento |
| F4. No hay nadie en casa | El técnico llega y no abre nadie: se queda para otra cita |
| F5. El presupuesto que no se acepta | Se cobra solo la visita |
| F6. El trabajo que crece | Hace falta más: firma nueva, y el IVA puede pasar al 21 % |
| F7. La cita con un extra | Un termo nuevo pedido con cita: derecho a desistir y «Quiero que lo hagáis ya» |
| F8. Falta una pieza | Se apunta y sale en el material del día; vuelta otro día |
| F9. El que paga después | Pago pendiente, recordatorio y cobro días después |
| F10. La semana de facturas | Lo que falta por facturar y el aviso de lo que lleva una semana |
| F11. El cliente que vuelve | Aviso nuevo dentro de la garantía |
| F12. El contrato de mantenimiento | Alta en casa del cliente, urgencia sin suplemento, revisión y renovación |
| F13. Un técnico de baja | Sus citas se quedan sin técnico; las que no caben en otro, sobran |
| F14. El día lleno | Las citas según lo que tarda cada trabajo y la reserva para urgencias |
| F15. Fin de turno | No se ofrece una urgencia que acabaría fuera de su hora |
| F16. Fin de mes | Cobros del mes, urgencias con suplemento y la parte de OOOX |
| F17. Tres móviles a la vez | Lo que hace uno lo ven los demás |
| F18. Sin cobertura | El técnico sigue trabajando y se envía al volver la señal |
| F19. Datos malos | Teléfono mal, código postal fuera de zona, texto raro, foto grande |
| F20. Permisos | El técnico no ve las cifras; el cliente solo ve lo suyo |

## La lista

«Cómo»: **R** = `uso-real.mjs` (reglas), **P** = `uso.py` (pantallas), **Antes** = una prueba que ya había,
**A mano** = Oscar con el iPhone.

| Nº | Flujo | Qué se prueba | Se da por buena si… | Cómo | Resultado |
|---|---|---|---|---|---|
| U01 | Todos | El negocio de nueve semanas, a ocho horas distintas: lunes 7:50, martes 10:30, miércoles 13:45, viernes 19:30, sábado 11:00, domingo 22:00, un festivo y el día del cambio de hora | Ningún paso rechazado por las reglas, y entre 300 y 700 avisos | R | Bien (arreglado el fallo 1) |
| U02 | Todos | El mismo día y la misma hora dan los mismos datos | Los dos resultados son iguales letra por letra | R | Bien |
| U03 | Todos | Lo que ocupa en el navegador y lo que tarda en hacerse | Menos de 2,5 MB y menos de 3 segundos | R | Bien: 1,7 s y 1,1 MB |
| U04 | F1 | Cada trabajo terminado está completo | Tiene total, forma de pago y firma; y los tiempos van en orden: se pide, se va, se empieza, se termina | R | Bien |
| U05 | F1 | Las citas del pasado | Ninguna cita de antes de hoy sigue sin hacer, sin cerrar o sin técnico | R | Bien |
| U06 | F9 | Lo que queda por cobrar | La cifra de la app es la de los trabajos terminados sin cobrar, y hay alguno | R | Bien |
| U07 | F10 | Lo que falta por facturar | Son los terminados con importe y sin factura; hay alguno de hace más de una semana y sale el aviso | R, P | Bien |
| U08 | F1 | La caja de hoy | Es la suma de lo cobrado hoy, por forma de pago | R, P | Bien |
| U09 | F1 | Los mensajes al cliente | No hay mensajes sin mandar de hace más de dos días | R | Bien |
| U10 | F1 | El trabajo de cada técnico | Los tres tienen trabajos y ninguno se lleva más de la mitad | R | Bien |
| U11 | F2 | Una urgencia ahora, en horas de trabajo | Hay alguien para ir y llega en menos de dos horas | R | Bien |
| U12 | F14 | Las citas de hoy y de los próximos días | En el plan de cada técnico, ninguna llega tarde a su franja | R | Bien |
| U13 | F13 | Las citas que sobran | Solo las del técnico de baja que no caben en otro, y la oficina las ve | R, P | Bien (arreglado el fallo 2) |
| U14 | F11 | El cliente que vuelve | Su aviso nuevo sale «en garantía» | R | Bien |
| U15 | F12 | Los contratos | Hay contratos activos, alguno por renovar, revisiones pendientes y alguna cuota por cobrar | R, P | Bien |
| U16 | F12 | Urgencia de un cliente con contrato | Va sin suplemento y sin desplazamiento | R, Antes | Bien |
| U17 | F16 | Las urgencias del mes | Los suplementos cobrados sin IVA y el 10 % de OOOX cuadran | R | Bien |
| U18 | Todos | Seguir trabajando sobre los datos vivos | 400 pasos más (avisos nuevos, trabajos, cobros) sin ningún rechazo inesperado | R | Bien |
| U19 | F6 | El IVA | Con material de más del 40 %, el trabajo pasa al 21 % y la app avisa | Antes | Bien |
| U20 | F6 | La ampliación | Si el total pasa de lo firmado, pide una firma nueva | Antes | Bien |
| U21 | F7 | El desistimiento | Con cita y algo «extra», sin «Quiero que lo hagáis ya» no se empieza | Antes | Bien |
| U22 | F5 | El presupuesto no aceptado | Se cobra solo el desplazamiento | R | Bien |
| U23 | F4 | No había nadie | Se apunta, el mensaje para el cliente sale escrito y la cita se puede mover | R | Bien (arreglada la prueba, 9) |
| U24 | F8 | El material que falta | Sale en el material del día de ese técnico | R, P | Bien |
| U25 | F13 | La ausencia | Sus citas se quedan sin técnico | R, Antes | Bien |
| U26 | F14 | Las citas por tiempo | En tres horas caben tres grifos o dos termos por técnico | Antes | Bien |
| U27 | F14 | La reserva para urgencias | El cliente ya no ve la franja; la oficina sí puede usarla | Antes | Bien |
| U28 | F2 | La urgencia a quien tiene una cita después | Puede ir si aún llega a su cita dentro de la franja | Antes | Bien |
| U29 | F15 | Fin de turno | No se ofrece una urgencia que acabaría fuera de su hora, salvo de guardia | Antes | Bien |
| U30 | F3 | De noche | Tarifa de urgencia y suplemento; con guardia hay tiempo de llegada, sin guardia no | Antes | Bien |
| U31 | Todos | Abrir la app de la oficina | Con nueve semanas de datos abre en menos de 5 segundos la primera vez y en menos de 2 después, sin errores | P | Bien |
| U32 | F2 | La bandeja | Arriba, la urgencia sin repartir con quién llegaría antes; los técnicos, con la hora a la que quedan libres | P | Bien (arreglado el fallo 4) |
| U33 | F2 | Repartir la urgencia | En «¿Quién va?», el que antes llega va el primero, y dársela funciona | P | Bien |
| U34 | F1 | La agenda | Los próximos días tienen citas, cada una con su técnico o «sin asignar» | P | Bien |
| U35 | F1 | El tablero del día | Una fila por técnico, y cada cita de hoy con técnico sale en su fila | P | Bien |
| U36 | F16 | Cobros | Lo pendiente y la caja de hoy cuadran con los datos, y salen las urgencias del mes | P | Bien |
| U37 | F12 | Contratos | Salen los de renovar, los de revisión y las cuotas | P | Bien (arreglado el fallo 5) |
| U38 | F1 | El parte de un trabajo | Abre y su total es el del trabajo | P | Bien (arreglado el fallo 3) |
| U39 | F1 | El técnico | En «Hoy» salen sus trabajos; terminar el de ahora funciona y pasa a «Hechos» | P | Bien |
| U40 | F14 | El cliente pide cita | En los próximos días hay franjas para su avería; elige, deja sus datos y la cita sale en la agenda de la oficina | P | Bien (arreglada la prueba, 10) |
| U41 | F1 | La zona del cliente | Enseña el estado de su aviso y sus papeles | P | Bien |
| U42 | Todos | Volver a abrir | Los datos siguen ahí y no se rehacen | P | Bien |
| U43 | Todos | Móvil y ordenador | En 390 y en 1280 píxeles de ancho, ninguna pantalla se sale por los lados | P | Bien |
| U44 | Todos | Firefox y Safari | Todo igual que en Chrome | Antes (en GitHub) | Bien: todas las pruebas de pantallas, también en Firefox y en WebKit (el motor de Safari), en GitHub |
| U45 | Todos | Las reglas, caso a caso | Los 457 ejemplos pasan | Antes | Bien: 458 |
| U46 | Todos | Las reglas estropeadas a propósito | Las pruebas cazan las 230 | Antes | Bien: 232 de 232 |
| U47 | Todos | Los recorridos al azar | 140 000 pasos sin romper ninguna ley | Antes | Bien: 140 000 pasos, y 14 000 más con el negocio en uso |
| U48 | F17 | El servidor | El juez y el espejo pasan sus ejemplos y sus recorridos al azar | Antes | Bien |
| U49 | F17 | Tres móviles a la vez, con servidor | Lo que hace uno lo ven los otros | Antes | Bien |
| U50 | F18 | Sin cobertura | Lo hecho se guarda y se manda al volver la señal | Antes | Bien |
| U51 | F20 | Los permisos | El técnico no ve las cifras ni lo de otro técnico; el cliente solo ve lo suyo | Antes | Bien |
| U52 | F19 | Datos malos | Se rechazan con un mensaje claro y no rompen nada | Antes | Bien |
| U53 | Todos | Instalar la app en el iPhone | Se instala desde el enlace y abre como una app | A mano | Por probar (Oscar) |
| U54 | F1 | Firmar con el dedo | La firma sale en el presupuesto y en el parte | A mano | Por probar (Oscar) |
| U55 | F1 | El WhatsApp ya escrito | Se abre con el texto y el número del cliente | A mano | Por probar (Oscar) |
| U56 | F17 | Voltio con códigos | Entra con su código y ve lo mismo en dos móviles | A mano | Por probar (Oscar) |
| U57 | F2 | Quién está libre, arriba de la bandeja | Quien falta hoy sale «hoy no está»; de noche, quien no hace guardias sale «fuera de horario»; ninguno de los dos sale «libre» | P | Bien (arreglado el fallo 6) |

## Lo que se ha visto y las mejoras

### Fallos de la app, ya arreglados

1. **Dar o mover una cita ya pedida (citas por tiempo).** Al mirar si cabía en el día de un técnico, se ponía la
   última de su franja. Pero en su día va por la hora a la que se pidió, así que podía dejar tarde a otras. Ahora se
   mira en su sitio. Lo encontró el negocio en uso: la oficina no podía dar una cita que sí cabía. Con un ejemplo nuevo
   y dos reglas estropeadas que las pruebas cazan.
2. **Cambiar de franja una cita que ya tiene técnico (citas por tiempo).** Para saber si aún le cabía, se comparaba
   su día con la cita ya dentro, y no se veía que dejaba tarde a las demás. En el negocio en uso salió un lunes con
   Jordi llegando tarde a una cisterna. Ahora se compara con su día sin ella y, si no cabe, la cita se queda sin
   técnico para que la oficina la dé a otro. Con un ejemplo nuevo y una regla estropeada.
3. **El recorrido de un aviso.** En una cita pedida días antes salía «Recibido 13:11» después de «De camino 09:23»:
   solo se veía la hora. Ahora, si un paso fue otro día, sale también el día («lun 16, 13:11»).
4. **Quién llega antes a una urgencia, en la bandeja.** En el móvil no se veía: iba al final de una línea que se
   corta. Ahora va en una línea aparte, en amarillo.
5. **Avisos repetidos.** El de contratos y el de facturas salían en la bandeja, en la agenda y en el equipo. Ahora
   salen en la bandeja; en la agenda y en el equipo, solo lo que toca al reparto.
6. **Quién está libre, arriba de la bandeja.** Al abrir la demo publicada un domingo por la tarde, la tira de
   técnicos decía «libre» de los tres. Ahí es verdad, porque los tres hacen guardias, pero con un técnico de baja pasa
   lo mismo: decía «Laia, libre» mientras la línea de la urgencia, bien, no la proponía. Ahora quien falta hoy sale
   «hoy no está» y quien no trabaja a esa hora y no hace guardias, «fuera de horario», con el borde de puntos. Con una
   prueba nueva (U57), que falla con la tira de antes.

### Fallos de las pruebas, ya arreglados

7. Dos leyes de los recorridos al azar daban por hecho que la reserva para urgencias cuenta citas. Con citas por
   tiempo se guardan técnicos enteros. Ahora cada ley mira lo suyo.
8. La prueba de la zona del cliente en las copias daba por hecho que una copia sin servidor no tiene zona. La copia
   «en uso» trae su muestra y funciona como la demo: ahora se prueba como la demo.
9. El generador del negocio dejaba el mensaje «No había nadie» sin mandar, y al dar otra cita la app lo quitaba (a
   propósito: lo sustituye el de la cita nueva). Ahora se manda al momento, como haría la oficina.
10. La prueba de pedir cita daba por hecho que mañana siempre hay hueco para el cliente. Mañana falta Laia y se guarda
    un técnico para urgencias, así que el cliente no ve ninguna franja (la oficina sí). Ahora busca el primer día con
    hueco. Ver la mejora M8.

### Mejoras apuntadas, para decidir

- **M1. La bandeja, más corta.** Enseña también las citas sin técnico de los próximos días (unas 16 «por atender»
  en la demo), y la oficina las reparte la tarde antes. Propuesta: en la bandeja, las urgencias y las citas de hoy y mañana;
  el resto, en la agenda.
- **M2. La revisión del contrato, a su tiempo.** Un contrato recién vendido ya pide «revisión sin cita» el primer día
  (en la demo, entre 15 y 26 según el día). Propuesta: pedirla a partir de un mes antes de la fecha que toque, por ejemplo a los once meses del
  alta, o la que diga el negocio. Lo decide Oscar.
- **M3. Las visitas sin nadie, en el tablero.** No se pintan, y ese rato no se ve. Propuesta: pintarlas en gris, como
  lo hecho.
- **M4. Un mensaje que se va a perder.** Si la oficina da otra cita antes de mandar «No había nadie», ese mensaje se
  quita. Propuesta: avisar antes de que se pierda.
- **M5. La reserva con pocos técnicos (hecho).** Con citas por tiempo, la reserva guarda técnicos enteros: en una
  franja donde solo trabaja uno y se guarda uno, el cliente no puede pedir cita. Ahora el validador lo avisa al dar
  de alta el negocio.
- **M6. Años de datos.** Con nueve semanas, la demo ocupa 1,1 MB en el navegador y tarda 1,5 segundos en hacerse la
  primera vez. Con años de trabajo, cada móvil no puede guardarlo todo: para un negocio de verdad va el servidor (ya
  está) y el móvil solo guarda lo reciente.
- **M7. Crear una copia de demo.** `copias.mjs nueva` saca un código de soporte y la orden para el servidor también
  cuando la copia es una demo sin servidor. No hace falta: se puede quitar en ese caso.
- **M8. La reserva cuando falta alguien.** El día siguiente, con Laia de médico, trabajan dos, se guarda uno para
  urgencias y las citas ya pedidas llenan al otro: el cliente no puede pedir ninguna cita por la web (la oficina aún
  puede poner seis). Propuesta: que la reserva baje a cero los días que
  solo trabajan dos, o que la decida el dueño. Lo decide Oscar.
