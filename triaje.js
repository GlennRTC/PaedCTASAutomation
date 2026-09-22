// triaje.js — Motor clínico PaedCTAS. Módulo puro: no toca el DOM.
//
// Referencias (numeración compartida con README.md e index.html):
//   [1] Warren DW et al. Revisions to the CTAS paediatric guidelines (PaedCTAS). CJEM 2008;10(3):224-32.
//   [2] Bullard MJ et al. Revisions to the CTAS Guidelines 2016. CJEM 2017;19(S2):S18-27.
//   [3] Beveridge R et al. CTAS implementation guidelines. CJEM 1999;1(suppl):S2-28.
//   [8] Dieckmann RA et al. The pediatric assessment triangle. Pediatr Emerg Care 2010;26(4):312-5.
//   [9] Hicks CL et al. Faces Pain Scale–Revised. Pain 2001;93(2):173-83.
//
// Regla maestra [1, Discusión pto. 4]: se asigna siempre el nivel MÁS urgente que indique
// el motivo de consulta o cualquier modificador. clasificar() evalúa todas las reglas,
// se queda con el mínimo y devuelve la lista de reglas disparadas para justificarlo.

// Niveles CTAS, tiempos objetivo [3] (sin cambios en 2016 [2]) y paleta oficial [1, Revisión 1].
export const NIVELES = {
  1: { romano: 'I',   nombre: 'Reanimación',   tiempo: 'inmediato', color: '#1d4ed8', texto: '#fff' },
  2: { romano: 'II',  nombre: 'Emergente',     tiempo: '≤ 15 min',  color: '#dc2626', texto: '#fff' },
  3: { romano: 'III', nombre: 'Urgente',       tiempo: '≤ 30 min',  color: '#facc15', texto: '#111' },
  4: { romano: 'IV',  nombre: 'Menos urgente', tiempo: '≤ 60 min',  color: '#16a34a', texto: '#fff' },
  5: { romano: 'V',   nombre: 'No urgente',    tiempo: '≤ 120 min', color: '#f8fafc', texto: '#111' },
};

// Franjas de edad de las tablas 5 y 6 de [1]. El artículo da puntos "6 años" y "10 años";
// aplicarlos a 4–8 años y ≥8 años es una decisión de implementación (ver README).
export const FRANJAS = [
  { etiqueta: '0–3 meses',  maxMeses: 3 },
  { etiqueta: '3–6 meses',  maxMeses: 6 },
  { etiqueta: '6–12 meses', maxMeses: 12 },
  { etiqueta: '1–3 años',   maxMeses: 48 },
  { etiqueta: '6 años (4–8 a)',   maxMeses: 96 },
  { etiqueta: '10 años (≥8 a)',   maxMeses: Infinity },
];

export function franjaEdad(meses) {
  return FRANJAS.findIndex(f => meses < f.maxMeses);
}

// Tablas 5 y 6 de [1] como 6 cortes por franja: [c1, c2, c3, c4, c5, c6].
// Columnas del artículo:  I | II | III | IV–V | III | II | I
//                        <c1 |c1–c2|c2–c3|c3–c4 |c4–c5|c5–c6| >c6
// Los límites compartidos (p. ej. 30 en "20–30 | 30–60") se resuelven hacia el lado
// menos urgente, por eso las comparaciones son "<" a la izquierda y "<=" a la derecha.
export const TABLA_FR = [ // respiraciones/min
  [10, 20, 30, 60, 70, 80],
  [10, 20, 30, 60, 70, 80],
  [10, 17, 25, 45, 55, 60],
  [10, 15, 20, 30, 35, 40],
  [8, 12, 16, 24, 28, 32],
  [8, 10, 14, 20, 24, 26],
];
export const TABLA_FC = [ // latidos/min
  [40, 65, 90, 180, 205, 230],
  [40, 63, 80, 160, 180, 210],
  [40, 60, 80, 140, 160, 180],
  [40, 58, 75, 130, 145, 165],
  [40, 55, 70, 110, 125, 140],
  [30, 45, 60, 90, 105, 120],
];

