// app.js — Pegamento entre formulario, estado, motor clínico (triaje.js), figura 3D
// (cuerpo3d.js) e informe imprimible. Sin frameworks: un objeto `paciente`, un
// listener delegado que recalcula, y localStorage para no perder datos al recargar.
import { clasificar, MOTIVOS, NIVELES, FRANJAS, FPSR, franjaEdad, rangoNormal, TABLA_FR, TABLA_FC } from './triaje.js';
import { crearCuerpo } from './cuerpo3d.js';
import { analizarRelato } from './relato.js';

const CLAVE_STORAGE = 'triaje-pediatrico';
const $ = id => document.getElementById(id);

// ---------- Estado ----------
const pacienteVacio = () => ({
  edad: 6, edadUnidad: 'anos', edadMeses: 72, sexo: '', motivo: 'fiebre', gravedad: null,
  fiebreReciente: false, inmunodeprimido: false, alergias: '', tratamientoActual: '', tratamientoHabitual: '', relato: '', hallazgos: [], hallazgosDescartados: [], relatoDatos: {},
  pines: [], dolorCronico: false,
  vitales: { fr: null, fc: null, sat: null, temp: null, gcs: null },
  pat: { apariencia: false, respiracion: false, circulacion: false },
  distRespiratoria: 'ninguna', hemodinamica: 'normal', mecanismoAltoRiesgo: false, sirs: 0,
});
let paciente = cargar() || pacienteVacio();
let resultado = null;

function guardar() { localStorage.setItem(CLAVE_STORAGE, JSON.stringify(paciente)); }
function cargar() {
  try {
    const p = JSON.parse(localStorage.getItem(CLAVE_STORAGE));
    if (!p) return null;
    // Compatibilidad con estados guardados antes de existir el relato.
    p.relato ??= p.observaciones || '';
    p.hallazgosDescartados ??= [];
    p.tratamientoActual ??= ''; p.tratamientoHabitual ??= '';
    return p;
  } catch { return null; }
}

// ---------- Formulario ↔ estado ----------
const numero = id => { const v = $(id).valueAsNumber; return Number.isNaN(v) ? null : v; };

// Lee todo el formulario (los pines se gestionan aparte) y recalcula.
function leerFormulario() {
  paciente.edad = numero('edad') ?? 0;
  paciente.edadUnidad = $('edadUnidad').value;
  paciente.edadMeses = paciente.edadUnidad === 'anos' ? paciente.edad * 12 : paciente.edad;
  paciente.sexo = $('sexo').value;
  paciente.motivo = $('motivo').value;
  paciente.gravedad = $('lblGravedad').hidden ? null : $('gravedad').value;
  for (const k of ['fiebreReciente', 'inmunodeprimido', 'dolorCronico', 'mecanismoAltoRiesgo']) paciente[k] = $(k).checked;
  paciente.alergias = $('alergias').value.trim();
  paciente.tratamientoActual = $('tratamientoActual').value.trim();
  paciente.tratamientoHabitual = $('tratamientoHabitual').value.trim();
  paciente.relato = $('relato').value.trim();
  // Extracción determinista de conceptos del relato; enfermería puede descartar por clave.
  const analisis = analizarRelato(paciente.relato, paciente.edadMeses);
  // Del tratamiento habitual solo interesan los riesgos (inmunosupresión, enfermedad crónica, coagulación).
  const riesgos = analizarRelato(paciente.tratamientoHabitual, paciente.edadMeses).hallazgos
    .filter(h => h.categoria === 'riesgo' && !analisis.hallazgos.some(x => x.clave === h.clave))
    .map(h => ({ ...h, origen: 'tratamiento habitual' }));
  analisis.hallazgos.push(...riesgos);
  analisis.hallazgos.forEach(h => { h.descartado = paciente.hallazgosDescartados.includes(h.clave); });
  paciente.hallazgos = analisis.hallazgos;
  paciente.relatoDatos = analisis.datos;
  for (const k of ['fr', 'fc', 'sat', 'temp', 'gcs']) paciente.vitales[k] = numero(k);
  for (const k of ['apariencia', 'respiracion', 'circulacion']) paciente.pat[k] = $(`pat-${k}`).checked;
  paciente.distRespiratoria = $('distRespiratoria').value;
  paciente.hemodinamica = $('hemodinamica').value;
  paciente.sirs = numero('sirs') ?? 0;
}

