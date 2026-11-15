// LA BASE DE SERVICIOS DE OOOX OFICIOS: los trabajos concretos que hace cada oficio, para que cada negocio ponga su precio
// y lo que tarda, y así todos partan de la misma lista.
//
// Cada servicio:
//   id    lo que se escribe en el catálogo de un negocio como «base», para saber qué servicio es
//   n     el nombre que ve el cliente
//   que   lo que incluye, en una línea
//   dur   lo que suele tardar, [normal, máximo] en minutos, por cada unidad. Es una propuesta de partida, no un dato
//         medido: lo confirma o lo cambia cada dueño al dar de alta su negocio.
//   ref   precio de referencia en el mercado, [desde, hasta] en euros, tal como lo dan las fuentes de abajo (unas con IVA y
//         otras sin él: es una orientación para comparar, no un precio). null si no hay una fuente que lo diga.
//   fte   de qué fuente sale «ref»
//   mat   'aparte': el material se cobra aparte (o lo trae el cliente); 'dentro': va en el precio; 'no': no lleva material
//   urg   si se suele hacer de urgencia
//   ojo   lo que hay que saber antes de ofrecerlo
//
// Las fuentes se miraron el 15-11-2026.
export const FUENTES = {
  cronoMos: 'https://www.cronoshare.com/cuanto-cuesta/servicio-fontaneria/mostoles',
  cronoRiv: 'https://www.cronoshare.com/cuanto-cuesta/servicio-fontaneria/rivas-vaciamadrid',
  cronoTar: 'https://www.cronoshare.com/cuanto-cuesta/servicio-fontaneria/tarragona',
  cronoCor: 'https://www.cronoshare.com/cuanto-cuesta/fontanero/a-coruna',
  trustFon: 'https://trustlocal.es/coste/fontanero-coste/',
  trustEle: 'https://trustlocal.es/coste/electricista-coste/',
  habiEle: 'https://www.habitissimo.es/presupuestos/electricistas/madrid/mostoles',
  habiDif: 'https://www.habitissimo.es/presupuestos/reparar-averia-electrica',
};

