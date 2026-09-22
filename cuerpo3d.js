// cuerpo3d.js — Figura infantil 3D construida con primitivas de Three.js.
// Cada parte del cuerpo es una malla con `name` en español, así un pin sabe su región
// anatómica sin heurísticas. Sin assets externos ni licencias que verificar.
//
// Convención de ejes: el paciente mira hacia +z (hacia la cámara en la vista "frente").
// Por tanto la IZQUIERDA del paciente está en +x y su DERECHA en -x.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PIEL = 0xe9c9ad;   // tono neutro, mate
const COLOR_PIN = 0xdc2626;
const ALTURA_MIRADA = 0.25; // centro vertical de la figura
const VISTAS = { frente: [0, ALTURA_MIRADA, 2.9], espalda: [0, ALTURA_MIRADA, -2.9] };

/**
 * Crea la escena en `canvas`.
 * @param {HTMLCanvasElement} canvas
 * @param {{ onClickCuerpo: (info) => void, onClickPin: (id) => void, onHover?: (region|null) => void }} eventos
 *   onClickCuerpo recibe { region, lado, cara, x, y, z } del punto tocado.
 * @returns {{ agregarPin, borrarPin, limpiarPines, vista, snapshot }}
 */
export function crearCuerpo(canvas, eventos) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camara.position.set(...VISTAS.frente);

  escena.add(new THREE.HemisphereLight(0xf4fbff, 0xb8c9d1, 1.4));
  const luz = new THREE.DirectionalLight(0xffffff, 2.2);
  luz.position.set(2.5, 4, 3);
  luz.castShadow = true;
  luz.shadow.mapSize.set(1024, 1024);
  luz.shadow.radius = 4;
  luz.shadow.camera.near = 1; luz.shadow.camera.far = 10;
  luz.shadow.camera.left = luz.shadow.camera.bottom = -1.2; luz.shadow.camera.right = luz.shadow.camera.top = 1.2;
  escena.add(luz);
  const relleno = new THREE.DirectionalLight(0xdff3fa, 0.6);
  relleno.position.set(-3, 1, -2);
  escena.add(relleno);

  const cuerpo = construirFigura();
  cuerpo.children.forEach(m => { m.castShadow = true; });
  escena.add(cuerpo);
  // Suelo invisible que solo recibe la sombra de contacto (ancla la figura al espacio).
  const suelo = new THREE.Mesh(new THREE.CircleGeometry(1.2, 48), new THREE.ShadowMaterial({ opacity: 0.22 }));
  suelo.rotation.x = -Math.PI / 2;
  suelo.position.y = -0.56;
  suelo.receiveShadow = true;
  escena.add(suelo);
  const pines = new THREE.Group();
  escena.add(pines);

  const controles = new OrbitControls(camara, canvas);
  controles.target.set(0, ALTURA_MIRADA, 0);
  controles.enablePan = false;
  controles.enableDamping = true;
  controles.minDistance = 1.5;
  controles.maxDistance = 5;

  // Distinguir clic de arrastre: mismo punto (±5 px) y menos de 400 ms.
  const rayo = new THREE.Raycaster();
  let inicio = null;
  const ndcDe = e => {
    const r = canvas.getBoundingClientRect();
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  // Resalte de la región bajo el cursor (cada pieza tiene su propio material).
  let resaltada = null;
  canvas.addEventListener('pointermove', e => {
    if (inicio) return; // arrastrando: no resaltar
    rayo.setFromCamera(ndcDe(e), camara);
    const sobrePin = rayo.intersectObjects(pines.children)[0];
    const golpe = sobrePin ? null : rayo.intersectObjects(cuerpo.children)[0];
    const malla = golpe?.object || null;
    if (resaltada && resaltada !== malla) resaltada.material.emissive.setHex(0x000000);
    if (malla && malla !== resaltada) malla.material.emissive.setHex(0x0e5a6a);
    resaltada = malla;
    canvas.style.cursor = sobrePin || malla ? 'pointer' : 'grab';
    eventos.onHover?.(malla ? (malla.name === 'tronco' ? regionTronco(golpe.point.y) : malla.name) : null);
  });
  canvas.addEventListener('pointerleave', () => {
    if (resaltada) resaltada.material.emissive.setHex(0x000000);
    resaltada = null;
    eventos.onHover?.(null);
  });
  canvas.addEventListener('pointerdown', e => { inicio = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', e => {
    if (!inicio) return;
    const esClic = Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) < 5 && performance.now() - inicio.t < 400;
    inicio = null;
    if (!esClic) return;
    rayo.setFromCamera(ndcDe(e), camara);
    // Primero los pines (editar/borrar), luego el cuerpo (añadir).
    const pinTocado = rayo.intersectObjects(pines.children)[0];
    if (pinTocado) return eventos.onClickPin(pinTocado.object.userData.id);
    const golpe = rayo.intersectObjects(cuerpo.children)[0];
    if (!golpe) return;
    const { x, y, z } = golpe.point;
    const malla = golpe.object;
    // El lado ya va en el nombre de las extremidades; para tronco y cabeza se deduce de x.
    const lado = malla.userData.lado || (x > 0.02 ? 'izquierdo' : x < -0.02 ? 'derecho' : 'centro');
    const region = malla.name === 'tronco' ? regionTronco(y) : malla.name;
    eventos.onClickCuerpo({ region, lado, cara: z >= 0 ? 'anterior' : 'posterior', x, y, z });
  });

  // Ajuste al tamaño real del canvas (el CSS lo hace fluido).
  const ajustar = () => {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camara.aspect = w / h;
    camara.updateProjectionMatrix();
  };
  new ResizeObserver(ajustar).observe(canvas);
  ajustar();

  (function animar() {
    requestAnimationFrame(animar);
    controles.update();
    renderer.render(escena, camara);
  })();

  const geoPin = new THREE.SphereGeometry(0.028, 16, 12);
  const matPin = new THREE.MeshStandardMaterial({ color: COLOR_PIN, emissive: 0x7f1d1d, emissiveIntensity: 0.6, roughness: 0.35 });

  return {
    /** Añade una esfera roja en las coordenadas del pin ({ id, x, y, z }). */
    agregarPin(pin) {
      const m = new THREE.Mesh(geoPin, matPin);
      m.position.set(pin.x, pin.y, pin.z);
      m.userData.id = pin.id;
      pines.add(m);
    },
    borrarPin(id) {
      const m = pines.children.find(c => c.userData.id === id);
      if (m) pines.remove(m);
    },
    limpiarPines() { pines.clear(); },
    /** Coloca la cámara en la vista "frente" o "espalda". */
    vista(nombre) {
      camara.position.set(...VISTAS[nombre]);
      controles.update();
    },
    /** Devuelve una imagen PNG (dataURL) de la vista indicada y restaura la cámara. */
    snapshot(nombre) {
      const antes = camara.position.clone();
      // Más cerca que en pantalla para que la figura llene la imagen del informe.
      camara.position.set(...VISTAS[nombre].map((v, i) => (i === 2 ? v * 0.72 : v)));
      camara.lookAt(controles.target);
      renderer.render(escena, camara); // render síncrono justo antes de leer el buffer
      const url = canvas.toDataURL('image/png');
      camara.position.copy(antes);
      controles.update();
      return url;
    },
  };
}

