# Triaje Pediátrico Automatizado · PaedCTAS

Prototipo funcional (MVP) de **pre-triaje pediátrico** en HTML y JavaScript, sin backend ni
herramientas de compilación. Clasifica según la **Escala Canadiense de Triaje y Agudeza Pediátrica
(PaedCTAS)**, incluye una **figura 3D interactiva** (Three.js) donde el paciente o su acudiente marca
dónde le duele, interpreta el **relato libre** del acudiente con un motor determinista y exporta un
**informe clínico en PDF** para el médico.

> **Aviso.** Simulador con fines educativos. No sustituye la valoración clínica ni un sistema de
> triaje certificado. No introducir datos reales de pacientes.

---

## Índice

1. [Características](#características)
2. [Requisitos y ejecución](#requisitos-y-ejecución)
3. [Flujo de uso](#flujo-de-uso)
4. [Arquitectura](#arquitectura)
5. [Motor clínico PaedCTAS](#motor-clínico-paedctas)
6. [Extractor determinista del relato](#extractor-determinista-del-relato)
7. [Figura 3D](#figura-3d)
8. [Informe PDF](#informe-pdf)
9. [Diseño de la interfaz](#diseño-de-la-interfaz)
10. [Pruebas y verificación](#pruebas-y-verificación)
11. [ADLC](#adlc-agent-development-lifecycle)
12. [Alcance y limitaciones](#alcance-y-limitaciones)
13. [Referencias médicas y publicaciones](#referencias-médicas-y-publicaciones)

---

## Características

- **Cinco niveles PaedCTAS** con tiempo objetivo de valoración médica y paleta oficial de colores.
- **Flujo mixto**: el acudiente rellena motivo, relato, tratamientos y dolor; enfermería añade signos vitales
  y modificadores. Sin signos vitales el resultado se marca **PROVISIONAL**.
- **Relato libre interpretado sin modelos de lenguaje**: diccionario clínico en español, negación, extracción
  de temperatura, duración y altura de caída. Cada hallazgo muestra su evidencia literal, su cita y si cuenta
  o no en el triaje. Enfermería puede descartar cualquiera.
- **Campos de tratamiento**: lo administrado para la dolencia actual y la medicación habitual. De la habitual
  se extraen riesgos (inmunosupresión, diabetes, anticoagulación) que sí afectan al nivel.
- **Figura 3D** rotable con regiones anatómicas nombradas, pines de dolor con escala de caras FPS-R y nota,
  resalte de la región bajo el cursor.
- **Justificación trazable**: cada regla disparada cita la tabla y publicación de la que procede.
- **Informe clínico A4** con signos vitales frente a rangos normales por edad, dos vistas del cuerpo con los
  pines, tabla de hallazgos del relato, nivel con color y justificación.
- **Tres escenarios de ejemplo** para simular, persistencia local y botón de limpiar.
- **Accesible**: etiquetas visibles, foco de teclado, objetivos táctiles de 44 px, lista textual alternativa
  al 3D, `prefers-reduced-motion`, barra de resultado fija en móvil.

---

## Requisitos y ejecución

Navegador moderno con WebGL. Los módulos ES y el import map de Three.js exigen servir los archivos
por HTTP (no funciona abriendo el archivo con `file://`).

```bash
git clone <este-repositorio>
cd Claude_Build_Day
python3 -m http.server 8000
```

| URL | Contenido |
|---|---|
| `http://localhost:8000/` | Aplicación |
| `http://localhost:8000/test_triaje.html` | Pruebas del motor clínico en el navegador |

Dependencias externas cargadas por CDN la primera vez: Three.js 0.186 (jsDelivr) y las fuentes Figtree y
Noto Sans (Google Fonts). Sin conexión la aplicación funciona con la tipografía del sistema, pero el visor 3D
necesita haber cacheado Three.js.

Pruebas sin navegador (Node 18 o superior):

```bash
node test_triaje.js   # motor clínico
node test_relato.js   # extractor del relato
```

---

## Flujo de uso

1. **Paciente** (acudiente). Edad, sexo, motivo de consulta, fiebre reciente, inmunosupresión, alergias,
   tratamiento ya administrado, tratamiento habitual y el relato libre "¿Qué le pasa?". Bajo el relato
   aparecen los hallazgos reconocidos con una casilla para contarlos o no.
2. **¿Dónde le duele?** (acudiente y niño). Girar la figura, tocar la zona, elegir la cara de dolor
   (0, 2, 4, 6, 8, 10) y escribir una nota. Los pines se listan bajo la figura y pueden editarse o borrarse.
3. **Evaluación de enfermería** (opcional). Frecuencia respiratoria y cardíaca, SatO₂, temperatura, Glasgow,
   criterios SIRS, triángulo de evaluación pediátrica, dificultad respiratoria, estado hemodinámico y
   mecanismo de lesión de alto riesgo.
4. **Resultado**. La tarjeta se recalcula con cada cambio: nivel, tiempo objetivo, escala de los cinco niveles,
   reglas que lo justifican e impacto del relato (nivel con y sin relato).
5. **Exportar informe (PDF)**. Abre el diálogo de impresión del navegador; elegir "Guardar como PDF".

Los escenarios de ejemplo cargan casos completos: lactante de 2 meses con fiebre (II), niño de 6 años con
crisis de asma (III) y niña de 10 años con dolor abdominal (III).

---

## Arquitectura

Cuatro módulos ES y una página. Sin bundler, sin framework, sin backend. Estado en un único objeto
`paciente` persistido en `localStorage`.

```
index.html          Estructura, estilos (pantalla e impresión), import map de Three.js, referencias
app.js              Pegamento: formulario ↔ estado ↔ motor ↔ 3D ↔ informe; escenarios; localStorage
triaje.js           Motor clínico PaedCTAS, puro (sin DOM): tablas y clasificar(paciente)
relato.js           Extractor determinista del relato libre, puro: analizarRelato(texto, edadMeses)
cuerpo3d.js         Figura 3D de primitivas, cámara orbital, raycast, pines, capturas para el informe
test_triaje.js      Casos clínicos del motor (Node o navegador vía test_triaje.html)
test_relato.js      Casos del extractor (Node)
docs/superpowers/specs/2026-09-21-triaje-pediatrico-design.md   Documento de diseño
```

```
acudiente / enfermería
        │  formulario
        ▼
      app.js ──► relato.js ──► hallazgos[] ──┐
        │                                     ▼
        ├──────────────────────────────► triaje.js ──► { nivel, provisional, reglas[] }
        │                                     │
        ├──► cuerpo3d.js (pines, capturas) ◄──┘ tarjeta de resultado
        ▼
   #informe (HTML) ──► window.print() ──► PDF
```

`triaje.js` y `relato.js` no tocan el DOM: reciben datos y devuelven resultados, por eso se prueban con Node.

---

## Motor clínico PaedCTAS

Regla maestra publicada: **se asigna el nivel más urgente** que indique el motivo o cualquier modificador.
`clasificar()` evalúa todas las reglas, se queda con el mínimo y devuelve la lista de reglas disparadas
con su cita.

| Nivel | Nombre | Valoración médica | Color |
|---|---|---|---|
| I | Reanimación | inmediato | azul |
| II | Emergente | ≤ 15 min | rojo |
| III | Urgente | ≤ 30 min | amarillo |
| IV | Menos urgente | ≤ 60 min | verde |
| V | No urgente | ≤ 120 min | blanco |

Reglas implementadas, todas tomadas de publicaciones (números entre corchetes en
[Referencias](#referencias-médicas-y-publicaciones)):

- **Frecuencia respiratoria y cardíaca por edad**, Tablas 5 y 6 de [1], transcritas tal cual para las franjas
  0–3 m, 3–6 m, 6–12 m, 1–3 a, 6 a y 10 a. Los límites compartidos entre columnas se resuelven hacia el lado
  menos urgente.
- **SatO₂**: < 90 % → I, < 92 % → II, 92–94 % → III (Tabla 2 de [1]).
- **Nivel de conciencia (Glasgow)**: 3–9 → I, 10–13 → II (Tabla 4 de [1]); respuesta verbal pediátrica
  para menores de 2 años [10].
- **Dificultad respiratoria** grave/moderada/leve → I/II/III y **estado hemodinámico** shock/compromiso/
  depleción → I/II/III, valoración cualitativa de enfermería (Tablas 2 y 3 de [1]).
- **Fiebre** (≥ 38,0 °C o historia reciente): < 3 meses → II; inmunodeprimido → II; 3–18 meses con > 38,5 °C
  → II si aspecto enfermo, III si buen aspecto (actualización 2016, [2]); mayores → III con aspecto enfermo,
  IV con buen aspecto ([1] §A).
- **Dolor** (FPS-R, pin más intenso): 8–10 → II, 4–7 → III, 0–3 → IV; crónico baja un nivel ([1] §B, [9]).
- **Mecanismo de lesión de alto riesgo** → II (Tabla 7 de [1]).
- **Sepsis**: ≥ 3 criterios SIRS → II; 2 criterios con aspecto enfermo → III [2].
- **Triángulo de evaluación pediátrica** [8]: uno o dos lados alterados → al menos II; los tres → I.
- **Motivos con nivel publicado** (Tabla 10 de [1]): estridor, apnea en lactante, llanto inconsolable,
  niño hipotónico, trastorno de la marcha, problema congénito y preocupación por el bienestar del paciente,
  cada uno con sus descripciones y niveles. Los motivos genéricos (fiebre, vómitos, tos, dolor abdominal,
  trauma de extremidad, cefalea, erupción) no tienen nivel base publicado en abierto y se rigen por
  los modificadores.

---

## Extractor determinista del relato

`analizarRelato(texto, edadMeses)` convierte el texto libre en hallazgos estructurados sin ningún modelo
de lenguaje:

- **Normalización**: minúsculas y sin acentos.
- **Diccionario** de 40 conceptos con sinónimos en lenguaje del acudiente, expresados como expresiones
  regulares con límites de palabra. Cada concepto tiene categoría (respiratorio, circulación, conciencia,
  fiebre, trauma, riesgo, dolor, otros), etiqueta clínica, cita y, cuando el descriptor coincide con un
  modificador publicado, nivel. Los ambiguos son **alertas informativas** sin nivel.
- **Negación**: "no", "sin", "niega", "nunca", "tampoco" o "ni" en las tres palabras previas, sin cruzar
  coma, punto ni "pero". Expresiones como "no para de llorar" se incluyen completas en el patrón para no
  negarlas. Una afirmación posterior prevalece sobre una negación anterior.
- **Números con contexto**: temperatura (35–42 con decimal o "grados"; ≥ 38 crea hallazgo de fiebre),
  duración ("desde hace 8 horas") y caídas (> 1 m o ≥ 5 escalones → nivel II por la Tabla 7).
- **Efectos**: la fiebre y la inmunosupresión referidas alimentan las reglas del motor que dependen de la
  edad y el aspecto. Reglas cruzadas de la Tabla 10: enfermedad metabólica, diabetes o insuficiencia
  suprarrenal con vómitos → II; cojera con fiebre → III.
- **Control de enfermería**: cada hallazgo puede descartarse con una casilla; los negados aparecen tachados.
  El informe recoge el relato literal y la tabla de hallazgos con evidencia, nivel y estado.

Ejemplo: "Se puso morado y le cuesta respirar desde hace 2 horas" produce *Cianosis referida* (I, Tabla 2),
*Dificultad respiratoria referida* (II, Tabla 2) y duración "2 horas".

---

## Figura 3D

Construida con primitivas de Three.js, sin modelos externos ni licencias que verificar.

- Tronco de una pieza torneada (`LatheGeometry`), extremidades como cápsulas cuyos extremos coinciden en
  la articulación vecina para fundirse sin costuras, cabeza, cuello, manos y pies.
- Cada pieza lleva su nombre en español (`brazo izquierdo`, `muslo derecho`…); en el tronco la región
  (tórax, abdomen, pelvis) se resuelve por la altura del punto tocado. La izquierda del paciente está en +x.
- Un toque coloca un pin (esfera roja) y abre el diálogo de intensidad y nota; tocar un pin lo edita o borra.
  Arrastrar gira la figura; botones Frente y Espalda. La región bajo el cursor se resalta y se nombra.
- Tone mapping ACES, sombra de contacto sobre un suelo invisible y luz de relleno.
- Para el informe se capturan las vistas frontal y posterior con los pines.

---

## Informe PDF

El botón *Exportar informe* rellena una sección oculta y llama a `window.print()`; el CSS de impresión
oculta la aplicación y muestra solo el informe en A4. Contenido, en orden clínico:

1. Encabezado con fecha, identificador de simulación y escala.
2. Paciente: edad y franja, sexo, alergias, inmunosupresión.
3. Motivo de consulta y descripción.
4. Tratamientos: administrado para la dolencia actual y habitual.
5. Signos vitales con el rango normal para su edad; "no registrado" si faltan.
6. Triángulo pediátrico y modificadores cualitativos.
7. Dolor: dos imágenes del cuerpo y tabla de pines con zona, FPS-R y nota.
8. Resultado: nivel, nombre, tiempo objetivo y banda de color; PROVISIONAL si procede.
9. Justificación con la cita de cada regla.
10. Relato del acudiente literal, tabla de hallazgos estructurados y datos extraídos.
11. Pie con el aviso de simulación.

---

## Diseño de la interfaz

Sistema de diseño elaborado con el skill *ui-ux-pro-max*, estilo "accesible y ético" recomendado para
sanidad: paleta cian calmado y verde salud (primario `#0891b2`, acento `#059669`, texto `#164e63`),
tipografía Figtree y Noto Sans a 16 px, objetivos táctiles de 44 px, anillos de foco de 3 px,
transiciones de 120–200 ms, `prefers-reduced-motion`, iconos SVG y colores CTAS reservados al resultado.
Pasos numerados, tarjeta de resultado con escala de los cinco niveles y barra fija inferior en pantallas
menores de 900 px.

---

## Pruebas y verificación

| Prueba | Cómo | Cobertura |
|---|---|---|
| Motor clínico | `node test_triaje.js` o `test_triaje.html` | 44 casos: tablas por edad, límites compartidos, fiebre por edad, dolor, GCS, PAT, SIRS, motivos, regla maestra, hallazgos del relato |
| Extractor | `node test_relato.js` | 18 casos: acentos, negación, "no para de", temperatura, caídas, criterios de lactante |
| Interfaz | Checklist manual | Ver abajo |

Checklist manual:

- [ ] La figura rota y hace zoom; Frente y Espalda funcionan; la región se resalta al pasar el cursor.
- [ ] Un pin en el abdomen aparece en la lista con región, lado y cara; en la espalda marca "posterior".
- [ ] Editar y borrar un pin actualizan lista y figura.
- [ ] Escribir "se puso morado" en el relato → hallazgo Cianosis (I) y nivel I; desmarcarlo → vuelve al nivel previo.
- [ ] Escribir "no tiene fiebre" → hallazgo Fiebre tachado como negado, sin efecto.
- [ ] "Quimioterapia" en tratamiento habitual con fiebre en el relato → nivel II.
- [ ] Cambiar la frecuencia respiratoria a 33 en un niño de 6 años → nivel I (azul).
- [ ] Los tres escenarios cargan y dan II, III y III.
- [ ] Recargar conserva los datos; Limpiar los borra.
- [ ] Exportar: la vista previa muestra dos imágenes del cuerpo, la banda de color y PROVISIONAL cuando aplica.
- [ ] A 375 px no hay desplazamiento horizontal y la barra inferior muestra el nivel.

---

## ADLC (Agent Development Lifecycle)

Adaptación del ciclo Plan → Build → Test → Deploy → Operate → Monitor a un prototipo:

| Fase | Qué se hizo |
|---|---|
| Plan | Investigación en fuentes primarias (PaedCTAS 2008, CTAS 2016, PAT, FPS-R), decisiones de alcance y spec en `docs/superpowers/specs/` |
| Build | Tareas pequeñas y verificables; código comentado en español; cada regla cita su fuente |
| Test | Pruebas unitarias del motor y del extractor, verificación de extremo a extremo en navegador, checklist manual |
| Deploy | Archivos estáticos servibles desde cualquier servidor HTTP |
| Operate / Monitor | Fuera del alcance del MVP. Haría falta registro anónimo de casos, validación con enfermería de triaje, revisión de reglas ante nuevas versiones de CTAS y métricas de sobre- y subtriaje |

---

## Alcance y limitaciones

- Solo se implementan reglas **publicadas** de PaedCTAS. La lista CEDIS completa (165 motivos con niveles)
  es material educativo de CAEP no disponible en abierto.
- Las tablas de frecuencias dan edades puntuales "6 años" y "10 años"; este MVP las aplica a 4–8 años y
  ≥ 8 años. Es una decisión de implementación, no una afirmación clínica.
- La FPS-R es válida desde 4–5 años; en menores se registra la percepción del acudiente. Las caras son un
  dibujo propio con la misma puntuación, no las imágenes originales de IASP.
- El extractor no lematiza, no corrige ortografía ni interpreta frases complejas; la negación es heurística.
  Solo asigna nivel cuando el descriptor coincide con un modificador publicado.
- El tratamiento administrado para la dolencia actual es informativo: PaedCTAS no publica una regla que
  cambie el nivel por haber dado un antitérmico o un broncodilatador.
- Fuera de alcance: otras escalas (ESI, MTS, ATS, SET/MAT), backend, autenticación, varios idiomas.

---

## Referencias médicas y publicaciones

1. Warren DW, Jarvis A, LeBlanc L, Gravel J; CTAS National Working Group. Revisions to the Canadian Triage and Acuity Scale paediatric guidelines (PaedCTAS). *CJEM*. 2008;10(3):224-32.
2. Bullard MJ, Musgrave E, Warren D, et al. Revisions to the Canadian Emergency Department Triage and Acuity Scale (CTAS) Guidelines 2016. *CJEM*. 2017;19(S2):S18-27. doi:10.1017/cem.2017.365
3. Beveridge R, Clark B, Janes L, et al. Canadian Emergency Department Triage and Acuity Scale: implementation guidelines. *CJEM*. 1999;1(suppl):S2-28.
4. Warren D, Jarvis A, LeBlanc L; National Triage Task Force. Canadian Paediatric Triage and Acuity Scale: implementation guidelines for emergency departments. *CJEM*. 2001;3(suppl):S1-27.
5. Bullard MJ, Unger B, Spence J, Grafstein E; CTAS National Working Group. Revisions to the Canadian Emergency Department Triage and Acuity Scale (CTAS) adult guidelines. *CJEM*. 2008;10(2):136-42.
6. Grafstein E, Bullard MJ, Warren D, Unger B; CTAS National Working Group. Revision of the Canadian Emergency Department Information System (CEDIS) Presenting Complaint List version 1.1. *CJEM*. 2008;10(2):151-61.
7. Gravel J, Manzano S, Arsenault M. Safety of a modification of the triage level for febrile children 6 to 36 months old using the Paediatric Canadian Triage and Acuity Scale. *CJEM*. 2008;10(1):32-7.
8. Dieckmann RA, Brownstein D, Gausche-Hill M. The pediatric assessment triangle: a novel approach for the rapid evaluation of children. *Pediatr Emerg Care*. 2010;26(4):312-5.
9. Hicks CL, von Baeyer CL, Spafford PA, van Korlaar I, Goodenough B. The Faces Pain Scale–Revised: toward a common metric in pediatric pain measurement. *Pain*. 2001;93(2):173-83.
10. Reilly PL, Simpson DA, Sprod R, Thomas L. Assessing the conscious level in infants and young children: a paediatric version of the Glasgow Coma Scale. *Childs Nerv Syst*. 1988;4(1):30-3. doi:10.1007/BF00274080
11. Gravel J, Gouin S, Bailey B, Amre D. Reliability of a computerized version of the Pediatric Canadian Triage and Acuity Scale. *Acad Emerg Med*. 2007;14(10):864-9.

Otros sistemas de triaje de cinco niveles citados en el encargo y no implementados: Índice de Severidad de Emergencia (ESI), Sistema de Triaje de Manchester (MTS), Escala de Triaje Australasiana (ATS) y Sistema Español de Triaje / Modelo Andorrano (SET/MAT).
