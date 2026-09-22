# Triaje Pediátrico Automatizado — Spec de diseño

## Contexto

El repo está vacío (solo `build_prompt.md`). Se pide un MVP estático (HTML + JS) de triaje pediátrico que:
1. Clasifique según un estándar internacional de 5 niveles → **PaedCTAS** (elegido por el usuario).
2. Tenga un modelo 3D del cuerpo (Three.js) rotable donde el acudiente/paciente pone pines de dolor con nota.
3. Permita simular escenarios con entrada manual de datos y exportar un **PDF con formato clínico** para el médico.
4. Incluya una sección aparte de **referencias médicas**, siga **ADLC** (Agent Development Lifecycle), **KISS**, y código comentado en **español**.

Decisiones tomadas con el usuario:
- Escala: PaedCTAS (Warren 2008 + actualización pediátrica CTAS 2016).
- Operador: **flujo mixto**. Acudiente rellena motivo, dolor 3D y notas; enfermería (o quien simula) rellena signos vitales. Sin signos vitales → resultado "provisional".
- ADLC = Agent Development Lifecycle (Plan → Build → Test → Deploy → Operate → Monitor), adaptado a prototipo.
- Enfoque técnico **A**: figura de primitivas Three.js con mallas nombradas + PDF vía `window.print()` con `@media print`. Sin bundler, sin backend, sin assets externos, una sola dependencia (Three.js 0.186 por CDN con import map).

Investigación realizada (fuentes primarias leídas, no inferidas):
- Warren DW, Jarvis A, LeBlanc L, Gravel J. *Revisions to the CTAS Paediatric Guidelines (PaedCTAS)*. CJEM 2008;10(3):224-32. PDF oficial en ctas-phctas.ca. Tablas 2–7 y 10 transcritas abajo.
- Bullard MJ et al. *Revisions to the CTAS Guidelines 2016*. CJEM 2017;19(S2):S18-27. Tiempos objetivo sin cambios; fiebre >38,5 °C limitada a 3–18 meses; sepsis (3 SIRS → II, 2 SIRS + aspecto enfermo → III).
- Beveridge R et al. CTAS implementation guidelines. CJEM 1999;1(suppl):S2-28. Niveles y tiempos.
- Dieckmann RA, Brownstein D, Gausche-Hill M. *The pediatric assessment triangle*. Pediatr Emerg Care 2010;26(4):312-5.
- Hicks CL et al. *Faces Pain Scale–Revised*. Pain 2001;93(2):173-83. Caras puntuadas 0,2,4,6,8,10; válida desde 4–5 años.
- Reilly PL et al. GCS pediátrica (Adelaide 1988); respuesta verbal <2 años: balbucea 5, llanto irritable 4, llora al dolor 3, gime al dolor 2, ninguna 1.
- Three.js: versión npm `latest` = 0.186.0; `CapsuleGeometry(radius, length, capSegments, radialSegments)` está en el núcleo.
- Limitación conocida: la lista CEDIS completa (165 motivos con niveles) es material educativo cerrado de CAEP. Solo se implementa lo publicado (Tabla 10 de Warren 2008) más motivos genéricos regidos por modificadores. Se documenta en README y en la UI.

---

## Diseño

### 1.1 Arquitectura y archivos

```
index.html            estructura, <style> con CSS (pantalla + @media print), import map Three.js 0.186 (jsDelivr), sección referencias
triaje.js             motor clínico puro (sin DOM): tablas PaedCTAS + clasificar(datos) → {nivel, provisional, reglas[]}
cuerpo3d.js           escena Three.js: figura de primitivas con mallas nombradas, OrbitControls, raycast, pines, snapshot
app.js                pegamento: formulario ↔ estado ↔ triaje.js ↔ cuerpo3d.js ↔ informe imprimible; localStorage; escenarios
test_triaje.html      casos clínicos con assert; abre en navegador, verde/rojo
README.md             uso, alcance, limitaciones, ADLC, checklist manual, referencias
docs/superpowers/specs/2026-09-21-triaje-pediatrico-design.md   copia de este spec (Parte 1), commiteada
```