// Vuelca el estado al formulario (al cargar, al elegir un escenario, al limpiar).
function escribirFormulario() {
  $('edad').value = paciente.edad;
  $('edadUnidad').value = paciente.edadUnidad;
  $('sexo').value = paciente.sexo;
  $('motivo').value = paciente.motivo;
  actualizarGravedad(paciente.gravedad);
  for (const k of ['fiebreReciente', 'inmunodeprimido', 'dolorCronico', 'mecanismoAltoRiesgo']) $(k).checked = paciente[k];
  $('alergias').value = paciente.alergias;
  $('tratamientoActual').value = paciente.tratamientoActual;
  $('tratamientoHabitual').value = paciente.tratamientoHabitual;
  $('relato').value = paciente.relato;
  for (const k of ['fr', 'fc', 'sat', 'temp', 'gcs']) $(k).value = paciente.vitales[k] ?? '';
  for (const k of ['apariencia', 'respiracion', 'circulacion']) $(`pat-${k}`).checked = paciente.pat[k];
  $('distRespiratoria').value = paciente.distRespiratoria;
  $('hemodinamica').value = paciente.hemodinamica;
  $('sirs').value = paciente.sirs;
  cuerpo.limpiarPines();
  paciente.pines.forEach(p => cuerpo.agregarPin(p));
  renderPines();
}

// El select "descripción" solo aparece para motivos con niveles publicados (Tabla 10).
function actualizarGravedad(valor) {
  const motivo = MOTIVOS.find(m => m.clave === $('motivo').value);
  const sel = $('gravedad');
  sel.replaceChildren(...(motivo?.opciones || []).map(o => new Option(o.etiqueta, o.clave)));
  $('lblGravedad').hidden = !motivo?.opciones;
  if (motivo?.opciones) sel.value = valor && motivo.opciones.some(o => o.clave === valor) ? valor : motivo.opciones[0].clave;
  $('ayudaMotivo').textContent = motivo?.opciones
    ? 'Motivo con niveles publicados en PaedCTAS (Tabla 10).'
    : 'Motivo sin nivel base publicado: el nivel lo determinan los signos vitales y modificadores.';
}

function recalcular() {
  leerFormulario();
  resultado = clasificar(paciente);
  renderResultado();
  renderHallazgos();
  guardar();
}

// ---------- Hallazgos del relato ----------
const romanoONada = n => (n ? NIVELES[n].romano : 'alerta');
function renderHallazgos() {
  const items = paciente.hallazgos.map(h => {
    const div = document.createElement('div');
    div.className = `hallazgo${h.negado ? ' negado' : ''}${h.descartado ? ' descartado' : ''}`;
    const estado = h.negado ? 'negado en el relato' : h.descartado ? 'descartado por enfermería' : h.nivel ? 'aplicado al triaje' : h.efecto ? 'aplicado al triaje' : 'alerta informativa';
    div.innerHTML = `<input type="checkbox" data-clave="${h.clave}" ${h.descartado ? '' : 'checked'} ${h.negado ? 'disabled' : ''} aria-label="Contar este hallazgo">
      <span class="nivel ${h.nivel ? '' : 'alerta'}" style="${h.nivel ? `background:${NIVELES[h.nivel].color};color:${NIVELES[h.nivel].texto}` : ''}">${h.nivel ? NIVELES[h.nivel].romano : (h.efecto ? 'mod.' : 'alerta')}</span>
      <span class="texto"><b>${escapar(h.etiqueta)}</b> <span class="fuente">${escapar(h.fuente)}</span><span class="evidencia">«${escapar(h.evidencia)}»${h.origen ? ` (${h.origen})` : ''} · ${estado}</span></span>`;
    return div;
  });
  $('hallazgos').replaceChildren(...items);
  $('sinHallazgos').hidden = items.length > 0;

  // Impacto del relato: nivel con y sin hallazgos.
  const sinRelato = clasificar({ ...paciente, hallazgos: [] });
  const activos = paciente.hallazgos.filter(h => !h.negado && !h.descartado);
  const p = $('impactoRelato');
  p.hidden = activos.length === 0;
  p.textContent = sinRelato.nivel !== resultado.nivel
    ? `Impacto del relato: nivel ${NIVELES[sinRelato.nivel].romano} sin relato → ${NIVELES[resultado.nivel].romano} con relato.`
    : `El relato aporta ${activos.length} hallazgo(s) pero no cambia el nivel (${NIVELES[resultado.nivel].romano}).`;
}
$('hallazgos').addEventListener('change', e => {
  const clave = e.target.dataset.clave;
  if (!clave) return;
  paciente.hallazgosDescartados = e.target.checked
    ? paciente.hallazgosDescartados.filter(c => c !== clave)
    : [...paciente.hallazgosDescartados, clave];
  // El listener delegado de #app recalcula a continuación.
});

