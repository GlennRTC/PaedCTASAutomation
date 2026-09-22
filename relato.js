// relato.js — Extractor determinista de conceptos clínicos del relato libre del acudiente.
// Sin modelos de lenguaje: normalización + diccionario de sinónimos con expresiones
// regulares + negación simple + extracción de números con contexto. Módulo puro, sin DOM.
//
// Cada concepto se corresponde con un modificador PaedCTAS ya publicado (mismas citas que
// triaje.js). Los conceptos con `nivel` cambian la clasificación; los que tienen `nivel: null`
// son alertas informativas para enfermería y el médico (no hay nivel publicado o el texto
// del acudiente no basta para asignarlo). `efecto` conecta con reglas del motor que
// dependen de otros datos (la fiebre depende de la edad y del aspecto).

// Quita acentos y pasa a minúsculas; "ñ" queda como "n". Los patrones se escriben así.
export const normalizar = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// Categorías: respiratorio, circulacion, conciencia, fiebre, trauma, riesgo, dolor, otros.
export const CONCEPTOS = [
  // --- Respiratorio: Tabla 2 de [1] ---
  { clave: 'cianosis', categoria: 'respiratorio', etiqueta: 'Cianosis referida', nivel: 1, fuente: '[1] Tabla 2 (grave)',
    patrones: ['morad[oa]s?', 'azulad[oa]s?', 'labios? azul(es)?', 'se pone azul', 'cianosis', 'cianotic[oa]'] },
  { clave: 'apnea', categoria: 'respiratorio', etiqueta: 'Pausa respiratoria / apnea referida', nivel: 2, fuente: '[1] Tabla 10 (episodio reciente) y Tabla 2',
    patrones: ['dej[oa] de respirar', 'se qued[oa] sin respirar', 'no respira(ba)?', 'pausas? (de|en la|al) respira\\w+', 'apneas?', 'paro respiratorio'] },
  { clave: 'quejido', categoria: 'respiratorio', etiqueta: 'Quejido respiratorio referido', nivel: 1, fuente: '[1] Tabla 2 (grave)',
    patrones: ['quejido', 'grun(e|ido|idos)', 'gime al respirar'] },
  { clave: 'via_aerea_alta', categoria: 'respiratorio', etiqueta: 'Obstrucción alta de vía aérea referida (babeo, disfagia, voz apagada)', nivel: 1, fuente: '[1] Tabla 2 (grave)',
    patrones: ['babe[ao]', 'no (puede|podia) tragar', 'no traga', 'se le cierra la garganta', 'lengua hinchada', 'voz (apagada|rara|ronca de repente)', 'anafilaxia'] },
  { clave: 'dificultad_respiratoria', categoria: 'respiratorio', etiqueta: 'Dificultad respiratoria referida (trabajo respiratorio aumentado)', nivel: 2, fuente: '[1] Tabla 2 (moderada)',
    patrones: ['le cuesta respirar', 'dificultad (para|al) respirar', 'dificultad respiratoria', 'respira (mal|con dificultad|fatal|muy mal)', 'se le (hunden|marcan) las costillas', 'tiraje', 'retracciones', 'aleteo nasal', 'se ahoga', 'ahog(o|ado|ada|andose)', 'fatiga (al respirar|para respirar)', 'le falta el aire'] },
  { clave: 'estridor', categoria: 'respiratorio', etiqueta: 'Estridor audible referido', nivel: 3, fuente: '[1] Tabla 10 (estridor audible)',
    patrones: ['estridor', 'ruido (ronco|raro|fuerte) al (respirar|coger aire|inspirar)', 'suena al (respirar|coger aire)', 'tos de perro', 'tos perruna'] },
  { clave: 'sibilancias', categoria: 'respiratorio', etiqueta: 'Sibilancias referidas', nivel: 3, fuente: '[1] Tabla 2 (leve)',
    patrones: ['sibilancias?', 'pitos?( al respirar)?', 'silbido( al respirar)?', 'le pita el pecho'] },
  { clave: 'taquipnea', categoria: 'respiratorio', etiqueta: 'Respiración rápida referida', nivel: 3, fuente: '[1] Tabla 2 (leve)',
    patrones: ['respira (rapido|muy rapido|agitad[oa]|acelerad[oa])', 'respiracion (rapida|agitada|acelerada)'] },
  { clave: 'tos', categoria: 'respiratorio', etiqueta: 'Tos', nivel: null, fuente: '[1] Tabla 9',
    patrones: ['tos', 'tose', 'tosiendo'] },

  // --- Circulación: Tabla 3 de [1] ---
  { clave: 'shock', categoria: 'circulacion', etiqueta: 'Signos referidos de mala perfusión grave (piel fría, moteada, sudor frío)', nivel: 1, fuente: '[1] Tabla 3 (shock)',
    patrones: ['piel fria', '(manos|pies|manos y pies) fri[oa]s', 'motead[oa]', 'sudor frio', 'pulso debil', 'muy palid[oa] y sudoros[oa]'] },
  { clave: 'deshidratacion', categoria: 'circulacion', etiqueta: 'Signos referidos de deshidratación / compromiso hemodinámico', nivel: 2, fuente: '[1] Tabla 3 (compromiso hemodinámico)',
    patrones: ['no (ha )?orina(do)?', 'no (hace|ha hecho) pis', 'panal seco', 'no moja el panal', 'hace poco pis', 'ojos hundidos', 'boca seca', '(llora )?sin lagrimas', 'muy palid[oa]', 'palidez', 'palid[oa]'] },
  { clave: 'sincope', categoria: 'circulacion', etiqueta: 'Síncope / desmayo referido: valorar estado hemodinámico', nivel: null, fuente: '[1] Tabla 3',
    patrones: ['desmay(o|ado|ada)', 'se desmay[oa]', 'sincope', 'perdi[oa] el conocimiento'] },
  { clave: 'vomitos', categoria: 'circulacion', etiqueta: 'Vómitos / diarrea: valorar deshidratación', nivel: null, fuente: '[1] Tabla 3',
    patrones: ['vomit\\w*', 'diarreas?', 'deposiciones liquidas', 'caca liquida', 'devuelve'] },
  { clave: 'sangrado', categoria: 'circulacion', etiqueta: 'Sangrado referido', nivel: null, fuente: '[1] §E',
    patrones: ['sangr\\w+', 'hemorragia', 'heces negras', 'caca negra'] },

  // --- Conciencia: Tabla 4 de [1] ---
  { clave: 'inconsciente', categoria: 'conciencia', etiqueta: 'No responde / inconsciente (referido)', nivel: 1, fuente: '[1] Tabla 4 (inconsciente)',
    patrones: ['inconsciente', 'no (responde|reacciona|contesta)', 'no (se )?despierta', 'no abre los ojos', 'no se le puede despertar'] },
  { clave: 'convulsion_activa', categoria: 'conciencia', etiqueta: 'Convulsión en curso (referida)', nivel: 1, fuente: '[1] Tabla 4 (convulsión continua)',
    patrones: ['sigue convulsionando', 'no para de convulsionar', 'esta convulsionando', 'convulsionando ahora'] },
  { clave: 'convulsion', categoria: 'conciencia', etiqueta: 'Convulsión referida (alteración del nivel de conciencia)', nivel: 2, fuente: '[1] Tabla 4 (alterado)',
    patrones: ['convulsion(es)?', 'convulsion[oa]', 'le dio un ataque', 'ataque epileptico', 'crisis epileptica', 'se puso rigid[oa]', 'temblaba todo el cuerpo', 'ponia los ojos en blanco'] },
  { clave: 'letargia', categoria: 'conciencia', etiqueta: 'Somnolencia / letargia referida', nivel: 2, fuente: '[1] Tabla 4 (alterado)',
    patrones: ['letargic[oa]', 'somnolient[oa]', 'adormilad[oa]', 'muy dormid[oa]', 'mas dormid[oa] de lo normal', 'cuesta despertarl[oa]', 'dificil de despertar', 'muy decaid[oa]', 'decaid[oa]', 'no reconoce', 'confus[oa]', 'desorientad[oa]', 'como ido', 'como ida', 'no esta como siempre', 'no es el mismo', 'no es la misma'] },
  { clave: 'inconsolable', categoria: 'conciencia', etiqueta: 'Llanto inconsolable referido', nivel: 3, fuente: '[1] Tabla 10 (inconsolable, SV estables)',
    patrones: ['inconsolable', 'no (para|deja) de llorar', 'no se (calma|consuela)', 'llora sin parar', 'llanto (continuo|constante) '] },
  { clave: 'rechazo_alimento', categoria: 'conciencia', etiqueta: 'Rechazo de la alimentación en lactante', nivel: 2, edadMaxMeses: 24, fuente: '[1] Tabla 4 (mala alimentación en lactante)',
    patrones: ['no (quiere|puede) (comer|mamar|el pecho|el biberon)', 'rechaza (el pecho|el biberon|la comida|las tomas)', 'no come nada', 'no hace las tomas'] },
  { clave: 'hipotonia', categoria: 'conciencia', etiqueta: 'Hipotonía referida (niño flácido)', nivel: 2, fuente: '[1] Tabla 10 (sin tono)',
    patrones: ['flacid[oa]', 'como un trapo', 'como un munec[oa]', 'hipoton\\w+', 'no sostiene la cabeza', 'blandit[oa] y sin fuerza'] },

  // --- Fiebre: [1] §A y [2] §8 (el nivel lo decide el motor según edad y aspecto) ---
  { clave: 'fiebre', categoria: 'fiebre', etiqueta: 'Fiebre referida', nivel: null, efecto: 'fiebre', fuente: '[1] §A [2] §8',
    patrones: ['fiebre', 'febril', 'calentura', 'temperatura alta', 'esta caliente', 'esta ardiendo', 'decimas'] },
  { clave: 'inmunodeprimido', categoria: 'riesgo', etiqueta: 'Inmunosupresión referida', nivel: null, efecto: 'inmunodeprimido', fuente: '[1] §A',
    patrones: ['quimio(terapia)?', 'leucemia', 'cancer', 'trasplant\\w+', 'inmunodeprimid[oa]', 'defensas bajas', 'sin bazo', 'esplenectomia', 'vih', 'corticoides'] },
  { clave: 'cronico_riesgo', categoria: 'riesgo', etiqueta: 'Enfermedad crónica de riesgo (diabetes, metabólica, suprarrenal, cardiopatía)', nivel: null, fuente: '[1] Tabla 10 (problema congénito)',
    patrones: ['diabet\\w+', 'insulina', 'enfermedad metabolica', 'metabolopatia', 'suprarrenal', 'cardiopat\\w+', 'operad[oa] del corazon', 'del corazon'] },
  { clave: 'coagulacion', categoria: 'riesgo', etiqueta: 'Trastorno de coagulación referido: aplicar protocolo del paciente', nivel: null, fuente: '[1] §E',
    patrones: ['hemofilia', 'hemofilic[oa]', 'von willebrand', 'anticoagulad[oa]', 'problema de coagulacion'] },
  { clave: 'petequias', categoria: 'riesgo', etiqueta: 'Petequias / manchas que no desaparecen: descartar sepsis (SIRS)', nivel: null, fuente: '[2]',
    patrones: ['petequias?', 'manchas (moradas|rojas) que no (desaparecen|se quitan|se van)', 'manchitas moradas', 'purpura'] },

  // --- Trauma: Tabla 7 de [1] (los números se evalúan aparte) ---
  { clave: 'atropello', categoria: 'trauma', etiqueta: 'Atropello referido', nivel: 2, fuente: '[1] Tabla 7',
    patrones: ['atropell\\w+', 'le dio un coche', 'le pillo un coche'] },
  { clave: 'accidente_grave', categoria: 'trauma', etiqueta: 'Accidente de tráfico con vuelco o eyección referido', nivel: 2, fuente: '[1] Tabla 7',
    patrones: ['sali[oa] despedid[oa]', 'volc\\w+', 'vuelco', 'sin cinturon', 'sin sillita'] },
  { clave: 'accidente', categoria: 'trauma', etiqueta: 'Accidente de tráfico referido: verificar criterios de la Tabla 7', nivel: null, fuente: '[1] Tabla 7',
    patrones: ['accidente de (coche|trafico|moto|bici)', 'choque', 'chocaron', 'chocamos'] },
  { clave: 'penetrante', categoria: 'trauma', etiqueta: 'Lesión penetrante referida', nivel: 2, fuente: '[1] Tabla 7',
    patrones: ['punalada', 'cuchill\\w+', 'navaja', 'disparo', 'bala', 'se (le )?clav[oa]', 'penetrante'] },
  { clave: 'trauma_craneal', categoria: 'trauma', etiqueta: 'Traumatismo craneal referido: valorar mecanismo (Tabla 7) y conciencia (Tabla 4)', nivel: null, fuente: '[1] Tabla 7',
    patrones: ['golpe en la cabeza', 'se (golpeo|dio|pego) (en )?la cabeza', 'cabezazo', 'traumatismo craneal', 'cay[oa] de cabeza'] },
  { clave: 'quemadura', categoria: 'trauma', etiqueta: 'Quemadura referida', nivel: null, fuente: '—',
    patrones: ['quemad\\w+', 'se quem[oa]', 'escaldad\\w+'] },

  // --- Dolor y otros ---
  { clave: 'dolor', categoria: 'dolor', etiqueta: 'Dolor referido: cuantificar en la figura (FPS-R)', nivel: null, fuente: '[1] §B',
    patrones: ['dolor', 'le duele', 'duele', 'llora de dolor', 'se queja de'] },
  { clave: 'cojera', categoria: 'otros', etiqueta: 'Cojera / no carga peso referida', nivel: 4, fuente: '[1] Tabla 10 (marcha con dificultad)',
    patrones: ['cojea\\w*', 'no (apoya|quiere apoyar) (el|la) (pie|pierna)', 'no (quiere|puede) (andar|caminar)', 'arrastra la pierna'] },
  { clave: 'escroto', categoria: 'otros', etiqueta: 'Dolor o tumefacción escrotal referida: valorar torsión', nivel: null, fuente: '[1] Tabla 9',
    patrones: ['testicul\\w+', 'escrot\\w+', 'huevos hinchados'] },
  { clave: 'ingesta', categoria: 'otros', etiqueta: 'Ingesta de cuerpo extraño o tóxico referida', nivel: null, fuente: '[1] Tabla 9',
    patrones: ['se (ha )?trag[oa]', 'ingiri[oa]', 'intoxicacion', 'veneno', 'pila de boton', 'iman(es)?', 'se (ha )?tom[oa] (pastillas|medicinas|medicamentos|detergente|lejia)'] },
  { clave: 'ahogamiento', categoria: 'otros', etiqueta: 'Casi ahogamiento referido', nivel: null, fuente: '[1] Tabla 9',
    patrones: ['casi se ahoga', 'ahogamiento', 'bajo el agua', 'se cay[oa] (a|en) la piscina'] },
  { clave: 'bienestar', categoria: 'otros', etiqueta: 'Preocupación por el bienestar del paciente: usar el motivo específico', nivel: null, fuente: '[1] Tabla 10',
    patrones: ['maltrat\\w+', 'abus\\w+', 'le (pegan|han pegado|pego)'] },
  { clave: 'autolesion', categoria: 'otros', etiqueta: 'Ideación suicida / autolesión referida: aplicar herramienta de riesgo', nivel: null, fuente: '[1] Tabla 9',
    patrones: ['suicid\\w+', 'quiere morir(se)?', 'se (quiere )?hac(e|er) dano', 'autolesion\\w*', 'se corta'] },
];