Estado: un objeto `paciente` en memoria:
```js
{ edadMeses, sexo, motivo, fiebreReciente, inmunodeprimido, alergias, observaciones,
  pines: [{ id, region, lado, cara, x, y, z, intensidad, nota }],
  vitales: { fr, fc, sat, temp, gcs },
  pat: { apariencia, respiracion, circulacion },      // booleanos "alterado"
  distRespiratoria: 'ninguna'|'leve'|'moderada'|'grave',
  hemodinamica: 'normal'|'depleccion'|'compromiso'|'shock',
  mecanismoAltoRiesgo: bool, dolorCronico: bool, sirs: 0..4 }
```
Persistencia: `localStorage` (clave `triaje-pediatrico`). Nada más.

Ejecución: `python3 -m http.server` (import map + módulos ES). Documentar en README.

### 1.2 Motor clínico PaedCTAS (`triaje.js`)

Regla maestra (Warren 2008, Discusión, punto 4): **siempre se asigna el nivel más urgente** que indique el motivo o cualquier modificador. `clasificar()` evalúa todas las reglas, devuelve `nivel = min(...)` y `reglas[]` con texto + fuente de cada regla disparada. Si no hay ningún signo vital → `provisional: true`.

Niveles y tiempos (Beveridge 1999; confirmados sin cambio en Bullard 2017):

| Nivel | Nombre | Tiempo a médico | Color CTAS |
|---|---|---|---|
| I | Reanimación | inmediato | azul |
| II | Emergente | ≤15 min | rojo |
| III | Urgente | ≤30 min | amarillo |
| IV | Menos urgente | ≤60 min | verde |
| V | No urgente | ≤120 min | blanco |

**Franjas de edad** de las tablas 5 y 6 (Warren 2008): 0–3 m, 3–6 m, 6–12 m, 1–3 a, 6 a, 10 a. El artículo da edades puntuales para las dos últimas; asignación adoptada y documentada como decisión de implementación (no afirmación clínica):
`<3m → 0–3m · <6m → 3–6m · <12m → 6–12m · <48m → 1–3a · <96m → "6a" · ≥96m → "10a"`.

**Tabla 5 — Frecuencia respiratoria (rpm)** columnas: I | II | III | IV–V | III | II | I
```
0–3 m : <10 | 10–20 | 20–30 | 30–60 | 60–70 | 70–80 | >80
3–6 m : <10 | 10–20 | 20–30 | 30–60 | 60–70 | 70–80 | >80
6–12 m: <10 | 10–17 | 17–25 | 25–45 | 45–55 | 55–60 | >60
1–3 a : <10 | 10–15 | 15–20 | 20–30 | 30–35 | 35–40 | >40
6 a   : <8  | 8–12  | 12–16 | 16–24 | 24–28 | 28–32 | >32
10 a  : <8  | 8–10  | 10–14 | 14–20 | 20–24 | 24–26 | >26
```
**Tabla 6 — Frecuencia cardíaca (lpm)** mismas columnas
```
0–3 m : <40 | 40–65 | 65–90 | 90–180 | 180–205 | 205–230 | >230
3–6 m : <40 | 40–63 | 63–80 | 80–160 | 160–180 | 180–210 | >210
6–12 m: <40 | 40–60 | 60–80 | 80–140 | 140–160 | 160–180 | >180
1–3 a : <40 | 40–58 | 58–75 | 75–130 | 130–145 | 145–165 | >165
6 a   : <40 | 40–55 | 55–70 | 70–110 | 110–125 | 125–140 | >140
10 a  : <30 | 30–45 | 45–60 | 60–90  | 90–105  | 105–120 | >120
```
Representación en código: por franja, un array de 6 cortes `[c1,c2,c3,c4,c5,c6]` y la regla: `v<c1→I, v<c2→II, v<c3→III, v≤c4→normal, v≤c5→III, v≤c6→II, else I`. Los límites compartidos (p. ej. 30 en "20–30 | 30–60") se resuelven hacia el lado normal. Documentar en comentario.

