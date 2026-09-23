# Marca Bioprognostika para PaedCTAS: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cambiar la identidad visual del simulador PaedCTAS por la de Bioprognostika (https://bioprognostika.netlify.app/) sin tocar la lógica clínica, la estructura ni el informe imprimible.

**Architecture:** Todo el estilo de pantalla vive en un único bloque `<style>` de `index.html`, y casi todo pasa por variables CSS en `:root`. El rebrand consiste en: (1) cambiar los valores de los tokens y las fuentes, (2) añadir una franja "hero" con la marca, (3) ajustar a mano las pocas reglas que llevan colores fijos, y (4) retocar el color de resalte del visor 3D en `cuerpo3d.js`. Se mantienen los nombres de variables actuales, así el resto del CSS se actualiza solo.

**Tech Stack:** HTML + CSS + JS vanilla (módulos ES), Three.js 0.186 por CDN, Google Fonts. **Sin** Tailwind, shadcn ni React: el sitio de referencia los usa, pero este proyecto exige HTML/JS sin bundler y KISS (`build_prompt.md`). Se replican sus *tokens*, no su stack.

**Spec:** El análisis de marca de la sección siguiente hace de spec. Spec del producto base: `docs/superpowers/specs/2026-09-21-triaje-pediatrico-design.md`.

---

## Análisis de marca (Bioprognostika)

Extraído del CSS compilado (`/assets/index-9c87df9c.css`), del HTML y de capturas en headless Chromium a 1440 px y 390 px.

| Elemento | Bioprognostika | Valor |
|---|---|---|
| Wordmark / H1 | Serif grande, negrita, casi negro | `Source Serif Pro` 700, `#111827` |
| Títulos de sección | Sans técnica | `IBM Plex Sans` 600 (`.font-medical-heading`) |
| Texto base | Sans humanista | `Source Sans Pro` 400/600 |
| Tagline / enlaces | Azul | `#2563eb` (blue-600), hover `#1d4ed8` |
| Primario | Verde salud | escala `primary` = green de Tailwind: 50 `#f0fdf4`, 100 `#dcfce7`, 500 `#22c55e`, 600 `#16a34a`, 700 `#15803d`, 800 `#166534` |
| Acentos "healing" | Menta y salvia | mint `#98d8c8`, sage `#87a96b` |
| Fondo del hero | Degradado suave | `linear-gradient(to bottom right, #f0fdf4, rgb(152 216 200 / .2))` |
| CTA primario | Botón verde en degradado, texto blanco | `from #22c55e to #16a34a`, radio 8 px |
| CTA secundario | Contorno azul claro, fondo azul-50, texto azul | borde `#bfdbfe`, fondo `#eff6ff`, texto `#1d4ed8` |
| Tarjetas | Blancas, redondeadas, sombra suave | radio 16–24 px, sombra `0 4px 6px -1px rgba(34,197,94,.1), 0 2px 4px -1px rgba(34,197,94,.06)` (`.shadow-medical`) |
| Iconos de tarjeta | Baldosa pastel con icono | 40 px, radio 12 px, fondo 50/100 del color |
| Chips de confianza | Icono verde + texto gris pequeño | `#6b7280`, 0.8 rem |
| Paneles de evidencia | Panel salvia muy tenue | fondo `#fafaf9` → `rgb(135 169 107 / .1)`, borde `rgb(135 169 107 / .3)` |
| Acordeones / FAQ | Filas blancas con borde gris y chevron | borde `#e5e7eb`, radio 8–12 px |
| Texto secundario | Gris | `#6b7280` / `#4b5563` |