export const OFICIOS = {
  fontaneria: {
    n: 'Fontanería',
    servicios: [
      { id: 'fon-fuga', n: 'Localizar y reparar una fuga visible', que: 'Buscar la fuga, cerrar el agua y reparar el tramo o la unión', dur: [60, 120], ref: [60, 150], fte: 'cronoMos', mat: 'aparte', urg: true },
      { id: 'fon-grifo-reparar', n: 'Reparar un grifo que gotea', que: 'Cambiar el cartucho, las gomas o la montura del grifo', dur: [20, 45], ref: [35, 80], fte: 'cronoRiv', mat: 'aparte', urg: false },
      { id: 'fon-grifo-cambiar', n: 'Cambiar un grifo', que: 'Quitar el viejo, montar el nuevo y probar que no pierde', dur: [30, 60], ref: [50, 120], fte: 'cronoMos', mat: 'aparte', urg: false, ojo: 'La referencia es solo la mano de obra; el grifo, aparte.' },
      { id: 'fon-cisterna-ajustar', n: 'Ajustar o reparar la cisterna', que: 'Regular la carga, cambiar la goma o la boya', dur: [20, 45], ref: [45, 120], fte: 'cronoRiv', mat: 'aparte', urg: false },
      { id: 'fon-cisterna-mecanismo', n: 'Cambiar el mecanismo de la cisterna', que: 'Cambiar el mecanismo de carga y descarga', dur: [30, 60], ref: [120, 200], fte: 'cronoCor', mat: 'dentro', urg: false, ojo: 'Una cisterna empotrada tarda más y cuesta más.' },
      { id: 'fon-desatasco', n: 'Desatascar fregadero, lavabo o ducha', que: 'Desatasco manual o con máquina, y probar el desagüe', dur: [30, 60], ref: [60, 150], fte: 'cronoRiv', mat: 'no', urg: true },
      { id: 'fon-desatasco-inodoro', n: 'Desatascar un inodoro', que: 'Desatasco manual o con máquina', dur: [30, 75], ref: [70, 180], fte: 'cronoMos', mat: 'no', urg: true },
      { id: 'fon-inodoro', n: 'Cambiar un inodoro', que: 'Quitar el viejo, montar el nuevo y sellarlo', dur: [90, 180], ref: [90, 200], fte: 'cronoMos', mat: 'aparte', urg: false },
      { id: 'fon-termo', n: 'Cambiar un termo eléctrico', que: 'Quitar el viejo, colgar y conectar el nuevo', dur: [90, 180], ref: [120, 300], fte: 'cronoMos', mat: 'aparte', urg: true, ojo: 'Si hay que llevar el viejo a un punto limpio, se puede cobrar aparte.' },
      { id: 'fon-termo-reparar', n: 'Reparar un termo', que: 'Cambiar la resistencia, el termostato o la válvula', dur: [45, 90], ref: null, mat: 'aparte', urg: true },
      { id: 'fon-calentador', n: 'Instalar un calentador de gas', que: 'Montar y conectar el calentador', dur: [120, 240], ref: [200, 600], fte: 'cronoRiv', mat: 'aparte', urg: false, ojo: 'Solo con instalador de gas habilitado.' },
      { id: 'fon-punto-agua', n: 'Poner un punto de agua nuevo', que: 'Llevar la toma de agua a un sitio nuevo', dur: [120, 240], ref: [120, 280], fte: 'cronoTar', mat: 'dentro', urg: false },
      { id: 'fon-llave-paso', n: 'Cambiar una llave de paso', que: 'Cortar el agua general y cambiar la llave', dur: [30, 60], ref: null, mat: 'aparte', urg: true },
      { id: 'fon-latiguillos', n: 'Cambiar los latiguillos', que: 'Cambiar los tubos flexibles de un grifo o de la cisterna', dur: [15, 30], ref: null, mat: 'aparte', urg: true },
      { id: 'fon-sifon', n: 'Cambiar un sifón', que: 'Cambiar el sifón de un fregadero o lavabo', dur: [20, 40], ref: null, mat: 'aparte', urg: false },
      { id: 'fon-cal', n: 'Limpiar las tuberías de cal', que: 'Limpieza de cal de las tuberías de la vivienda', dur: [60, 180], ref: [80, 200], fte: 'cronoMos', mat: 'no', urg: false },
      { id: 'fon-revision', n: 'Revisión de la instalación de agua', que: 'Mirar llaves, uniones, grifos, cisternas y termo, y apuntar lo que hay que cambiar', dur: [40, 75], ref: null, mat: 'no', urg: false, ojo: 'Es la revisión del contrato de mantenimiento.' },
    ],
  },
  electricidad: {
    n: 'Electricidad',
    servicios: [
      { id: 'ele-mecanismo', n: 'Cambiar un enchufe o un interruptor', que: 'Cambiar el mecanismo por uno nuevo, por unidad', dur: [15, 30], ref: [25, 50], fte: 'trustEle', mat: 'aparte', urg: false },
      { id: 'ele-punto', n: 'Poner un punto de luz o un enchufe nuevo', que: 'Llevar el cable y montar el punto nuevo, por unidad', dur: [60, 120], ref: [60, 110], fte: 'trustEle', mat: 'dentro', urg: false },
      { id: 'ele-averia', n: 'Localizar y reparar una avería', que: 'Buscar por qué falla y repararlo', dur: [45, 120], ref: [60, 150], fte: 'trustEle', mat: 'aparte', urg: true, ojo: 'Lo que más cuesta es encontrar el fallo: si tarda, se acerca al máximo.' },
      { id: 'ele-cortocircuito', n: 'Reparar un cortocircuito', que: 'Encontrar el cruce y repararlo', dur: [45, 120], ref: [50, 250], fte: 'trustEle', mat: 'aparte', urg: true },
      { id: 'ele-diferencial', n: 'Cambiar el diferencial', que: 'Cambiar el interruptor diferencial del cuadro', dur: [45, 90], ref: [50, 200], fte: 'habiDif', mat: 'aparte', urg: true },
      { id: 'ele-magneto', n: 'Cambiar un magnetotérmico', que: 'Cambiar un automático del cuadro', dur: [30, 60], ref: null, mat: 'aparte', urg: true },
      { id: 'ele-cuadro', n: 'Poner un cuadro eléctrico nuevo', que: 'Cuadro nuevo, montado y conectado', dur: [180, 360], ref: [250, 600], fte: 'trustEle', mat: 'dentro', urg: false },
      { id: 'ele-lampara', n: 'Colgar y conectar una lámpara', que: 'Colgar una lámpara o un plafón y conectarlo', dur: [30, 60], ref: [30, 50], fte: 'habiEle', mat: 'no', urg: false },
      { id: 'ele-boletin', n: 'Boletín eléctrico (CIE)', que: 'Revisar la instalación y emitir el certificado', dur: [60, 120], ref: [100, 180], fte: 'trustEle', mat: 'no', urg: false, ojo: 'Lo firma un instalador autorizado.' },
      { id: 'ele-revision', n: 'Revisión de la instalación eléctrica', que: 'Mirar el cuadro, la toma de tierra, enchufes y puntos de luz, y apuntar lo que hay que cambiar', dur: [40, 75], ref: null, mat: 'no', urg: false, ojo: 'Es la revisión del contrato de mantenimiento.' },
    ],
  },
};

/* todos los servicios, por su id */
export const TODOS = Object.fromEntries(Object.values(OFICIOS).flatMap(o => o.servicios.map(s => [s.id, s])));