**Tabla 2 — SatO2**: <90 → I · <92 → II · 92–94 → III · >94 → sin efecto.
**Tabla 2 — Dificultad respiratoria** (cualitativa, elegida por enfermería): grave → I · moderada → II · leve → III.
**Tabla 3 — Hemodinámica**: shock → I · compromiso → II · depleción de volumen con SV anormales → III.
**Tabla 4 — Conciencia (GCS)**: 3–9 → I · 10–13 → II · 14–15 → sin efecto. GCS pediátrica <2 años en la UI (tooltip).

**Fiebre** (Warren 2008 §A + Bullard 2017 §8). Fiebre = temp ≥38,0 °C o "fiebre reciente" marcada (2016 permite historia de fiebre):
- <3 m con fiebre → II
- inmunodeprimido con fiebre → II
- 3–18 m, temp >38,5 °C: aspecto enfermo (PAT apariencia alterada) → II; aspecto bien → III
- >18 m con fiebre: aspecto enfermo → III; aspecto bien y SV normales → IV

**Dolor** (Warren 2008 §B), intensidad = máximo de los pines (FPS-R 0–10): 8–10 → II · 4–7 → III · 0–3 → IV · si `dolorCronico` baja 1 nivel (II→III, III→IV, IV→V).
**Mecanismo de lesión de alto riesgo** (Tabla 7) → II. Checkbox con las descripciones de la tabla en tooltip.
**Sepsis** (Bullard 2017): `sirs ≥3` → II · `sirs == 2` y apariencia alterada → III.
**PAT** (Dieckmann 2010; Warren 2008 §4): 1–2 lados alterados → al menos II · 3 lados → I.

**Motivos de consulta** (select). Con nivel base publicado (Tabla 10, Warren 2008):
- Estridor: compromiso vía aérea I · marcado II · audible III
- Apnea en lactante: episodio en presentación I · reciente II · historia III
- Llanto inconsolable: SV anormales II · SV estables III · irritable pero consolable IV
- Niño hipotónico: sin tono II · tono disminuido III
- Trastorno de marcha/dolor al caminar: con fiebre III · camina con dificultad IV
- Problema congénito: riesgo de deterioro rápido / vómitos-diarrea en metabólico-DM1-insuf. suprarrenal II · cuidador identifica necesidad III · estable IV
- Preocupación por bienestar del paciente: situación inestable I · riesgo de fuga/abuso continuo II · agresión >48 h III · antecedentes IV
Cada motivo con subopciones expone un segundo select "gravedad" con esos textos. Motivos genéricos sin nivel base publicado (fiebre, vómitos/diarrea, tos/congestión, dolor abdominal, trauma de extremidad, cefalea, erupción, otro): nivel base V, gobernado íntegramente por modificadores; la UI lo indica ("nivel por modificadores").

Salida: `{ nivel: 1..5, provisional: bool, reglas: [{ texto, fuente }] }`. Si ninguna regla dispara y no hay SV → nivel V provisional.

### 1.2b Relato libre y extractor determinista (`relato.js`) — añadido 2026-09-21

El acudiente escribe "qué le pasa" en texto libre. `analizarRelato(texto, edadMeses)` devuelve hallazgos estructurados sin usar modelos de lenguaje:
- Normalización (minúsculas, sin acentos) y diccionario `CONCEPTOS` con sinónimos como expresiones regulares con límites de palabra. Cada concepto: categoría, etiqueta, `nivel` (o `null` si es alerta informativa), `efecto` opcional (`fiebre`, `inmunodeprimido`), cita, y `edadMaxMeses` opcional (criterios de lactante).
- Negación: negador ("no", "sin", "niega", "nunca", "tampoco", "ni") en las tres palabras previas sin cruzar coma, punto ni "pero". Formas como "no para de llorar" se incluyen completas en el patrón para no negarlas. Una afirmación posterior prevalece sobre una negación.
- Números con contexto: temperatura (35–42 con decimal o "grados"; ≥38 crea hallazgo de fiebre), duración ("desde hace 3 días"), metros y escalones de una caída (>1 m o ≥5 escalones → hallazgo nivel II, Tabla 7).
- Solo se asigna nivel cuando el descriptor coincide con un modificador publicado (Tablas 2, 3, 4, 7 y 10 de [1]); lo demás es alerta.

