// Pruebas del extractor determinista del relato. Ejecutar: node test_relato.js
import { analizarRelato } from './relato.js';

const activos = r => r.hallazgos.filter(h => !h.negado).map(h => h.clave).sort();
const negados = r => r.hallazgos.filter(h => h.negado).map(h => h.clave).sort();

// [nombre, texto, edadMeses, esperado activos, esperado negados, datos esperados]
const definiciones = [
  ['Acentos y mayúsculas: "Está morado" → cianosis', 'Está morado y no reacciona', 72, ['cianosis', 'inconsciente'], []],
  ['Negación simple: "no tiene fiebre"', 'No tiene fiebre pero tose mucho', 72, ['tos'], ['fiebre']],
  ['"no para de llorar" NO es negación', 'No para de llorar desde hace 2 horas', 6, ['inconsolable'], [], { duracion: '2 horas' }],
  ['Afirmación prevalece sobre negación', 'Ayer no tenía fiebre, hoy tiene fiebre alta', 72, ['fiebre'], []],
  ['Temperatura con decimal crea fiebre', 'Le he puesto el termómetro y tenía 38,6 en casa', 72, ['fiebre'], [], { temperatura: 38.6 }],
  ['Temperatura sin decimal ni grados no cuenta', 'Tiene 38 años el padre', 72, [], []],
  ['Temperatura baja no crea fiebre', 'Tenía 36,8 grados', 72, [], [], { temperatura: 36.8 }],
  ['Caída de 2 metros → caida_altura', 'Se cayó de la litera, unos 2 metros', 48, ['caida_altura'], [], { metrosCaida: 2 }],
  ['Caída de 1 metro no supera el umbral', 'Se cayó del sofá, 1 metro', 48, [], []],
  ['Caída de 6 escalones → caida_altura', 'Se ha caído 6 escalones rodando', 48, ['caida_altura'], [], { escalones: 6 }],
  ['Dificultad respiratoria', 'Le cuesta respirar y se le hunden las costillas', 24, ['dificultad_respiratoria'], []],
  ['Letargia', 'Está más dormido de lo normal y muy decaído', 24, ['letargia'], []],
  ['Rechazo alimento en lactante activo', 'No quiere el pecho desde ayer', 4, ['rechazo_alimento'], []],
  ['Rechazo alimento fuera de edad → informativo', 'No quiere comer nada', 96, ['rechazo_alimento'], []],
  ['Diabético con vómitos: ambos conceptos', 'Es diabético y lleva vomitando toda la noche', 120, ['cronico_riesgo', 'vomitos'], [], { duracion: undefined }],
  ['Sin negación cruzando coma', 'no tiene tos, pero está muy pálido', 72, ['deshidratacion'], ['tos']],
  ['Vacío', '', 72, [], []],
];

let fallos = 0;
for (const [nombre, texto, edad, esperaActivos, esperaNegados, datos] of definiciones) {
  const r = analizarRelato(texto, edad);
  let ok = JSON.stringify(activos(r)) === JSON.stringify(esperaActivos) && JSON.stringify(negados(r)) === JSON.stringify(esperaNegados);
  for (const [k, v] of Object.entries(datos || {})) if (r.datos[k] !== v) ok = false;
  if (!ok) fallos++;
  console.log(`${ok ? 'OK ' : 'KO '} ${nombre} | activos ${JSON.stringify(activos(r))} negados ${JSON.stringify(negados(r))} datos ${JSON.stringify(r.datos)}`);
}
// Nivel fuera de edad debe ser null
const fe = analizarRelato('No quiere comer nada', 96).hallazgos[0];
if (fe.nivel !== null) { fallos++; console.log('KO  nivel null fuera de edad'); } else console.log('OK  nivel null fuera de edad');
console.log(fallos ? `${fallos} fallan` : `Todo verde: ${definiciones.length + 1} casos`);
process.exit(fallos ? 1 : 0);
