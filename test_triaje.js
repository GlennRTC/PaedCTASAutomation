// Casos clínicos de prueba para triaje.js. Cada caso es un paciente parcial y el
// resultado esperado. Se ejecuta en el navegador (test_triaje.html) o con Node:
//   node test_triaje.js
import { clasificar } from './triaje.js';

// Paciente base: niño sano sin nada registrado. Cada caso sobrescribe lo que necesita.
const base = () => ({
  edadMeses: 72, motivo: 'otro', gravedad: null, fiebreReciente: false, inmunodeprimido: false,
  pines: [], vitales: {}, pat: {}, distRespiratoria: 'ninguna', hemodinamica: 'normal',
  mecanismoAltoRiesgo: false, dolorCronico: false, sirs: 0,
});
// Signos vitales normales para un niño de 6 años (dentro de la banda IV–V de las tablas 5 y 6).
const svNormal6a = { fr: 20, fc: 90, sat: 98, temp: 36.8, gcs: 15 };

// Hallazgo mínimo del relato para las pruebas.
const h = (clave, nivel) => ({ clave, etiqueta: clave, nivel, fuente: 'test', evidencia: clave, negado: false });

// [nombre, modificaciones sobre base, nivel esperado, provisional esperado]
const definiciones = [
  ['Lactante 2 m con 38,3 °C → II (fiebre <3 m)',
    { edadMeses: 2, vitales: { fr: 40, fc: 130, sat: 98, temp: 38.3 } }, 2],
  ['8 m, 38,7 °C, apariencia alterada → II',
    { edadMeses: 8, vitales: { fr: 35, fc: 120, sat: 98, temp: 38.7 }, pat: { apariencia: true } }, 2],
  ['8 m, 38,7 °C, apariencia normal → III',
    { edadMeses: 8, vitales: { fr: 35, fc: 120, sat: 98, temp: 38.7 } }, 3],
  ['4 a, fiebre, aspecto bien, SV normales → IV',
    { edadMeses: 48, vitales: { fr: 20, fc: 90, sat: 98, temp: 38.4 } }, 4],
  ['6 a, FR 26 y Sat 93 → III',
    { vitales: { ...svNormal6a, fr: 26, sat: 93 } }, 3],
  ['6 a, FR 33 → I', { vitales: { ...svNormal6a, fr: 33 } }, 1],
  ['10 a, FC 25 → I', { edadMeses: 120, vitales: { fr: 16, fc: 25, sat: 98, temp: 36.8 } }, 1],
  ['10 a, FC 110 → II', { edadMeses: 120, vitales: { fr: 16, fc: 110, sat: 98, temp: 36.8 } }, 2],
  ['10 a, FC 125 → I', { edadMeses: 120, vitales: { fr: 16, fc: 125, sat: 98, temp: 36.8 } }, 1],
  ['GCS 8 → I', { vitales: { ...svNormal6a, gcs: 8 } }, 1],
  ['GCS 12 → II', { vitales: { ...svNormal6a, gcs: 12 } }, 2],
  ['GCS 15 sin efecto → V', { vitales: { ...svNormal6a, gcs: 15 } }, 5],
  ['Dolor 9 → II', { vitales: svNormal6a, pines: [{ intensidad: 9 }] }, 2],
  ['Dolor 5 → III', { vitales: svNormal6a, pines: [{ intensidad: 5 }] }, 3],
  ['Dolor 2 → IV', { vitales: svNormal6a, pines: [{ intensidad: 2 }] }, 4],
  ['Dolor 9 crónico → III', { vitales: svNormal6a, pines: [{ intensidad: 9 }], dolorCronico: true }, 3],
  ['Dolor: se usa el pin más intenso (3 y 8) → II', { vitales: svNormal6a, pines: [{ intensidad: 3 }, { intensidad: 8 }] }, 2],
  ['Mecanismo de alto riesgo → II', { vitales: svNormal6a, mecanismoAltoRiesgo: true }, 2],
  ['SIRS 3 → II', { vitales: svNormal6a, sirs: 3 }, 2],
  ['SIRS 2 + apariencia alterada → III (PAT 1 lado ya da II)',
    { vitales: svNormal6a, sirs: 2, pat: { apariencia: true } }, 2],
  ['PAT 3 lados → I', { vitales: svNormal6a, pat: { apariencia: true, respiracion: true, circulacion: true } }, 1],
  ['PAT 1 lado → II', { vitales: svNormal6a, pat: { circulacion: true } }, 2],
  ['Estridor audible → III', { vitales: svNormal6a, motivo: 'estridor', gravedad: 'audible' }, 3],
  ['Estridor marcado → II', { vitales: svNormal6a, motivo: 'estridor', gravedad: 'marcado' }, 2],
  ['Dificultad respiratoria grave → I', { vitales: svNormal6a, distRespiratoria: 'grave' }, 1],
  ['Shock → I', { vitales: svNormal6a, hemodinamica: 'shock' }, 1],
  ['Sat 89 → I', { vitales: { ...svNormal6a, sat: 89 } }, 1],
  ['Sat 91 → II', { vitales: { ...svNormal6a, sat: 91 } }, 2],
  ['Sin SV, motivo genérico, sin pines → V provisional', {}, 5, true],
  ['Sin SV pero con dolor 9 → II provisional', { pines: [{ intensidad: 9 }] }, 2, true],
  ['Límite compartido: 1–3 a FR 30 es normal → V', { edadMeses: 24, vitales: { fr: 30, fc: 100, sat: 98, temp: 36.8 } }, 5],
  ['Límite compartido: 1–3 a FR 31 → III', { edadMeses: 24, vitales: { fr: 31, fc: 100, sat: 98, temp: 36.8 } }, 3],
  ['Regla maestra: fiebre >18 m bien (IV) + dolor 9 (II) → II',
    { vitales: { ...svNormal6a, temp: 38.4 }, pines: [{ intensidad: 9 }] }, 2],
  ['Inmunodeprimido con fiebre → II', { vitales: { ...svNormal6a, temp: 38.2 }, inmunodeprimido: true }, 2],
  ['Fiebre reciente sin temperatura en <3 m → II', { edadMeses: 1, fiebreReciente: true, vitales: { fr: 40, fc: 130, sat: 98 } }, 2],
  // --- Hallazgos del relato (relato.js) ---
  ['Relato: cianosis (I) sube a I', { vitales: svNormal6a, hallazgos: [h('cianosis', 1)] }, 1],
  ['Relato: hallazgo negado no cuenta', { vitales: svNormal6a, hallazgos: [{ ...h('cianosis', 1), negado: true }] }, 5],
  ['Relato: hallazgo descartado por enfermería no cuenta', { vitales: svNormal6a, hallazgos: [{ ...h('cianosis', 1), descartado: true }] }, 5],
  ['Relato: fiebre referida en 2 m → II (efecto fiebre)', { edadMeses: 2, vitales: { fr: 40, fc: 130, sat: 98 }, hallazgos: [{ ...h('fiebre', null), efecto: 'fiebre' }] }, 2],
  ['Relato: fiebre + inmunosupresión referidas → II', { vitales: svNormal6a, hallazgos: [{ ...h('fiebre', null), efecto: 'fiebre' }, { ...h('inmunodeprimido', null), efecto: 'inmunodeprimido' }] }, 2],
  ['Relato: diabético + vómitos → II (regla cruzada)', { vitales: svNormal6a, hallazgos: [h('cronico_riesgo', null), h('vomitos', null)] }, 2],
  ['Relato: solo vómitos → alerta sin nivel → V', { vitales: svNormal6a, hallazgos: [h('vomitos', null)] }, 5],
  ['Relato: cojera sola → IV', { vitales: svNormal6a, hallazgos: [h('cojera', 4)] }, 4],
  ['Relato: cojera + fiebre → III', { vitales: { ...svNormal6a, temp: 38.3 }, hallazgos: [h('cojera', 4)] }, 3],
];

export const casos = definiciones.map(([nombre, cambios, nivel, provisional = false]) => {
  const r = clasificar({ ...base(), ...cambios });
  const esperado = `nivel ${nivel}${provisional ? ' provisional' : ''}`;
  const obtenido = `nivel ${r.nivel}${r.provisional ? ' provisional' : ''}`;
  return { nombre, esperado, obtenido, ok: esperado === obtenido };
});

// Ejecución directa con Node: imprime y sale con código de error si algo falla.
if (typeof document === 'undefined') {
  let fallos = 0;
  for (const c of casos) {
    if (!c.ok) fallos++;
    console.log(`${c.ok ? 'OK ' : 'KO '} ${c.nombre} | esperado ${c.esperado} | obtenido ${c.obtenido}`);
  }
  console.log(fallos ? `${fallos}/${casos.length} fallan` : `Todo verde: ${casos.length} casos`);
  process.exit(fallos ? 1 : 0);
}