Integración con `clasificar()`: `paciente.hallazgos` filtrados por `!negado && !descartado`. Los de `nivel` entran como regla "Relato: …" con su cita; `efecto: 'fiebre'` e `'inmunodeprimido'` alimentan las reglas existentes; reglas cruzadas de la Tabla 10: enfermedad crónica de riesgo + vómitos → II, cojera + fiebre → III. Enfermería descarta hallazgos con una casilla (persistido por clave en `hallazgosDescartados`). La tarjeta muestra el impacto (nivel sin relato → con relato) y el informe incluye el relato literal, la tabla de hallazgos con evidencia, nivel y estado, y los datos extraídos.

Campos de tratamiento (añadidos 2026-09-21): `tratamientoActual` (lo administrado para la dolencia de hoy) y `tratamientoHabitual` (medicación crónica). Ambos se imprimen en el informe en una tabla "Tratamientos". El texto del tratamiento habitual pasa por `analizarRelato` y se conservan solo los hallazgos de categoría `riesgo` (marcados con `origen: 'tratamiento habitual'`), que se fusionan con los del relato sin duplicar claves.

### 1.3 UI y modelo 3D

Layout: dos columnas (apilado <900 px). Minimalista: fuente del sistema, fondo claro, un acento, colores CTAS solo en la tarjeta de resultado. Todos los campos con `<label>`.

Columna izquierda, tres `<details>`:
1. **Paciente (acudiente)**: edad (número + unidad meses/años), sexo, motivo (+ gravedad si aplica), fiebre reciente, inmunodeprimido, alergias, observaciones.
2. **Dolor (acudiente + niño)**: canvas 3D, botones Frente/Espalda/Reiniciar vista, lista de pines (región · lado · cara · intensidad · nota · borrar). Al colicar en el cuerpo aparece un mini-formulario: 6 caras FPS-R (radio buttons con SVG inline simples o emojis, valores 0,2,4,6,8,10), nota, dolor crónico, Guardar/Cancelar.
3. **Evaluación de enfermería (opcional)**: FR, FC, SatO2, temperatura, GCS, PAT (3 checkboxes "alterado"), dificultad respiratoria, estado hemodinámico, mecanismo de alto riesgo, criterios SIRS (0–4).

Columna derecha, tarjeta pegajosa (`position: sticky`): nivel romano grande, nombre, tiempo objetivo, banda de color CTAS, etiqueta "PROVISIONAL" si aplica, lista de reglas disparadas con fuente. Botones: **Exportar PDF**, **Escenario de ejemplo** (select con 3 casos: lactante 2 m febril → II; niño 6 a asma FR 26 Sat 93 → III; niña 10 a dolor abdominal 6/10 SV normales → III), **Limpiar**.

`cuerpo3d.js`:
- `crearCuerpo(canvas, onPinAdd, onPinSelect)` → `{ pines, agregarPin, borrarPin, vista('frente'|'espalda'), snapshot(vista) }`.
- Figura infantil, proporciones ~5 cabezas: cabeza (esfera), cuello, tronco de una sola pieza torneada (LatheGeometry aplanada en z; tórax/abdomen/pelvis se resuelven por la altura del punto tocado), brazo y antebrazo ×2, mano ×2, muslo y pierna ×2, pie ×2. Las extremidades son cápsulas cuyas tapas se centran exactamente en la articulación vecina, así los segmentos se funden sin costuras. `mesh.name` en español ("brazo izquierdo", "tronco"...). `MeshStandardMaterial` mate, luz hemisférica + direccional.
- `OrbitControls` (`three/addons/controls/OrbitControls.js`), sin pan, zoom limitado.
- Clic (pointerdown + pointerup sin arrastre): `Raycaster` contra las mallas del cuerpo; punto de impacto → esfera roja pequeña (pin) hija de la escena; `region = mesh.name`, `cara = punto.z >= 0 ? 'anterior' : 'posterior'`, `lado` ya incluido en el nombre de la malla para extremidades; para tronco/cabeza `lado = x>0 ? 'izquierdo' : 'derecho'` (izquierda del paciente = +x mirando al frente; documentar).
- Clic sobre pin existente → `onPinSelect(id)` (editar/borrar).
- `snapshot('frente'|'espalda')`: coloca la cámara, renderiza, devuelve `canvas.toDataURL('image/png')`. Requiere `preserveDrawingBuffer: true` o render inmediato antes de `toDataURL` (hacer render síncrono justo antes).
- Resize con `ResizeObserver`.

