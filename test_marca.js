// Comprobación de la marca. Ejecutar: node test_marca.js
// Lee las variables de :root en index.html y verifica contraste WCAG AA,
// colores CTAS intactos (estándar clínico, no marca) y pilas de fuentes con genérica final.
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const raiz = html.match(/:root\s*{([^}]*)}/)[1];
const v = Object.fromEntries([...raiz.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

// Luminancia relativa y contraste según WCAG 2.x.
const lum = hex => {
  const c = hex.replace('#', '').match(/../g).map(x => parseInt(x, 16) / 255)
    .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
// Acepta #rgb y #rrggbb.
const hex6 = h => (h.length === 4 ? '#' + [...h.slice(1)].map(c => c + c).join('') : h);
const contraste = (a, b) => { const [x, y] = [lum(hex6(a)), lum(hex6(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

let fallos = 0;
const comprobar = (nombre, ok, detalle = '') => { console.log(`${ok ? '✔' : '✘'} ${nombre}${detalle}`); if (!ok) fallos++; };

// [texto, fondo]: pares que aparecen en la UI.
const pares = [
  ['sobre-primario', 'primario'], ['sobre-primario', 'primario-oscuro'],
  ['texto', 'fondo'], ['texto', 'tarjeta'], ['texto', 'suave'],
  ['texto-suave', 'tarjeta'], ['texto-suave', 'suave'], ['texto-suave', 'fondo'],
  ['texto-tenue', 'tarjeta'],
  ['acento', 'tarjeta'], ['acento-oscuro', 'azul-suave'],
  ['primario', 'suave'], ['peligro', 'tarjeta'],
];
for (const [t, f] of pares) {
  if (!v[t] || !v[f]) { comprobar(`${t} sobre ${f}`, false, ' → variable ausente'); continue; }
  const r = contraste(v[t], v[f]);
  comprobar(`${t} sobre ${f}`, r >= 4.5, ` → ${r.toFixed(2)}:1`);
}

// Colores de nivel PaedCTAS: no forman parte de la marca y no pueden cambiar.
const CTAS = { 'ctas-1': '#1d4ed8', 'ctas-2': '#dc2626', 'ctas-3': '#facc15', 'ctas-4': '#16a34a', 'ctas-5': '#f8fafc' };
for (const [k, esperado] of Object.entries(CTAS)) comprobar(`${k} intacto`, v[k] === esperado, ` → ${v[k]}`);

// Sin red, las pilas deben caer a una familia genérica.
comprobar('fuente-marca termina en serif', /\bserif$/.test(v['fuente-marca'] || ''));
comprobar('fuente-titulos termina en sans-serif', /sans-serif$/.test(v['fuente-titulos'] || ''));
comprobar('fuente-texto termina en sans-serif', /sans-serif$/.test(v['fuente-texto'] || ''));
comprobar('Google Fonts carga Source Serif 4', html.includes('family=Source+Serif+4'));

console.log(fallos ? `\n${fallos} comprobación(es) fallan.` : '\nMarca OK.');
process.exit(fallos ? 1 : 0);