// Devuelve 1, 2, 3 o null (normal) para un valor según la tabla y la franja.
export function nivelPorTabla(tabla, franja, v) {
  const [c1, c2, c3, c4, c5, c6] = tabla[franja];
  if (v < c1) return 1;
  if (v < c2) return 2;
  if (v < c3) return 3;
  if (v <= c4) return null;
  if (v <= c5) return 3;
  if (v <= c6) return 2;
  return 1;
}

// Rango normal (columna IV–V) para mostrarlo en el informe.
export function rangoNormal(tabla, franja) {
  const [, , c3, c4] = tabla[franja];
  return `${c3}–${c4}`;
}

// Motivos de consulta. Los que tienen "opciones" traen nivel publicado en la Tabla 10 de [1].
// Los genéricos no tienen nivel publicado en abierto (lista CEDIS cerrada): los gobiernan
// los modificadores.
export const MOTIVOS = [
  { clave: 'fiebre', etiqueta: 'Fiebre' },
  { clave: 'vomitos', etiqueta: 'Vómitos / diarrea' },
  { clave: 'tos', etiqueta: 'Tos / congestión' },
  { clave: 'dolor_abdominal', etiqueta: 'Dolor abdominal' },
  { clave: 'trauma', etiqueta: 'Traumatismo de extremidad' },
  { clave: 'cefalea', etiqueta: 'Cefalea' },
  { clave: 'erupcion', etiqueta: 'Erupción cutánea' },
  { clave: 'estridor', etiqueta: 'Estridor', opciones: [
    { clave: 'via_aerea', etiqueta: 'Compromiso de la vía aérea', nivel: 1 },
    { clave: 'marcado', etiqueta: 'Estridor marcado', nivel: 2 },
    { clave: 'audible', etiqueta: 'Estridor audible', nivel: 3 },
  ] },
  { clave: 'apnea', etiqueta: 'Episodios de apnea en lactante', opciones: [
    { clave: 'presente', etiqueta: 'Episodio apneico en la presentación', nivel: 1 },
    { clave: 'reciente', etiqueta: 'Episodio reciente compatible con apnea o compromiso respiratorio', nivel: 2 },
    { clave: 'historia', etiqueta: 'Historia de episodio compatible con apnea', nivel: 3 },
  ] },
  { clave: 'llanto', etiqueta: 'Llanto inconsolable en lactante', opciones: [
    { clave: 'sv_anormales', etiqueta: 'Inconsolable con signos vitales anormales', nivel: 2 },
    { clave: 'sv_estables', etiqueta: 'Inconsolable con signos vitales estables', nivel: 3 },
    { clave: 'consolable', etiqueta: 'Irritable pero consolable', nivel: 4 },
  ] },
  { clave: 'hipotonia', etiqueta: 'Niño hipotónico (floppy child)', opciones: [
    { clave: 'sin_tono', etiqueta: 'Sin tono, no sostiene la cabeza', nivel: 2 },
    { clave: 'tono_bajo', etiqueta: 'Tono muscular menor del esperado', nivel: 3 },
  ] },
  { clave: 'marcha', etiqueta: 'Trastorno de la marcha / dolor al caminar', opciones: [
    { clave: 'con_fiebre', etiqueta: 'Cojera o problema de marcha con fiebre', nivel: 3 },
    { clave: 'dificultad', etiqueta: 'Camina con dificultad', nivel: 4 },
  ] },
  { clave: 'congenito', etiqueta: 'Problema congénito conocido', opciones: [
    { clave: 'deterioro', etiqueta: 'Riesgo de deterioro rápido / vómitos-diarrea en enfermedad metabólica, DM1 o insuficiencia suprarrenal', nivel: 2 },
    { clave: 'cuidador', etiqueta: 'El cuidador identifica necesidad de atención', nivel: 3 },
    { clave: 'estable', etiqueta: 'Estable, con potencial de problemas', nivel: 4 },
  ] },
  { clave: 'bienestar', etiqueta: 'Preocupación por el bienestar del paciente', opciones: [
    { clave: 'inestable', etiqueta: 'Conflicto o situación inestable', nivel: 1 },
    { clave: 'riesgo', etiqueta: 'Riesgo de fuga o abuso en curso', nivel: 2 },
    { clave: 'agresion_48h', etiqueta: 'Agresión física o sexual hace más de 48 h', nivel: 3 },
    { clave: 'antecedentes', etiqueta: 'Antecedentes o signos de maltrato', nivel: 4 },
  ] },
  { clave: 'otro', etiqueta: 'Otro' },
];