**Adaptaciones deliberadas (no copiar a ciegas):**
1. **Contraste del CTA.** El botón de Bioprognostika (blanco sobre `#22c55e`→`#16a34a`) mide **2,28:1 y 3,30:1**: no cumple WCAG AA. Una herramienta clínica no puede fallar ahí. Usamos el mismo tono un paso más oscuro: `#15803d`→`#166534` (**5,02:1 y 7,13:1**).
2. **Los colores de nivel CTAS NO son marca.** Nivel I azul, II rojo, III amarillo, IV verde, V blanco/gris son un estándar clínico (Beveridge 1999 [3]). No se tocan `--ctas-1..5` ni `NIVELES[n].color` en `triaje.js`.
3. **El pin de dolor sigue rojo.** Rojo = dolor en toda la UI y en el informe; es semántica, no marca.
4. **El informe impreso (`@media print`) no cambia.** Es un documento clínico en blanco y negro; solo se añade `.hero` a la lista de elementos ocultos.
5. **Hero compacto.** Bioprognostika es una landing con un hero de pantalla completa. Aquí el formulario es la herramienta, así que el hero es una franja de unos 140 px que desaparece al hacer scroll, con una barra superior fija y fina que conserva el wordmark.
6. **Fuentes:** Google Fonts ya renombró Source Serif Pro / Source Sans Pro a *Source Serif 4* / *Source Sans 3* (mismo diseño). Cargamos las nuevas y dejamos las antiguas como fallback en la pila.

---

## Global Constraints

- Sin nuevas dependencias, sin bundler, sin Tailwind ni shadcn: solo `index.html` (CSS) y una línea de `cuerpo3d.js`.
- Comentarios de código en español (regla de `build_prompt.md`).
- `--ctas-1: #1d4ed8; --ctas-2: #dc2626; --ctas-3: #facc15; --ctas-4: #16a34a; --ctas-5: #f8fafc;`: valores exactos, sin cambios.
- `COLOR_PIN = 0xdc2626` en `cuerpo3d.js`: sin cambios.
- Bloque `@media print`: sin cambios salvo añadir `.hero` al selector que oculta elementos.
- Todo par texto/fondo de la UI ≥ 4,5:1 (WCAG AA texto normal).
- Objetivos táctiles ≥ 44 px (`--toque`) y anillos de foco visibles: sin cambios.
- `prefers-reduced-motion` sigue desactivando transiciones.
- Los tests existentes (`node test_triaje.js`, `node test_relato.js`) siguen pasando: no se toca lógica.

## Review Focus

1. **Nivel IV verde junto a botones verdes.** Con la banda de resultado en nivel IV (`#16a34a`) y "Exportar" en verde marca, quien revise debe confirmar en captura que se distinguen (el botón es más oscuro y tiene icono y texto). Test: captura del escenario "dolor abdominal" forzado a IV en Task 5, paso 3.
2. **Móvil ≤ 390 px.** El hero y la barra fija no deben tapar la barra de nivel inferior (`.barra-movil`) ni empujar el formulario más de una pantalla. Test: captura a 390 px en Task 5.
3. **Impresión.** El PDF exportado debe verse igual que antes (sin hero, sin degradados). Test: paso manual de exportación en Task 5.
4. **Fuentes que no cargan (sin red).** La pila debe caer a Georgia / system-ui sin romper el layout. Test: `test_marca.js` comprueba que cada pila termina en una genérica (`serif` / `sans-serif`).
5. **Resalte 3D.** El nuevo tinte verde al pasar el cursor debe seguir viéndose sobre la piel `#e9c9ad`. Test: captura con hover en Task 4.

---

## File Structure

| Archivo | Cambio | Responsabilidad |
|---|---|---|
| `test_marca.js` | **Crear** | Comprobación de contraste WCAG de los tokens, de los colores CTAS intactos y de las pilas de fuentes. `node test_marca.js`. |
| `index.html` | Modificar | Tokens `:root`, fuentes, hero, reglas con colores fijos, botones, tarjetas, panel de referencias. |
| `cuerpo3d.js` | Modificar 1 línea (80) | Color de resalte al pasar el cursor. |
| `README.md` | Modificar | Una línea con `node test_marca.js` en la sección de pruebas y una nota breve de marca. |

