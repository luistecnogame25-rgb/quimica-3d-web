/*
 * Química 3D — interacción del sitio.
 * Se empaqueta (con Three.js) en assets/app.js para que la página funcione
 * también abriendo index.html directamente, sin servidor.
 *   Reconstruir: npm run build   (ver package.json)
 */
import {
  AmbientLight,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SphereGeometry,
  Vector3,
  WebGLRenderer,
} from 'three';

/* Enlace directo de PayPal (opcional). Si lo tienes (p. ej. https://paypal.me/tuusuario),
   escríbelo aquí y aparecerá un botón «Donar en PayPal» debajo del código QR. */
const PAYPAL_LINK = '';

/* ------------------------------ utilidades ------------------------------ */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

document.getElementById('year').textContent = String(new Date().getFullYear());

// Barra de navegación con fondo al desplazarse
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 20);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Animaciones de entrada
const io = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        $$('.reveal', e.target).forEach((c) => c.classList.add('in'));
        io.unobserve(e.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
);
$$('.reveal').forEach((el) => io.observe(el));

// Enlace de PayPal opcional
if (PAYPAL_LINK) {
  const a = $('#paypalLink');
  a.href = PAYPAL_LINK;
  a.classList.remove('hidden');
}

// Compartir
$('#shareBtn').addEventListener('click', async () => {
  const data = { title: 'Química 3D', text: 'Una app para ver la química en 3D. ¡Ayuda a que llegue a Google Play!', url: location.href };
  try {
    if (navigator.share) await navigator.share(data);
    else {
      await navigator.clipboard.writeText(location.href);
      $('#shareBtn').lastChild.textContent = ' ¡Enlace copiado!';
    }
  } catch {
    /* el usuario canceló */
  }
});

/* ------------------------- escaparate de capturas ------------------------- */
{
  const showcase = $('.showcase');
  const tabs = $$('.show-tab');
  const shots = $$('#phoneScreen .shot');
  let current = 0;
  let timer = 0;
  const show = (i) => {
    current = (i + tabs.length) % tabs.length;
    tabs.forEach((t, k) => {
      t.classList.toggle('active', k === current);
      t.setAttribute('aria-selected', String(k === current));
    });
    shots.forEach((s, k) => s.classList.toggle('active', k === current));
    $('#phoneScreen').classList.toggle('nobar', shots[current].classList.contains('nobar'));
    // reinicia la barra de progreso
    const a = tabs[current];
    a.classList.remove('active');
    void a.offsetWidth;
    a.classList.add('active');
    schedule();
  };
  const schedule = () => {
    clearTimeout(timer);
    if (!reduceMotion && !showcase.classList.contains('paused')) timer = setTimeout(() => show(current + 1), 5000);
  };
  tabs.forEach((t, k) => t.addEventListener('click', () => show(k)));
  showcase.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') {
      showcase.classList.add('paused');
      clearTimeout(timer);
    }
  });
  showcase.addEventListener('pointerleave', () => {
    showcase.classList.remove('paused');
    schedule();
  });
  schedule();
}

/* --------------------------- molécula interactiva --------------------------- */
// Colores CPK y radios covalentes (Å) de los elementos presentes en la demo.
const CPK = { 1: '#ffffff', 6: '#909090', 7: '#3050f8', 8: '#ff0d0d' };
const RADIUS = { 1: 0.31, 6: 0.76, 7: 0.71, 8: 0.66 };
const DISPLAY = {
  agua: 'H₂O',
  'dioxido-carbono': 'CO₂',
  metano: 'CH₄',
  amoniaco: 'NH₃',
  etanol: 'CH₃CH₂OH',
  benceno: 'C₆H₆',
  glucosa: 'C₆H₁₂O₆',
};
const ORDER = ['agua', 'dioxido-carbono', 'metano', 'amoniaco', 'etanol', 'benceno', 'glucosa'];