// Caras de la FPS-R [9]: seis caras puntuadas 0, 2, 4, 6, 8, 10.
export const FPSR = [0, 2, 4, 6, 8, 10];

const esNumero = v => typeof v === 'number' && !Number.isNaN(v);

// Clasifica un paciente. Devuelve { nivel, provisional, reglas: [{ texto, fuente }] }.
export function clasificar(p) {
  const reglas = [];
  const v = p.vitales || {};
  const pat = p.pat || {};
  const franja = franjaEdad(p.edadMeses);
  const meses = p.edadMeses;
  const aplicar = (nivel, texto, fuente) => { if (nivel) reglas.push({ nivel, texto, fuente }); };

  // Sin ningún signo vital medido el resultado es provisional (flujo mixto: enfermería aún no ha valorado).
  const provisional = !['fr', 'fc', 'sat', 'temp', 'gcs'].some(k => esNumero(v[k]));

  // --- Hallazgos del relato libre (relato.js): solo los afirmados y no descartados por enfermería ---
  const hallazgos = (p.hallazgos || []).filter(h => !h.negado && !h.descartado);
  const hay = clave => hallazgos.some(h => h.clave === clave);
  const relatoFiebre = hallazgos.some(h => h.efecto === 'fiebre');
  const relatoInmuno = hallazgos.some(h => h.efecto === 'inmunodeprimido');
  for (const h of hallazgos) {
    if (h.nivel) aplicar(h.nivel, `Relato: ${h.etiqueta} («${h.evidencia}»)`, h.fuente);
    else if (!h.efecto) reglas.push({ nivel: null, texto: `Relato: ${h.etiqueta}`, fuente: h.fuente }); // la evidencia va en la tabla de hallazgos
  }
  // Reglas cruzadas de la Tabla 10 de [1] que dependen de dos hallazgos a la vez.
  if (hay('cronico_riesgo') && hay('vomitos')) aplicar(2, 'Relato: vómitos/diarrea en niño con enfermedad metabólica, diabetes o insuficiencia suprarrenal', '[1] Tabla 10');

  // --- Motivo de consulta con nivel publicado (Tabla 10 de [1]) ---
  const motivo = MOTIVOS.find(m => m.clave === p.motivo);
  const opcion = motivo?.opciones?.find(o => o.clave === p.gravedad);
  if (opcion) aplicar(opcion.nivel, `Motivo: ${motivo.etiqueta} — ${opcion.etiqueta}`, '[1] Tabla 10');

  // --- Triángulo de evaluación pediátrica [8]; su uso como "primera mirada" en [1, Revisión 4] ---
  const ladosPAT = ['apariencia', 'respiracion', 'circulacion'].filter(k => pat[k]);
  if (ladosPAT.length === 3) aplicar(1, 'Triángulo de evaluación pediátrica: los tres lados alterados', '[1] [8]');
  else if (ladosPAT.length > 0) aplicar(2, `Triángulo de evaluación pediátrica alterado (${ladosPAT.join(', ')})`, '[1] [8]');

  // --- Modificadores de primer orden: signos vitales por edad ---
  if (esNumero(v.fr)) {
    const n = nivelPorTabla(TABLA_FR, franja, v.fr);
    aplicar(n, `Frecuencia respiratoria ${v.fr} rpm fuera del rango normal (${rangoNormal(TABLA_FR, franja)}) para ${FRANJAS[franja].etiqueta}`, '[1] Tabla 5');
  }
  if (esNumero(v.fc)) {
    const n = nivelPorTabla(TABLA_FC, franja, v.fc);
    aplicar(n, `Frecuencia cardíaca ${v.fc} lpm fuera del rango normal (${rangoNormal(TABLA_FC, franja)}) para ${FRANJAS[franja].etiqueta}`, '[1] Tabla 6');
  }
  if (esNumero(v.sat)) { // Tabla 2 de [1]: <90 I, <92 II, 92–94 III
    const n = v.sat < 90 ? 1 : v.sat < 92 ? 2 : v.sat <= 94 ? 3 : null;
    aplicar(n, `Saturación de oxígeno ${v.sat} %`, '[1] Tabla 2');
  }
  if (esNumero(v.gcs)) { // Tabla 4 de [1]: 3–9 I, 10–13 II
    const n = v.gcs <= 9 ? 1 : v.gcs <= 13 ? 2 : null;
    aplicar(n, `Nivel de conciencia alterado (GCS ${v.gcs})`, '[1] Tabla 4');
  }
  // Dificultad respiratoria (Tabla 2) y estado hemodinámico (Tabla 3): valoración cualitativa de enfermería.
  aplicar({ grave: 1, moderada: 2, leve: 3 }[p.distRespiratoria], `Dificultad respiratoria ${p.distRespiratoria}`, '[1] Tabla 2');
  aplicar({ shock: 1, compromiso: 2, deplecion: 3 }[p.hemodinamica],
    { shock: 'Shock', compromiso: 'Compromiso hemodinámico', deplecion: 'Depleción de volumen con signos vitales anormales' }[p.hemodinamica], '[1] Tabla 3');

  // --- Fiebre [1, §A] con la actualización de 2016 [2, §8] ---
  // Fiebre = temperatura ≥ 38,0 °C o historia de fiebre reciente (aceptada como modificador en [2]).
  const fiebre = (esNumero(v.temp) && v.temp >= 38.0) || p.fiebreReciente || relatoFiebre;
  const inmunodeprimido = p.inmunodeprimido || relatoInmuno;
  if (fiebre) {
    if (meses < 3) aplicar(2, 'Fiebre en lactante menor de 3 meses', '[1] [2]');
    else if (inmunodeprimido) aplicar(2, 'Fiebre en paciente inmunodeprimido', '[1]');
    else if (meses < 18 && esNumero(v.temp) && v.temp > 38.5) {
      // 2016: el modificador >38,5 °C se limita a 3–18 meses.
      if (pat.apariencia) aplicar(2, 'Temperatura > 38,5 °C entre 3 y 18 meses con aspecto enfermo', '[2] §8');
      else aplicar(3, 'Temperatura > 38,5 °C entre 3 y 18 meses con buen aspecto', '[2] §8');
    } else if (pat.apariencia) aplicar(3, 'Fiebre con aspecto enfermo', '[1] §A');
    else aplicar(4, 'Fiebre con buen aspecto', '[1] §A');
  } else if (inmunodeprimido) {
    // Sin fiebre, la inmunosupresión por sí sola no cambia el nivel; se anota para el médico.
    reglas.push({ nivel: null, texto: 'Paciente inmunodeprimido (sin fiebre registrada)', fuente: '[1]' });
  }

  // --- Sepsis [2, §1]: 3 criterios SIRS → II; 2 criterios con aspecto enfermo → III ---
  if (p.sirs >= 3) aplicar(2, `${p.sirs} criterios SIRS`, '[2]');
  else if (p.sirs === 2 && pat.apariencia) aplicar(3, '2 criterios SIRS con aspecto enfermo', '[2]');

  // --- Dolor [1, §B]: se toma el pin más intenso (FPS-R 0–10). Crónico: un nivel menos. ---
  const intensidades = (p.pines || []).map(x => x.intensidad).filter(esNumero);
  if (intensidades.length) {
    const max = Math.max(...intensidades);
    let n = max >= 8 ? 2 : max >= 4 ? 3 : 4;
    let texto = `Dolor ${max}/10 (${max >= 8 ? 'intenso' : max >= 4 ? 'moderado' : 'leve'})`;
    if (p.dolorCronico) { n = Math.min(5, n + 1); texto += ', crónico (un nivel menos)'; }
    aplicar(n, texto, '[1] §B [9]');
  }

  if (hay('cojera') && fiebre) aplicar(3, 'Relato: cojera o problema de marcha con fiebre', '[1] Tabla 10');

  // --- Mecanismo de lesión de alto riesgo [1, Tabla 7] ---
  if (p.mecanismoAltoRiesgo) aplicar(2, 'Mecanismo de lesión de alto riesgo', '[1] Tabla 7');

  const niveles = reglas.map(r => r.nivel).filter(Boolean);
  const nivel = niveles.length ? Math.min(...niveles) : 5;
  return { nivel, provisional, reglas };
}