**Fuera de alcance:** la carpeta sin seguimiento `PaedCTASAutomation/` es un clon anidado con copias idénticas de `app.js`, `cuerpo3d.js` y `build_prompt.md`. No se toca; hay que preguntar al usuario antes de borrarla.

---

### Task 1: Tokens de marca + comprobación de contraste

**Files:**
- Create: `test_marca.js`
- Modify: `index.html:8-20` (bloque `:root`), `index.html:24` (`font-family` del body), `index.html:195-196` (enlace de Google Fonts)

**Interfaces:**
- Produces (variables CSS que usan las tareas siguientes): `--primario`, `--primario-oscuro`, `--sobre-primario`, `--acento`, `--acento-oscuro`, `--azul-suave`, `--azul-borde`, `--texto`, `--texto-suave`, `--texto-tenue`, `--fondo`, `--tarjeta`, `--suave`, `--borde`, `--borde-fuerte`, `--menta`, `--salvia`, `--peligro`, `--ctas-1..5`, `--radio`, `--radio-s`, `--radio-l`, `--sombra`, `--sombra-alta`, `--anillo`, `--fuente-marca`, `--fuente-titulos`, `--fuente-texto`, `--transicion`, `--toque`.

- [ ] **Step 1: Escribir la comprobación (falla con los tokens actuales)**

Crear `test_marca.js`:

```js
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
const contraste = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

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
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `node test_marca.js`
Esperado: FALLA. `sobre-primario sobre primario → 3.68:1` o parecido (cian actual), `acento-oscuro … variable ausente`, `fuente-marca … ✘`, `Google Fonts carga Source Serif 4 ✘`. Salida con código 1.

- [ ] **Step 3: Sustituir el bloque `:root` (líneas 8-20)**

Reemplazar desde `/* ---------- Tokens (estilo "accesible y ético"…` hasta el `}` que cierra `:root` por:

```css
  /* ---------- Tokens · marca Bioprognostika (verde salud + azul confianza + menta/salvia) ----------
     Verde primario un paso más oscuro que el original (#22c55e→#16a34a) para cumplir WCAG AA
     con texto blanco. Los colores --ctas-* son estándar clínico PaedCTAS: NO son marca. */
  :root {
    --primario: #15803d; --primario-oscuro: #166534; --sobre-primario: #fff;
    --acento: #2563eb; --acento-oscuro: #1d4ed8; --azul-suave: #eff6ff; --azul-borde: #bfdbfe;
    --texto: #111827; --texto-suave: #4b5563; --texto-tenue: #6b7280;
    --fondo: #f9fafb; --tarjeta: #fff; --suave: #f0fdf4; --borde: #e5e7eb; --borde-fuerte: #d1d5db;
    --menta: #98d8c8; --salvia: #87a96b;
    --peligro: #dc2626;
    --ctas-1: #1d4ed8; --ctas-2: #dc2626; --ctas-3: #facc15; --ctas-4: #16a34a; --ctas-5: #f8fafc;
    --radio: 16px; --radio-s: 10px; --radio-l: 24px;
    --sombra: 0 4px 6px -1px rgba(34,197,94,.1), 0 2px 4px -1px rgba(34,197,94,.06);
    --sombra-alta: 0 10px 15px -3px rgba(17,24,39,.08), 0 4px 6px -4px rgba(17,24,39,.06);
    --anillo: 0 0 0 3px rgba(21,128,61,.25);
    --fuente-marca: "Source Serif 4", "Source Serif Pro", Georgia, serif;
    --fuente-titulos: "IBM Plex Sans", system-ui, sans-serif;
    --fuente-texto: "Source Sans 3", "Source Sans Pro", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --transicion: 200ms ease;
    --toque: 44px;
  }