function initMolecule() {
  const canvas = $('#molCanvas');
  const stage = $('#molStage');
  const data = (window.MOLECULAS || []).slice().sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  if (!data.length) return;

  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    stage.innerHTML = '<img src="assets/capturas/m-mol.png" alt="Molécula en 3D" style="height:100%;margin:auto;border-radius:20px" />';
    return;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new Scene();
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  scene.add(new AmbientLight(0xffffff, 0.9));
  const key = new DirectionalLight(0xffffff, 2.2);
  key.position.set(4, 6, 8);
  scene.add(key);
  const rim = new DirectionalLight(0x8fb6ff, 1.2);
  rim.position.set(-6, -2, -4);
  scene.add(rim);

  const root = new Group();
  scene.add(root);
  const sphere = new SphereGeometry(1, 48, 32);
  const cyl = new CylinderGeometry(1, 1, 1, 24);
  const mats = {};
  const mat = (z) => (mats[z] ??= new MeshStandardMaterial({ color: new Color(CPK[z] || '#ff66cc'), roughness: 0.35, metalness: 0.05 }));
  const bondMat = new MeshStandardMaterial({ color: 0xb9c0cc, roughness: 0.45 });
  let mol = null;

  function build(m) {
    if (mol) root.remove(mol);
    mol = new Group();
    const pts = m.atoms.map((a) => new Vector3(a[1], a[2], a[3]));
    const center = pts.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / pts.length);
    pts.forEach((p) => p.sub(center));
    m.atoms.forEach((a, i) => {
      const s = new Mesh(sphere, mat(a[0]));
      const r = 0.18 + 0.42 * (RADIUS[a[0]] ?? 0.7);
      s.scale.setScalar(r);
      s.position.copy(pts[i]);
      mol.add(s);
    });
    const up = new Vector3(0, 1, 0);
    for (const [ia, ib, order] of m.bonds) {
      const a = pts[ia];
      const b = pts[ib];
      const dir = new Vector3().subVectors(b, a);
      const len = dir.length();
      const q = new Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      // desplazamiento perpendicular para dobles/triples
      let perp = new Vector3().crossVectors(dir, new Vector3(0, 0, 1));
      if (perp.lengthSq() < 1e-4) perp = new Vector3().crossVectors(dir, new Vector3(1, 0, 0));
      perp.normalize();
      const n = Math.min(order || 1, 3);
      const offs = n === 1 ? [0] : n === 2 ? [-0.09, 0.09] : [-0.14, 0, 0.14];
      const rad = n === 1 ? 0.085 : 0.055;
      for (const o of offs) {
        const c = new Mesh(cyl, bondMat);
        c.scale.set(rad, len, rad);
        c.quaternion.copy(q);
        c.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(perp, o);
        mol.add(c);
      }
    }
    root.add(mol);
    const radius = Math.max(...pts.map((p) => p.length())) + 0.6;
    camera.position.set(0, 0, Math.max(6, radius / Math.tan((camera.fov * Math.PI) / 360) * 1.05));
    camera.lookAt(0, 0, 0);
    $('#molName').textContent = m.name;
    $('#molFormula').textContent = DISPLAY[m.id] || m.formula;
    $('#molBonding').textContent = m.bonding;
    dirty = true;
  }

  // chips
  const chips = $('#molChips');
  data.forEach((m, i) => {
    const b = document.createElement('button');
    b.className = 'chip' + (i === 0 ? ' active' : '');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.textContent = m.name.replace(' (D-glucosa)', '');
    b.addEventListener('click', () => {
      $$('.chip', chips).forEach((c) => c.classList.toggle('active', c === b));
      build(m);
      spin = 0.6;
    });
    chips.append(b);
  });

  // tamaño
  let dirty = true;
  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
  };
  new ResizeObserver(resize).observe(stage);

  // arrastre para girar (ratón y táctil)
  let dragging = false;
  let lx = 0;
  let ly = 0;
  let vx = 0;
  let vy = 0;
  let spin = 0;
  let interacted = false;
  root.rotation.set(0.35, -0.5, 0);
  stage.addEventListener('pointerdown', (e) => {
    dragging = true;
    lx = e.clientX;
    ly = e.clientY;
    stage.setPointerCapture(e.pointerId);
    if (!interacted) {
      interacted = true;
      $('.mol-hint').style.opacity = '0';
    }
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    vx = (e.clientX - lx) * 0.01;
    vy = (e.clientY - ly) * 0.01;
    root.rotation.y += vx;
    root.rotation.x += vy;
    lx = e.clientX;
    ly = e.clientY;
    dirty = true;
  });
  const end = () => (dragging = false);
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);

  // solo se dibuja cuando está visible (ahorra batería)
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(stage);

  const tick = () => {
    requestAnimationFrame(tick);
    if (!visible) return;
    if (!dragging) {
      if (Math.abs(vx) > 0.0005 || Math.abs(vy) > 0.0005) {
        root.rotation.y += vx;
        root.rotation.x += vy;
        vx *= 0.94;
        vy *= 0.94;
        dirty = true;
      } else if (!reduceMotion) {
        spin = spin * 0.96 + 0.004 * 0.04;
        root.rotation.y += 0.004 + spin;
        dirty = true;
      }
    }
    if (dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
  };
  build(data[0]);
  resize();
  tick();
}
initMolecule();