// Palabras que niegan lo que sigue, si aparecen en las 3 palabras anteriores al hallazgo,
// sin cruzar coma, punto ni "pero". ponytail: heurística simple; "no para de llorar" se
// resuelve incluyendo la forma completa en el patrón del concepto.
const NEGADORES = /^(no|sin|niega|nunca|tampoco|ni)$/;

function estaNegado(textoNorm, inicio) {
  const antes = textoNorm.slice(0, inicio).split(/[,.;!?]| pero /).pop();
  const palabras = antes.trim().split(/\s+/).filter(Boolean).slice(-3);
  return palabras.some(w => NEGADORES.test(w));
}

// Devuelve el fragmento original (con acentos) que corresponde a la posición normalizada.
// normalizar() conserva la longitud carácter a carácter (NFD quita solo marcas combinantes),
// así que los índices coinciden.
function fragmento(texto, i, f) {
  // Amplía ~20 caracteres a cada lado y ajusta a límites de palabra para no cortar términos.
  let a = Math.max(0, i - 20), b = Math.min(texto.length, f + 20);
  while (a > 0 && !/\s/.test(texto[a - 1])) a--;
  while (b < texto.length && !/\s/.test(texto[b])) b++;
  return (a > 0 ? '…' : '') + texto.slice(a, b).trim() + (b < texto.length ? '…' : '');
}