// ---------- Tarjeta de resultado ----------
function renderResultado() {
  const n = NIVELES[resultado.nivel];
  const banda = $('banda');
  banda.style.background = n.color;
  banda.style.color = n.texto;
  $('nivelRomano').textContent = n.romano;
  $('nivelNombre').textContent = `Nivel ${resultado.nivel} · ${n.nombre}`;
  $('nivelTiempo').textContent = `Valoración médica: ${n.tiempo}`;
  $('provisional').hidden = !resultado.provisional;
  // Escala visual de los cinco niveles y barra fija en móvil.
  [...$('escala').children].forEach((s, i) => s.classList.toggle('activo', i + 1 === resultado.nivel));
  const barra = $('barraMovil');
  barra.style.background = n.color; barra.style.color = n.texto;
  $('barraRomano').textContent = n.romano;
  $('barraNombre').textContent = `Nivel ${resultado.nivel} · ${n.nombre}${resultado.provisional ? ' (provisional)' : ''}`;
  $('barraTiempo').textContent = `Valoración médica: ${n.tiempo}`;
  const lis = resultado.reglas.map(r => {
    const li = document.createElement('li');
    if (!r.nivel) li.className = 'nota';
    li.innerHTML = `${r.nivel ? `<b>${NIVELES[r.nivel].romano}</b> · ` : ''}${r.texto} <span class="fuente">${r.fuente}</span>`;
    return li;
  });
  if (!lis.length) lis.push(Object.assign(document.createElement('li'), { className: 'nota', textContent: 'Ningún modificador activo. Nivel por defecto.' }));
  $('reglas').replaceChildren(...lis);
}

// ---------- Figura 3D y pines ----------
let pinEnEdicion = null; // { modo: 'nuevo'|'editar', datos }
const cuerpo = crearCuerpo($('canvas3d'), {
  onClickCuerpo(info) { abrirDialogoPin({ modo: 'nuevo', datos: { ...info, id: crypto.randomUUID(), intensidad: 4, nota: '' } }); },
  onClickPin(id) { const p = paciente.pines.find(x => x.id === id); if (p) abrirDialogoPin({ modo: 'editar', datos: { ...p } }); },
  onHover(region) { $('regionCursor').hidden = !region; $('regionCursor').textContent = region || ''; },
});
document.querySelectorAll('[data-vista]').forEach(b => b.addEventListener('click', () => cuerpo.vista(b.dataset.vista)));

const describirPin = p => `${p.region}${p.lado !== 'centro' && !p.region.includes(p.lado) ? ` ${p.lado}` : ''} · cara ${p.cara}`;