```

- [ ] **Step 4: Fuente del body (línea 24)**

Reemplazar:
```css
  body { margin: 0; font-family: "Figtree", "Noto Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
```
por:
```css
  body { margin: 0; font-family: var(--fuente-texto);
```

- [ ] **Step 5: Enlace de Google Fonts (línea 196)**

Reemplazar:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Noto+Sans:wght@400;500;700&display=swap">
```
por:
```html
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=IBM+Plex+Sans:wght@500;600&family=Source+Sans+3:wght@400;500;600;700&family=Noto+Sans:wght@400;700&display=swap">
```
(Se mantiene Noto Sans porque el `@media print` la usa para el informe.)

- [ ] **Step 6: Ejecutar y ver que pasa**

Run: `node test_marca.js && node test_triaje.js && node test_relato.js`
Esperado: `Marca OK.` y los dos suites existentes en verde.

- [ ] **Step 7: Commit**

```bash
git add test_marca.js index.html
git commit -m "feat(marca): tokens y tipografía Bioprognostika con comprobación WCAG"
```

---

### Task 2: Barra superior + franja hero con la marca

**Files:**
- Modify: `index.html:32-41` (CSS de cabecera), `index.html:176` (selector de impresión), `index.html:207-213` (markup `<header>`)

**Interfaces:**
- Consumes: `--fuente-marca`, `--fuente-titulos`, `--acento`, `--menta`, `--primario`, `--suave`, `--texto-tenue`, `--borde` (Task 1).
- Produces: clases `.hero`, `.hero .confianza`, `.marca-texto`. El `id="banda"` y el enlace `.saltar` no cambian.

- [ ] **Step 1: Sustituir el CSS de cabecera (líneas 32-41)**

Reemplazar desde `/* ---------- Cabecera ---------- */` hasta `@media (max-width: 700px) { header .aviso { display: none; } }` por:

```css
  /* ---------- Cabecera: barra fija fina con wordmark serif ---------- */
  header { position: sticky; top: 0; z-index: 20; background: rgba(255,255,255,.9); backdrop-filter: blur(8px);
           border-bottom: 1px solid var(--borde); }
  header .interior { max-width: 1200px; margin: 0 auto; padding: .6rem 1.5rem; display: flex; align-items: center; gap: .7rem; }
  .marca { width: 32px; height: 32px; flex: none; border-radius: 10px; display: grid; place-items: center;
           background: linear-gradient(135deg, var(--primario), var(--primario-oscuro)); }
  .marca svg { width: 20px; height: 20px; }
  .marca-texto { font-family: var(--fuente-marca); font-weight: 700; font-size: 1.25rem; letter-spacing: -.01em; color: var(--texto); }
  header .aviso { margin-left: auto; font-size: .78rem; color: var(--acento-oscuro); background: var(--azul-suave);
                  border: 1px solid var(--azul-borde); padding: .3rem .7rem; border-radius: 999px; white-space: nowrap; }
  @media (max-width: 700px) { header .aviso { display: none; } }

  /* ---------- Hero: degradado verde→menta, titular serif, tagline azul, chips de confianza ---------- */
  .hero { background: linear-gradient(to bottom right, var(--suave), rgba(152,216,200,.2)); border-bottom: 1px solid var(--borde); }
  .hero .interior { max-width: 1200px; margin: 0 auto; padding: 1.75rem 1.5rem 1.5rem; text-align: center; }
  .hero h1 { margin: 0; font-family: var(--fuente-marca); font-weight: 700; font-size: clamp(1.9rem, 4vw, 2.75rem);
             line-height: 1.1; letter-spacing: -.02em; color: var(--texto); }
  .hero .tagline { margin: .4rem 0 0; font-family: var(--fuente-titulos); font-weight: 500; color: var(--acento); }
  .hero .confianza { margin: .8rem 0 0; padding: 0; list-style: none; display: flex; flex-wrap: wrap; justify-content: center; gap: .4rem 1.25rem;
                     font-size: .8rem; color: var(--texto-tenue); }
  .hero .confianza li { display: inline-flex; align-items: center; gap: .35rem; }
  .hero .confianza svg { width: 14px; height: 14px; color: var(--primario); flex: none; }
  @media (max-width: 600px) { .hero .interior { padding: 1.1rem 1rem 1rem; } .hero .confianza { display: none; } }
```

- [ ] **Step 2: Ocultar el hero al imprimir (línea 176)**

Reemplazar:
```css
    header, main, footer, dialog, #referencias, .barra-movil, .saltar { display: none !important; }
```
por:
```css
    header, .hero, main, footer, dialog, #referencias, .barra-movil, .saltar { display: none !important; }
```

- [ ] **Step 3: Sustituir el markup de `<header>` (líneas 207-213)**

Reemplazar el bloque `<header>…</header>` por:

```html
<header>
  <div class="interior">
    <div class="marca" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-4.6-7-10.2A4.3 4.3 0 0 1 12 8a4.3 4.3 0 0 1 7 2.8C19 16.4 12 21 12 21z"/><path d="M9 12h2l1-2 1.5 4 1-2H16"/></svg></div>
    <span class="marca-texto">PaedCTAS</span>
    <span class="aviso">Educativo · no sustituye la valoración clínica</span>
  </div>
</header>

<!-- Hero de marca: se desplaza con la página; la barra superior conserva el wordmark -->
<section class="hero">
  <div class="interior">
    <h1>Triaje pediátrico</h1>
    <p class="tagline">Pre-triaje con la escala PaedCTAS en minutos</p>
    <ul class="confianza">
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Escala validada (CJEM 2008, 2017)</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>Datos solo en tu navegador</li>
      <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2z"/></svg>Informe clínico en PDF</li>
    </ul>
  </div>
</section>
```

"Datos solo en tu navegador" es cierto: el estado vive en `localStorage` (`app.js:23`) y no hay backend.

- [ ] **Step 4: Verificar**

Run: `node test_marca.js` → `Marca OK.`
Run (servidor + captura):
```bash
python3 -m http.server 8765 >/dev/null 2>&1 &
CH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1)
$CH --headless=new --no-sandbox --hide-scrollbars --virtual-time-budget=8000 --window-size=1440,1000 --screenshot=/tmp/paso2.png http://localhost:8765/
```
Abrir `/tmp/paso2.png`. Esperado: barra blanca con logo verde y "PaedCTAS" en serif, y debajo una franja verde-menta con "Triaje pediátrico" en serif grande, tagline azul y tres chips grises con iconos verdes.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(marca): barra superior con wordmark serif y hero degradado"
```

---

### Task 3: Componentes (tarjetas, campos, botones, resultado, referencias)

**Files:**
- Modify: `index.html` (reglas CSS indicadas abajo; buscar cada `old` literal)

**Interfaces:**
- Consumes: todos los tokens de Task 1.
- Produces: ninguna clase nueva que use JS. `button.primario`, `button.peligro`, `.paso`, `.resultado` y `#referencias` conservan nombre y markup.

- [ ] **Step 1: Pasos plegables como tarjetas Bioprognostika**

Reemplazar:
```css
  details { background: var(--tarjeta); border: 1px solid var(--borde); border-radius: var(--radio); margin-bottom: 1rem; box-shadow: var(--sombra); }
```
por:
```css
  details { background: var(--tarjeta); border: 1px solid var(--borde); border-radius: var(--radio); margin-bottom: 1rem; box-shadow: var(--sombra);
            transition: box-shadow var(--transicion); }
  details:hover { box-shadow: var(--sombra-alta); }
  summary .titulo { font-family: var(--fuente-titulos); }
```

Reemplazar:
```css
  summary .paso { width: 28px; height: 28px; flex: none; border-radius: 50%; background: var(--suave); color: var(--primario-oscuro); font-size: .85rem; font-weight: 700; display: grid; place-items: center; }
  details[open] summary .paso { background: var(--primario); color: #fff; }
```
por:
```css
  /* Número de paso como baldosa pastel (iconos de tarjeta de Bioprognostika) */
  summary .paso { width: 36px; height: 36px; flex: none; border-radius: 12px; background: var(--suave); color: var(--primario); font-size: .9rem; font-weight: 700;
                  display: grid; place-items: center; border: 1px solid #dcfce7; }
  details[open] summary .paso { background: linear-gradient(135deg, var(--primario), var(--primario-oscuro)); color: var(--sobre-primario); border-color: transparent; }
```

- [ ] **Step 2: Anillo de foco verde en campos**

Reemplazar:
```css
  input:focus-visible, select:focus-visible, textarea:focus-visible { outline: none; border-color: var(--primario); box-shadow: 0 0 0 3px rgba(8,145,178,.25); }
```
por:
```css
  input:focus-visible, select:focus-visible, textarea:focus-visible { outline: none; border-color: var(--primario); box-shadow: var(--anillo); }
```

- [ ] **Step 3: Botones: secundario azul, primario verde en degradado**

Reemplazar:
```css
  button:hover { background: var(--suave); border-color: var(--primario); }
```
por:
```css
  button:hover { background: var(--suave); border-color: var(--primario); }
  /* Secundario = botón "See How It Works": contorno y fondo azul claro */
  button.secundario { background: var(--azul-suave); border-color: var(--azul-borde); color: var(--acento-oscuro); }
  button.secundario:hover { background: #dbeafe; border-color: var(--acento); }
```

Reemplazar:
```css
  button.primario { background: var(--primario); color: var(--sobre-primario); border-color: var(--primario); }
  button.primario:hover { background: var(--primario-oscuro); border-color: var(--primario-oscuro); }
  button.peligro { color: var(--peligro); } button.peligro:hover { background: #fef2f2; border-color: var(--peligro); }
```
por:
```css
  /* Primario = CTA de Bioprognostika, un paso más oscuro para AA (ver tokens) */
  button.primario { background: linear-gradient(135deg, var(--primario), var(--primario-oscuro)); color: var(--sobre-primario); border-color: transparent;
                    font-weight: 600; box-shadow: var(--sombra); }
  button.primario:hover { background: var(--primario-oscuro); box-shadow: var(--sombra-alta); }
  button.peligro { color: var(--peligro); background: var(--tarjeta); } button.peligro:hover { background: #fef2f2; border-color: var(--peligro); }
```

En el markup, añadir `class="secundario"` a dos botones:
- `<button type="button" id="btnCancelarPin">Cancelar</button>` → `<button type="button" class="secundario" id="btnCancelarPin">Cancelar</button>`
- Los botones Frente/Espalda del visor se quedan como están (blancos translúcidos sobre la escena 3D, se leen mejor).

- [ ] **Step 4: Colores fijos cian → neutros/verde**

| Buscar (literal) | Reemplazar por |
|---|---|
| `background: radial-gradient(ellipse at 50% 35%, #ffffff 0%, #e9f3f7 60%, #d9e9ef 100%); }` | `background: radial-gradient(ellipse at 50% 35%, #ffffff 0%, var(--suave) 60%, #dcefe7 100%); }` |
| `.visor .region { position: absolute; top: .75rem; right: .75rem; background: rgba(22,78,99,.85);` | `.visor .region { position: absolute; top: .75rem; right: .75rem; background: rgba(17,24,39,.82);` |
| `box-shadow: 0 20px 60px rgba(22,78,99,.25); color: var(--texto); }` | `box-shadow: 0 25px 50px -12px rgba(17,24,39,.25); color: var(--texto); }` |
| `dialog::backdrop { background: rgba(22,78,99,.35); backdrop-filter: blur(2px); }` | `dialog::backdrop { background: rgba(17,24,39,.35); backdrop-filter: blur(2px); }` |
| `dialog { border: 1px solid var(--borde); border-radius: 16px;` | `dialog { border: 1px solid var(--borde); border-radius: var(--radio-l);` |
| `dialog h3 { margin: 0 0 .25rem; font-size: 1.05rem; }` | `dialog h3 { margin: 0 0 .25rem; font-size: 1.1rem; font-family: var(--fuente-titulos); }` |
| `border-radius: var(--radio); box-shadow: 0 8px 30px rgba(22,78,99,.3); text-decoration: none; min-height: var(--toque); }` | `border-radius: var(--radio); box-shadow: 0 8px 30px rgba(17,24,39,.3); text-decoration: none; min-height: var(--toque); }` |

Tras este paso, `grep -n '22,78,99\|8,145,178\|e9f3f7' index.html` no debe devolver nada.

- [ ] **Step 5: Tarjeta de resultado**

Reemplazar:
```css
  .resultado { background: var(--tarjeta); border: 1px solid var(--borde); border-radius: var(--radio); overflow: hidden; box-shadow: var(--sombra); }
```
por:
```css
  .resultado { background: var(--tarjeta); border: 1px solid var(--borde); border-radius: var(--radio-l); overflow: hidden; box-shadow: var(--sombra-alta); }
  .banda .nombre, .resultado h2 { font-family: var(--fuente-titulos); }
```
(`.banda` sigue pintándose con el color CTAS del nivel desde `app.js:148`: no tocar.)

- [ ] **Step 6: Referencias como panel de "Clinical Evidence Foundation"**

Reemplazar:
```css
  #referencias { max-width: 1200px; margin: 0 auto 1rem; }
```
por:
```css
  /* Panel salvia tenue, como "Clinical Evidence Foundation" de Bioprognostika */
  #referencias { max-width: 1200px; margin: 0 auto 1rem; background: linear-gradient(135deg, #fafaf9, rgba(135,169,107,.1));
                 border-color: rgba(135,169,107,.3); }
  #referencias summary .titulo { color: var(--primario); }
```

- [ ] **Step 7: Verificar**

Run: `node test_marca.js && node test_triaje.js && node test_relato.js` → todo en verde.
Run: `grep -n '22,78,99\|8,145,178\|e9f3f7\|Figtree' index.html` → sin resultados.
Captura a 1440 px como en Task 2, paso 4 (`/tmp/paso3.png`). Esperado: tarjetas blancas con sombra verde tenue, pasos como baldosas redondeadas, "Exportar informe (PDF)" en degradado verde oscuro, referencias en panel salvia.

- [ ] **Step 8: Commit**

```bash
git add index.html
git commit -m "feat(marca): tarjetas, botones y paneles con estilo Bioprognostika"
```

---

### Task 4: Resalte del visor 3D

**Files:**
- Modify: `cuerpo3d.js:80`

**Interfaces:**
- Consumes: nada nuevo. `crearCuerpo` y su API (`agregarPin`, `borrarPin`, `limpiarPines`, `vista`, `snapshot`) no cambian.

- [ ] **Step 1: Cambiar el tinte de resalte de cian a verde marca**

Reemplazar:
```js
    if (malla && malla !== resaltada) malla.material.emissive.setHex(0x0e5a6a);
```
por:
```js
    if (malla && malla !== resaltada) malla.material.emissive.setHex(0x14532d); // verde marca (green-900), tenue sobre la piel
```

`COLOR_PIN` (0xdc2626) y `PIEL` no cambian.

- [ ] **Step 2: Verificar a mano**

Servir (`python3 -m http.server 8765`) y abrir `http://localhost:8765/` en un navegador. Pasar el cursor por el abdomen: la pieza se tiñe de verde tenue y la etiqueta de región aparece arriba a la derecha en una pastilla gris oscura. Hacer clic: el diálogo abre con esquinas de 24 px, y el botón "Cancelar" es azul claro. Guardar: el pin es rojo.

- [ ] **Step 3: Commit**

```bash
git add cuerpo3d.js
git commit -m "feat(marca): resalte verde en la figura 3D"
```

---

### Task 5: Verificación visual, impresión y README

**Files:**
- Modify: `README.md` (sección de pruebas, junto a `node test_relato.js`, línea ~77, y tabla de pruebas, línea ~250)

- [ ] **Step 1: Capturas de escritorio y móvil**

```bash
python3 -m http.server 8765 >/dev/null 2>&1 &
CH=$(ls -d ~/.cache/ms-playwright/chromium-*/chrome-linux*/chrome | head -1)
$CH --headless=new --no-sandbox --hide-scrollbars --virtual-time-budget=8000 --window-size=1440,1800 --screenshot=/tmp/marca_1440.png http://localhost:8765/
$CH --headless=new --no-sandbox --hide-scrollbars --virtual-time-budget=8000 --window-size=390,1600 --screenshot=/tmp/marca_390.png http://localhost:8765/
```
Revisar ambas imágenes. Esperado a 390 px: hero compacto sin chips, la tarjeta de resultado sube encima del formulario (`order: -1`, sin cambios) y nada se solapa con la barra inferior.

- [ ] **Step 2: Nivel IV frente a botón verde (Review Focus 1)**

En el navegador: cargar el escenario "Niña de 10 años con dolor abdominal", abrir "Evaluación de enfermería" y comprobar la banda de resultado. Si no sale nivel IV, poner la intensidad del pin en 4 (dolor leve). Confirmar a simple vista que la banda IV (`#16a34a`, texto del color que define `triaje.js`) y el botón "Exportar" (`#15803d`→`#166534`, con icono) se distinguen. Si no se distinguen, **no** cambiar colores CTAS: cambiar el botón a `button.secundario` y reportarlo.

- [ ] **Step 3: Impresión intacta (Review Focus 3)**

Pulsar "Exportar informe (PDF)" y, en el diálogo de impresión, previsualizar. Esperado: igual que antes del rebrand. Sin barra, sin hero ni degradados; tablas en blanco y negro y el bloque de nivel con su color CTAS. `git diff ae95d0c -- index.html | grep -A2 -B2 '@media print'` solo debe mostrar `.hero` añadido.

- [ ] **Step 4: README**

En el bloque de pruebas sin navegador, debajo de `node test_relato.js   # extractor del relato`, añadir:
```
node test_marca.js    # contraste WCAG de la marca y colores CTAS intactos
```
En la tabla de pruebas, añadir la fila:
```
| Marca | `node test_marca.js` | Contraste AA de los tokens, colores de nivel PaedCTAS sin cambios, pilas de fuentes con genérica final |
```
Y en la sección de arquitectura o diseño, un párrafo:
```
**Marca.** Identidad visual adaptada de Bioprognostika: Source Serif 4 (wordmark), IBM Plex Sans (títulos), Source Sans 3 (texto), verde salud #15803d, azul #2563eb y menta/salvia. Los colores de nivel PaedCTAS son estándar clínico y no forman parte de la marca.
```

- [ ] **Step 5: Suite completa y commit**

Run: `node test_marca.js && node test_triaje.js && node test_relato.js` → todo en verde.

```bash
git add README.md
git commit -m "docs: marca Bioprognostika y test_marca.js en README"
```

---

## Self-review (hecho)

- **Cobertura:** tipografía (T1), paleta (T1), hero + wordmark + tagline + chips (T2), tarjetas/acordeones (T3.1), CTA primario/secundario (T3.3), panel de evidencia (T3.6), visor 3D (T4), móvil e impresión (T5). No queda ningún elemento de la tabla de análisis sin tarea.
- **Placeholders:** ninguno; cada cambio lleva el texto literal a buscar y el de reemplazo.
- **Nombres:** las variables que usan T2–T4 están todas definidas en el `:root` de T1 (`--acento-oscuro`, `--azul-suave`, `--azul-borde`, `--radio-l`, `--sombra-alta`, `--anillo`, `--fuente-*`). La clase `.secundario` se define en T3.3 antes de usarse en el markup del mismo paso.
- **Review Focus:** 1 → T5.2, 2 → T5.1, 3 → T5.3, 4 → `test_marca.js` (T1), 5 → T4.2.