// Figura de ~5 cabezas de alto (proporción infantil), centrada en x=0, de pies (y≈-0.55) a cabeza (y≈1.08).
// Las extremidades son cápsulas cuyos extremos coinciden exactamente con la articulación vecina:
// dos tapas esféricas centradas en el mismo punto se funden sin costura. El tronco es una sola
// pieza torneada; tórax / abdomen / pelvis se distinguen por la altura del punto tocado.
const V = (x, y, z = 0) => new THREE.Vector3(x, y, z);
const ARRIBA = new THREE.Vector3(0, 1, 0);

export function regionTronco(y) {
  return y > 0.50 ? 'tórax' : y > 0.30 ? 'abdomen' : 'pelvis';
}

function construirFigura() {
  const grupo = new THREE.Group();
  const añadir = (nombre, geometria, lado) => {
    // Un material por pieza: permite resaltar la región bajo el cursor sin afectar al resto.
    const m = new THREE.Mesh(geometria, new THREE.MeshStandardMaterial({ color: PIEL, roughness: 0.75, metalness: 0 }));
    m.name = nombre;
    if (lado) m.userData.lado = lado;
    grupo.add(m);
    return m;
  };
  // Cápsula orientada de A a B con las tapas centradas en A y B.
  const hueso = (nombre, A, B, r, lado) => {
    const dir = new THREE.Vector3().subVectors(B, A);
    const m = añadir(nombre, new THREE.CapsuleGeometry(r, dir.length(), 8, 24), lado);
    m.position.addVectors(A, B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(ARRIBA, dir.normalize());
    return m;
  };

  añadir('cabeza', new THREE.SphereGeometry(0.135, 32, 24)).position.set(0, 0.95, 0);
  hueso('cuello', V(0, 0.74), V(0, 0.87), 0.055);

  // Tronco torneado: perfil (radio, altura) de la pelvis a los hombros, aplanado en z.
  const perfil = [[0, 0.09], [0.12, 0.10], [0.165, 0.15], [0.17, 0.24], [0.155, 0.34], [0.15, 0.44],
                  [0.17, 0.56], [0.19, 0.66], [0.175, 0.73], [0.10, 0.775], [0, 0.78]].map(([r, y]) => new THREE.Vector2(r, y));
  añadir('tronco', new THREE.LatheGeometry(perfil, 40)).scale.z = 0.62;

  // Extremidades: +x = izquierda del paciente, -x = derecha.
  for (const [s, lado] of [[1, 'izquierdo'], [-1, 'derecho']]) {
    const hombro = V(s * 0.19, 0.70), codo = V(s * 0.26, 0.45, 0.02), muñeca = V(s * 0.30, 0.22, 0.05);
    hueso(`brazo ${lado}`, hombro, codo, 0.055, lado);
    hueso(`antebrazo ${lado}`, codo, muñeca, 0.048, lado);
    añadir(`mano ${lado}`, new THREE.SphereGeometry(0.06, 20, 16), lado).position.set(s * 0.31, 0.16, 0.06);

    const cadera = V(s * 0.09, 0.20), rodilla = V(s * 0.10, -0.12, 0.01), tobillo = V(s * 0.10, -0.44);
    hueso(`muslo ${lado}`, cadera, rodilla, 0.08, lado);
    hueso(`pierna ${lado}`, rodilla, tobillo, 0.062, lado);
    añadir(`pie ${lado}`, new THREE.BoxGeometry(0.1, 0.07, 0.2), lado).position.set(s * 0.10, -0.50, 0.05);
  }
  return grupo;
}