function renderPines() {
  const lis = paciente.pines.map(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="punto"></span><span class="texto"><b>${describirPin(p)}</b> · ${p.intensidad}/10${p.nota ? `<br><span class="nota">${escapar(p.nota)}</span>` : ''}</span>`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.textContent = 'Editar';
    btn.addEventListener('click', () => abrirDialogoPin({ modo: 'editar', datos: { ...p } }));
    li.appendChild(btn);
    return li;
  });
  $('listaPines').replaceChildren(...lis);
  $('sinPines').hidden = lis.length > 0;
}

// Caras FPS-R dibujadas en SVG (boca de sonrisa a llanto, lágrimas a partir de 8).
function caraSVG(valor) {
  const t = valor / 10;                         // 0 = feliz, 1 = peor dolor
  const curva = 8 - 16 * t;                     // control de la boca: +8 sonrisa, -8 llanto
  const cejas = t > 0.5 ? `<path d="M13 15 l6 ${3 * t}" /><path d="M31 15 l-6 ${3 * t}" />` : '';
  const lagrimas = valor >= 8 ? '<path d="M16 24 q-2 4 0 6 q2 -2 0 -6" fill="#3b82f6" stroke="none"/><path d="M28 24 q2 4 0 6 q-2 -2 0 -6" fill="#3b82f6" stroke="none"/>' : '';
  return `<svg viewBox="0 0 44 44" fill="none" stroke="#1f2937" stroke-width="2" stroke-linecap="round" aria-hidden="true">
    <circle cx="22" cy="22" r="19" fill="#fde68a"/><circle cx="16" cy="19" r="1.8" fill="#1f2937" stroke="none"/><circle cx="28" cy="19" r="1.8" fill="#1f2937" stroke="none"/>
    ${cejas}${lagrimas}<path d="M14 ${30 - curva / 2} q8 ${curva} 16 0"/></svg>`;
}
$('caras').innerHTML = FPSR.map(v => `<label><input type="radio" name="intensidad" value="${v}">${caraSVG(v)}<span>${v}</span></label>`).join('');

function abrirDialogoPin(edicion) {
  pinEnEdicion = edicion;
  $('dlgTitulo').textContent = `Dolor en ${describirPin(edicion.datos)}`;
  document.querySelector(`input[name=intensidad][value="${edicion.datos.intensidad}"]`).checked = true;
  $('pinNota').value = edicion.datos.nota;
  $('btnBorrarPin').hidden = edicion.modo !== 'editar';
  $('dlgPin').showModal();
}
$('formPin').addEventListener('submit', () => {
  const d = pinEnEdicion.datos;
  d.intensidad = Number(document.querySelector('input[name=intensidad]:checked').value);
  d.nota = $('pinNota').value.trim();
  const i = paciente.pines.findIndex(p => p.id === d.id);
  if (i >= 0) paciente.pines[i] = d; else { paciente.pines.push(d); cuerpo.agregarPin(d); }
  renderPines();
  recalcular();
});
$('btnBorrarPin').addEventListener('click', () => {
  paciente.pines = paciente.pines.filter(p => p.id !== pinEnEdicion.datos.id);
  cuerpo.borrarPin(pinEnEdicion.datos.id);
  $('dlgPin').close();
  renderPines();
  recalcular();
});
$('btnCancelarPin').addEventListener('click', () => $('dlgPin').close());

// ---------- Escenarios de ejemplo (para simular) ----------
const ESCENARIOS = [
  { nombre: 'Lactante de 2 meses con fiebre (esperado: II)', datos: {
    edad: 2, edadUnidad: 'meses', sexo: 'Masculino', motivo: 'fiebre', fiebreReciente: true,
    tratamientoActual: 'Paracetamol en gotas a las 09:00', tratamientoHabitual: 'Ninguno',
    relato: 'Desde esta mañana está caliente, le he puesto el termómetro y tenía 38,6. Come menos y está más dormido de lo normal.',
    vitales: { fr: 44, fc: 150, sat: 98, temp: 38.6, gcs: null } } },
  { nombre: 'Niño de 6 años con crisis de asma (esperado: III)', datos: {
    edad: 6, edadUnidad: 'anos', sexo: 'Masculino', motivo: 'tos', alergias: 'Polen',
    tratamientoActual: 'Salbutamol 2 inhalaciones a las 06:00 y a las 08:00', tratamientoHabitual: 'Budesonida inhalada diaria',
    relato: 'Es asmático. Desde anoche tiene tos y le pita el pecho; le hemos puesto salbutamol y ha mejorado solo un poco. No tiene fiebre.',
    vitales: { fr: 26, fc: 100, sat: 93, temp: 37.2, gcs: 15 }, distRespiratoria: 'leve' } },
  { nombre: 'Niña de 10 años con dolor abdominal 6/10 (esperado: III)', datos: {
    edad: 10, edadUnidad: 'anos', sexo: 'Femenino', motivo: 'dolor_abdominal',
    tratamientoActual: 'Nada', tratamientoHabitual: 'Ninguno',
    relato: 'Le duele la tripa desde hace 8 horas, empezó alrededor del ombligo y ahora es más bajo a la derecha. Ha vomitado una vez. No tiene fiebre.',
    vitales: { fr: 18, fc: 88, sat: 99, temp: 37.4, gcs: 15 },
    pines: [{ id: 'esc-1', region: 'abdomen', lado: 'derecho', cara: 'anterior', x: -0.07, y: 0.33, z: 0.1, intensidad: 6, nota: 'Duele más al saltar o toser.' }] } },
];
$('escenario').append(...ESCENARIOS.map((e, i) => new Option(e.nombre, i)));
$('escenario').addEventListener('change', e => {
  if (e.target.value === '') return;
  const base = pacienteVacio();
  const d = ESCENARIOS[e.target.value].datos;
  paciente = { ...base, ...d, vitales: { ...base.vitales, ...d.vitales }, pines: d.pines || [] };
  escribirFormulario();
  recalcular();
  e.target.value = '';
});

$('btnLimpiar').addEventListener('click', () => {
  paciente = pacienteVacio();
  escribirFormulario();
  recalcular();
});

// ---------- Informe imprimible ----------
const escapar = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const edadTexto = p => p.edadUnidad === 'meses' ? `${p.edad} meses` : `${p.edad} años`;

function renderInforme(imgFrente, imgEspalda) {
  const p = paciente, r = resultado, n = NIVELES[r.nivel], v = p.vitales;
  const franja = franjaEdad(p.edadMeses);
  const motivo = MOTIVOS.find(m => m.clave === p.motivo);
  const gravedad = motivo?.opciones?.find(o => o.clave === p.gravedad);
  const fila = (nombre, valor, normal) => `<tr><td>${nombre}</td><td>${valor ?? '<i>no registrado</i>'}</td><td>${normal ?? '—'}</td></tr>`;
  const nombresPAT = { apariencia: 'apariencia', respiracion: 'trabajo respiratorio', circulacion: 'circulación cutánea' };
  const pat = Object.entries(nombresPAT).map(([k, nombre]) => `${nombre}: ${p.pat[k] ? '<b>alterado</b>' : 'normal'}`).join(' · ');
  const filasPines = p.pines.map(x => `<tr><td>${escapar(describirPin(x))}</td><td>${x.intensidad}/10</td><td>${escapar(x.nota) || '—'}</td></tr>`).join('');
  const fecha = new Date();

  $('informe').innerHTML = `
    <h1>Informe de pre-triaje pediátrico (simulación)</h1>
    <div class="meta">${fecha.toLocaleString('es')} · ID ${crypto.randomUUID().slice(0, 8).toUpperCase()} · Escala PaedCTAS</div>

    <h2>Paciente</h2>
    <table><tr><th>Edad</th><td>${edadTexto(p)} (franja ${FRANJAS[franja].etiqueta})</td><th>Sexo</th><td>${escapar(p.sexo) || '—'}</td></tr>
    <tr><th>Alergias</th><td>${escapar(p.alergias) || 'No conocidas'}</td><th>Inmunodeprimido</th><td>${p.inmunodeprimido ? 'Sí' : 'No'}</td></tr></table>

    <h2>Motivo de consulta</h2>
    <p>${escapar(motivo?.etiqueta)}${gravedad ? ` — ${escapar(gravedad.etiqueta)}` : ''}${p.fiebreReciente ? ' · Fiebre en las últimas 24 h' : ''}</p>

    <h2>Tratamientos</h2>
    <table><tr><th style="width:40%">Administrado para la dolencia actual</th><td>${escapar(p.tratamientoActual) || '<i>no indicado</i>'}</td></tr>
    <tr><th>Tratamiento habitual / medicación crónica</th><td>${escapar(p.tratamientoHabitual) || '<i>no indicado</i>'}</td></tr></table>

    <h2>Signos vitales y valoración de enfermería</h2>
    <table><tr><th>Parámetro</th><th>Valor</th><th>Rango normal para la edad</th></tr>
      ${fila('Frecuencia respiratoria', v.fr != null ? `${v.fr} rpm` : null, `${rangoNormal(TABLA_FR, franja)} rpm`)}
      ${fila('Frecuencia cardíaca', v.fc != null ? `${v.fc} lpm` : null, `${rangoNormal(TABLA_FC, franja)} lpm`)}
      ${fila('SatO₂', v.sat != null ? `${v.sat} %` : null, '> 94 %')}
      ${fila('Temperatura', v.temp != null ? `${v.temp} °C` : null, '< 38,0 °C')}
      ${fila('Glasgow', v.gcs, '14–15')}
      ${fila('Criterios SIRS', p.sirs, '0–1')}
    </table>
    <p>Triángulo de evaluación pediátrica — ${pat}.<br>
       Dificultad respiratoria: ${p.distRespiratoria} · Estado hemodinámico: ${p.hemodinamica} · Mecanismo de alto riesgo: ${p.mecanismoAltoRiesgo ? 'sí' : 'no'}</p>

    <h2>Dolor referido por el paciente / acudiente</h2>
    <div class="figuras">
      <figure><img src="${imgFrente}" alt="Vista frontal"><figcaption>Frente</figcaption></figure>
      <figure><img src="${imgEspalda}" alt="Vista posterior"><figcaption>Espalda</figcaption></figure>
      <div style="flex:1">${filasPines
        ? `<table><tr><th>Zona</th><th>FPS-R</th><th>Nota</th></tr>${filasPines}</table>${p.dolorCronico ? '<p>Dolor crónico (más de 3 meses).</p>' : ''}`
        : '<p>Sin zonas de dolor marcadas.</p>'}</div>
    </div>

    <h2>Resultado</h2>
    <div class="nivel" style="background:${n.color};color:${n.texto}">
      <div class="romano">${n.romano}</div>
      <div><b>Nivel ${r.nivel} · ${n.nombre}</b><br>Valoración médica: ${n.tiempo}${r.provisional ? '<br><b>PROVISIONAL</b>: sin signos vitales registrados' : ''}</div>
    </div>
    <h2>Justificación</h2>
    <ul>${r.reglas.map(x => `<li>${x.nivel ? `<b>${NIVELES[x.nivel].romano}</b> · ` : ''}${escapar(x.texto)} <small>${escapar(x.fuente)}</small></li>`).join('') || '<li>Ningún modificador activo.</li>'}</ul>

    <h2>Relato del acudiente</h2>
    <p>${escapar(p.relato) || '—'}</p>
    ${p.hallazgos.length ? `<table><tr><th>Hallazgo estructurado</th><th>Evidencia en el relato</th><th>Nivel</th><th>Estado</th></tr>
      ${p.hallazgos.map(h => `<tr><td>${escapar(h.etiqueta)} <small>${escapar(h.fuente)}</small></td><td>«${escapar(h.evidencia)}»</td>
        <td>${h.nivel ? NIVELES[h.nivel].romano : (h.efecto ? 'modificador' : 'alerta')}</td>
        <td>${h.negado ? 'negado en el relato' : h.descartado ? 'descartado por enfermería' : 'aplicado'}</td></tr>`).join('')}</table>` : ''}
    ${p.relatoDatos?.duracion || p.relatoDatos?.temperatura ? `<p>Datos extraídos: ${p.relatoDatos.duracion ? `duración «${escapar(p.relatoDatos.duracion)}»` : ''}${p.relatoDatos.duracion && p.relatoDatos.temperatura ? ' · ' : ''}${p.relatoDatos.temperatura ? `temperatura en casa ${p.relatoDatos.temperatura} °C` : ''}</p>` : ''}

    <p class="pie">Prototipo de simulación con fines educativos. No sustituye la valoración clínica. Basado en PaedCTAS
      (Warren et al., CJEM 2008 [1]; Bullard et al., CJEM 2017 [2]). Las referencias numeradas se listan en la aplicación.</p>`;
}

$('btnExportar').addEventListener('click', () => {
  recalcular();
  renderInforme(cuerpo.snapshot('frente'), cuerpo.snapshot('espalda'));
  window.print();
});

// ---------- Arranque ----------
$('motivo').append(...MOTIVOS.map(m => new Option(m.etiqueta, m.clave)));
$('motivo').addEventListener('change', () => actualizarGravedad());
$('app').addEventListener('input', recalcular);
$('app').addEventListener('change', recalcular);
escribirFormulario();
recalcular();
