import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { useTheme } from '@/lib/theme';

/* Boneco 3D dos golpes por região (aba "Por alvo" da luta). Modelo: "Universal Base Characters", de Quaternius
   (CC0, créditos em public/models/CREDITS.txt), só o corpo e comprimido (~90 KB).
   - Câmera ortográfica: sem perspectiva, cabeça/corpo/pernas ficam sempre na mesma altura da tela, então as
     linhas e números ao lado continuam alinhados enquanto o boneco gira.
   - As regiões são calculadas no shader pela posição de cada vértice na pose original (antes do esqueleto
     mexer): os braços abaixados continuam contando como "corpo".
   - Gira só em torno do eixo vertical (arrastando); gira sozinho devagar até a primeira interação. */

/** Enquadramento vertical em metros (o modelo tem 1,81 m). Os rótulos da página (BODY3D_ROWS em Fight.tsx) usam
    o centro de cada região nesse enquadramento: cabeça 1,69 m, corpo 1,24 m, pernas 0,47 m. */
const FRAME = { top: 1.9, bottom: -0.04 };

let gltfPromise: Promise<GLTF> | null = null;
const loadModel = () => {
  if (!gltfPromise) {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    gltfPromise = loader.loadAsync('/models/fighter.glb');
  }
  return gltfPromise;
};

const css = (name: string, fallback: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

/** Baixa os braços (pose de T → ao lado do corpo, com o cotovelo levemente dobrado) girando os ossos no espaço do mundo. */
function lowerArms(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const rotateWorld = (bone: THREE.Object3D, axis: THREE.Vector3, angle: number) => {
    const parentQ = new THREE.Quaternion();
    bone.parent?.getWorldQuaternion(parentQ);
    const worldQ = bone.getWorldQuaternion(new THREE.Quaternion());
    const r = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    bone.quaternion.copy(parentQ.invert().multiply(r.multiply(worldQ)));
    bone.updateMatrixWorld(true);
  };
  for (const side of ['l', 'r']) {
    const upper = root.getObjectByName(`upperarm_${side}`), lower = root.getObjectByName(`lowerarm_${side}`);
    if (!upper || !lower) continue;
    const x = lower.getWorldPosition(new THREE.Vector3()).x - upper.getWorldPosition(new THREE.Vector3()).x;
    const dir = Math.sign(x) || 1; // braço à direita (+x) ou à esquerda (−x) da tela
    rotateWorld(upper, new THREE.Vector3(0, 0, 1), -dir * 1.22);   // ~70° para baixo
    rotateWorld(lower, new THREE.Vector3(1, 0, 0), -0.35);          // antebraço um pouco à frente
  }
}

export default function Body3D({ side, intensity, onFail }: {
  side: 'a' | 'b';
  /** intensidade da cor em cada região, de 0 a 1 */
  intensity: { head: number; body: number; legs: number };
  onFail?: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const uniforms = useRef<Record<string, THREE.IUniform> | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { onFail?.(); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'pan-y'; // no celular, arrastar na vertical continua rolando a página

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x50546c, 1.15));
    const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(1.5, 3, 4); scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9); rim.position.set(-2, 2, -3); scene.add(rim);

    const midY = (FRAME.top + FRAME.bottom) / 2, halfH = (FRAME.top - FRAME.bottom) / 2;
    const camera = new THREE.OrthographicCamera(-1, 1, halfH, -halfH, 0.1, 20);
    camera.position.set(0, midY, 6);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, midY, 0);
    controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = true;
    controls.minPolarAngle = controls.maxPolarAngle = Math.PI / 2; // só gira em torno do eixo vertical
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    controls.autoRotate = !reduce; controls.autoRotateSpeed = 1.6;
    controls.addEventListener('start', () => { controls.autoRotate = false; });
    renderer.domElement.style.touchAction = 'pan-y';

    const resize = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = '100%'; renderer.domElement.style.height = '100%';
      const halfW = halfH * (w / h);
      camera.left = -halfW; camera.right = halfW; camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    let disposed = false, visible = true, frame = 0;
    const material = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0.05 });
    const u: Record<string, THREE.IUniform> = {
      uMin: { value: new THREE.Vector3() }, uMax: { value: new THREE.Vector3() },
      uInt: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color() }, uBase: { value: new THREE.Color() },
    };
    uniforms.current = u;
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, u);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uMin; uniform vec3 uMax; varying vec3 vZone;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vec3 nz = (position - uMin) / (uMax - uMin);
          float xc = abs(nz.x - 0.5) * 2.0;
          float zHead = smoothstep(0.855, 0.872, nz.y) * (1.0 - smoothstep(0.10, 0.13, xc));
          float zLegs = (1.0 - smoothstep(0.495, 0.515, nz.y)) * (1.0 - smoothstep(0.30, 0.34, xc));
          vZone = vec3(zHead, clamp(1.0 - zHead - zLegs, 0.0, 1.0), zLegs);`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec3 uInt; uniform vec3 uColor; uniform vec3 uBase; varying vec3 vZone;')
        .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(uBase, uColor, dot(vZone, uInt));');
    };

    loadModel().then(gltf => {
      if (disposed) return;
      const model = cloneSkinned(gltf.scene);
      model.traverse(o => {
        const m = o as THREE.SkinnedMesh;
        if (m.isMesh) {
          m.material = material;
          m.frustumCulled = false;
          const g = m.geometry;
          g.deleteAttribute('color');
          g.computeBoundingBox();
          u.uMin.value.copy(g.boundingBox!.min); u.uMax.value.copy(g.boundingBox!.max);
        }
      });
      lowerArms(model);
      // centraliza no eixo vertical de rotação
      const b = new THREE.Box3().setFromObject(model, true), c = b.getCenter(new THREE.Vector3());
      model.position.x -= c.x; model.position.z -= c.z;
      scene.add(model);
    }).catch(() => onFail?.());

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
    const tick = () => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); controls.dispose();
      material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // cores (tema e canto) e intensidades sem recriar a cena
  useEffect(() => {
    const u = uniforms.current;
    if (!u) return;
    u.uColor.value.set(css(side === 'a' ? '--red' : '--blue', side === 'a' ? '#e34948' : '#2a78d6'));
    u.uBase.value.set(theme === 'dark' ? '#5d5f6b' : '#c9c3b7');
    u.uInt.value.set(intensity.head, intensity.body, intensity.legs);
  }, [side, theme, intensity.head, intensity.body, intensity.legs]);

  return <div ref={box} className="absolute inset-0 cursor-grab active:cursor-grabbing" role="img" aria-label="Boneco 3D com os golpes significativos conectados por região; arraste para girar" />;
}