Accesibilidad básica: lista de pines es alternativa textual al 3D; foco visible; contraste AA en texto.

### 1.3b Sistema de diseño (revisión 2026-09-21, guiado por ui-ux-pro-max)

Estilo "accesible y ético" recomendado para sanidad: paleta cian calmado + verde salud (primario `#0891b2`, acento `#059669`, texto `#164e63`, fondo `#f4f9fb`, bordes `#cfe3ea`), tipografía Figtree con Noto Sans y system-ui de reserva, base 16 px. Reglas aplicadas: objetivos táctiles mínimos de 44 px, anillos de foco de 3 px, transiciones de 120–200 ms, `prefers-reduced-motion` respetado, iconos SVG inline (sin emojis), etiquetas visibles en todos los campos, enlace "saltar al resultado". Componentes: cabecera fija con marca, pasos numerados en cada tarjeta plegable, escala visual de los cinco niveles bajo la banda de resultado, barra fija inferior en móvil (<900 px) con el nivel actual, y en el visor 3D leyenda de uso, etiqueta con la región bajo el cursor y botones de vista con icono. Colores CTAS solo en resultado, escala y hallazgos.

Visor 3D: tone mapping ACES y espacio de color sRGB, luz hemisférica + direccional principal con sombra (mapa 1024) + relleno frío, suelo invisible con `ShadowMaterial` para sombra de contacto, material por pieza para resaltar la región bajo el cursor (emissive), cursor `pointer`/`grab` según el objetivo, pines rojos emisivos.

### 1.4 Informe imprimible (PDF)

`<section id="informe" hidden-en-pantalla>` rellenada por `app.js` antes de `window.print()`. `@media print`: ocultar `#app`, mostrar `#informe`, A4, márgenes 15 mm, `color-adjust: exact` para la banda de color.

Contenido en orden clínico:
1. Encabezado: "Informe de pre-triaje pediátrico (simulación)", fecha/hora, ID aleatorio corto.
2. Paciente: edad, sexo, alergias, inmunodeprimido.
3. Motivo de consulta y gravedad.
4. Signos vitales: tabla valor · rango normal para su edad (de tablas 5/6) · nivel que aporta. Vacío → "no registrado".
5. PAT y modificadores cualitativos.
6. Dolor: dos imágenes (frente, espalda) del canvas con pines + tabla región · lado · cara · intensidad FPS-R · nota.
7. **Resultado**: nivel, nombre, tiempo objetivo, banda de color, "PROVISIONAL" si aplica.
8. Justificación: reglas disparadas con fuente.
9. Observaciones del acudiente.
10. Pie: "Prototipo de simulación con fines educativos. No sustituye la valoración clínica. Basado en PaedCTAS (Warren 2008; Bullard 2017)."

### 1.5 Referencias (sección propia en `index.html` y README)