/**
 * Analiza el relato. Devuelve { hallazgos, datos }.
 * hallazgos: [{ clave, etiqueta, categoria, nivel, efecto, fuente, evidencia, negado }]
 * datos: { temperatura, duracion, metrosCaida, escalones } extraídos del texto.
 */
export function analizarRelato(texto, edadMeses = Infinity) {
  const t = normalizar(texto || '');
  const hallazgos = [];
  for (const c of CONCEPTOS) {
    const re = new RegExp(`\\b(${c.patrones.join('|')})\\b`, 'g');
    let m;
    while ((m = re.exec(t))) {
      const negado = estaNegado(t, m.index);
      const yaVisto = hallazgos.find(h => h.clave === c.clave);
      // Se conserva una ocurrencia por concepto; una afirmación prevalece sobre una negación.
      if (yaVisto) { if (yaVisto.negado && !negado) Object.assign(yaVisto, { negado: false, evidencia: fragmento(texto, m.index, m.index + m[0].length) }); continue; }
      const fueraDeEdad = c.edadMaxMeses != null && edadMeses >= c.edadMaxMeses;
      hallazgos.push({
        clave: c.clave, etiqueta: c.etiqueta + (fueraDeEdad ? ' (criterio de lactante; informativo a esta edad)' : ''),
        categoria: c.categoria, nivel: fueraDeEdad ? null : c.nivel, efecto: c.efecto || null, fuente: c.fuente,
        evidencia: fragmento(texto, m.index, m.index + m[0].length), negado,
      });
    }
  }

  // --- Números con contexto ---
  const datos = {};
  // Temperatura: 35–42 con decimal, o seguida de grados/°. Un entero suelto ("38") no cuenta.
  const mTemp = [...t.matchAll(/\b(3[5-9]|4[0-2])(?:[.,](\d))?\s*(°|º|grados)?/g)].find(m => m[2] != null || m[3]);
  const temp = mTemp ? parseFloat(`${mTemp[1]}.${mTemp[2] ?? 0}`) : null;
  if (temp != null) {
    datos.temperatura = temp;
    if (temp >= 38 && !hallazgos.some(h => h.clave === 'fiebre' && !h.negado)) {
      const idx = hallazgos.findIndex(h => h.clave === 'fiebre');
      const h = { clave: 'fiebre', etiqueta: `Fiebre referida (${temp} °C en casa)`, categoria: 'fiebre', nivel: null, efecto: 'fiebre', fuente: '[1] §A [2] §8', evidencia: `${temp} °C`, negado: false };
      if (idx >= 0) hallazgos[idx] = h; else hallazgos.push(h);
    }
  }
  // Duración: "desde hace 3 días", "hace 2 horas", "lleva 4 días".
  const dur = t.match(/\b(?:desde hace|hace|lleva|llevamos|desde)\s+(\d+|un|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+(horas?|dias?|semanas?|meses?|minutos?)/);
  if (dur) datos.duracion = `${dur[1]} ${dur[2]}`;
  // Caída: metros o escalones (Tabla 7: > 1 m o 5 escalones → II).
  const metros = t.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?)\b/);
  if (metros) datos.metrosCaida = parseFloat(metros[1].replace(',', '.'));
  const escalones = t.match(/(\d+)\s*(?:escalones|escaleras|peldanos)/);
  if (escalones) datos.escalones = parseInt(escalones[1], 10);
  if (/cay[oa]|caida|se ha caido|se cayo/.test(t) && ((datos.metrosCaida > 1) || (datos.escalones >= 5))) {
    hallazgos.push({ clave: 'caida_altura', etiqueta: `Caída de altura referida (${datos.metrosCaida > 1 ? datos.metrosCaida + ' m' : datos.escalones + ' escalones'})`,
      categoria: 'trauma', nivel: 2, efecto: null, fuente: '[1] Tabla 7 (caída > 1 m o 5 escalones)', evidencia: (metros || escalones)[0], negado: false });
  }
  return { hallazgos, datos };
}