Formato Vancouver, numeradas. Cada regla en `triaje.js` cita `[n]` en su comentario.
1. Warren DW, Jarvis A, LeBlanc L, Gravel J; CTAS NWG. Revisions to the Canadian Triage and Acuity Scale paediatric guidelines (PaedCTAS). CJEM. 2008;10(3):224-32.
2. Bullard MJ, Musgrave E, Warren D, et al. Revisions to the Canadian Emergency Department Triage and Acuity Scale (CTAS) Guidelines 2016. CJEM. 2017;19(S2):S18-27. doi:10.1017/cem.2017.365
3. Beveridge R, Clark B, Janes L, et al. Canadian Emergency Department Triage and Acuity Scale: implementation guidelines. CJEM. 1999;1(suppl):S2-28.
4. Warren D, Jarvis A, LeBlanc L; National Triage Task Force. Canadian Paediatric Triage and Acuity Scale: implementation guidelines for emergency departments. CJEM. 2001;3(suppl):S1-27.
5. Bullard MJ, Unger B, Spence J, Grafstein E; CTAS NWG. Revisions to the CTAS adult guidelines. CJEM. 2008;10(2):136-42.
6. Grafstein E, Bullard MJ, Warren D, Unger B; CTAS NWG. Revision of the CEDIS Presenting Complaint List version 1.1. CJEM. 2008;10(2):151-61.
7. Gravel J, Manzano S, Arsenault M. Safety of a modification of the triage level for febrile children 6 to 36 months old using the PaedCTAS. CJEM. 2008;10(1):32-7.
8. Dieckmann RA, Brownstein D, Gausche-Hill M. The pediatric assessment triangle: a novel approach for the rapid evaluation of children. Pediatr Emerg Care. 2010;26(4):312-5.
9. Hicks CL, von Baeyer CL, Spafford PA, van Korlaar I, Goodenough B. The Faces Pain Scale–Revised: toward a common metric in pediatric pain measurement. Pain. 2001;93(2):173-83.
10. Reilly PL, Simpson DA, Sprod R, Thomas L. Assessing the conscious level in infants and young children: a paediatric version of the Glasgow Coma Scale. Childs Nerv Syst. 1988;4(1):30-3.
11. Gravel J, Gouin S, Bailey B, et al. Reliability of a computerized version of the Pediatric Canadian Triage and Acuity Scale. Acad Emerg Med. 2007;14:864-9.

Nota: la referencia 10 debe verificarse (título/revista exactos) al implementar; el resto fueron leídas en las fuentes primarias durante el diseño.

### 1.6 Pruebas

`test_triaje.html`: importa `triaje.js`, ejecuta ~15 casos con `console.assert` + render de lista verde/rojo en la página. Casos mínimos:
- Lactante 2 m, temp 38,3 → II (fiebre <3 m).
- 8 m, temp 38,7, apariencia alterada → II; misma edad apariencia normal → III.
- 4 a, fiebre, aspecto bien, SV normales → IV.
- 6 a, FR 26, Sat 93, resto normal → III (FR III y Sat III).
- 6 a, FR 33 → I. 10 a, FC 25 → I. 10 a, FC 110 → II. 10 a, FC 125 → I.
- GCS 8 → I; GCS 12 → II; GCS 15 → sin efecto.
- Dolor máximo 9 → II; 5 → III; 2 → IV; 9 crónico → III.
- Mecanismo alto riesgo → II. SIRS 3 → II. PAT 3 lados → I.
- Estridor "audible" → III; "marcado" → II.
- Sin SV, motivo genérico, sin pines → V provisional.
- Límite compartido: 1–3 a FR 30 → normal (no III).
- Regla maestra: fiebre >18 m aspecto bien (IV) + dolor 9 (II) → II.

Verificación manual (checklist en README): rotar figura, poner/editar/borrar pin frente y espalda, región correcta en lista, resultado cambia en vivo, escenario de ejemplo carga y da el nivel esperado, recarga conserva datos, Limpiar borra, Exportar PDF muestra informe con 2 imágenes y banda de color en vista previa de impresión.

### 1.7 ADLC (Agent Development Lifecycle)

Adaptación para un prototipo sin agente desplegado; documentada en README:
- **Plan**: este spec, fuentes primarias verificadas, decisiones de alcance.
- **Build**: tareas pequeñas de la Parte 2, código comentado en español con cita `[n]` por regla.
- **Test**: `test_triaje.html` + checklist manual.
- **Deploy**: estático; `python3 -m http.server` o cualquier hosting de archivos.
- **Operate / Monitor**: fuera de alcance del MVP. README lista qué haría falta: registro anónimo de casos simulados, validación con enfermería de triaje, revisión de reglas ante nuevas versiones CTAS, métricas de sobre/subtriaje.

### 1.8 Fuera de alcance (YAGNI)
Backend, autenticación, multi-idioma, otras escalas (ESI/MTS/ATS/SET), lista CEDIS completa, modelo GLB realista, FLACC para <4 años (se usa FPS-R declarada por acudiente y se anota la limitación), impresión directa a archivo sin diálogo.

---

