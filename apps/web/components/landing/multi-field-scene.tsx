"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

type FieldDef = { id: string; name: string; x: [number, number]; z: [number, number] };

/** Cuatro campos separados por dos caminos que se cruzan (coordenadas del mundo 3D). */
const FIELD_LAYOUT: Omit<FieldDef, "name">[] = [
  { id: "esperanza", x: [-30, -3], z: [-19, -3] },
  { id: "ombu", x: [3, 30], z: [-19, -3] },
  { id: "sanmartin", x: [-30, -3], z: [3, 19] },
  { id: "alamos", x: [3, 30], z: [3, 19] },
];

const CROP_COLORS = ["#7fae6e", "#a9c46c", "#d6c07d", "#93b98a", "#b9a27c", "#6e9e68"].map((hex) => new THREE.Color(hex));
const ROAD_COLOR = new THREE.Color("#ddd5c1");
const OUTSIDE_COLOR = new THREE.Color("#a8bca0");
const FADED_COLOR = new THREE.Color("#e2e7e1");
const OUTLINE_ACTIVE = new THREE.Color("#e0a21a");
const BACKGROUND = "#eef3ef";

function terrainHeight(x: number, z: number) {
  return 0.7 * Math.sin(x * 0.13) + 0.55 * Math.cos(z * 0.16) + 0.3 * Math.sin((x + z) * 0.27);
}

function fieldIndexAt(x: number, z: number) {
  return FIELD_LAYOUT.findIndex((f) => x >= f.x[0] && x <= f.x[1] && z >= f.z[0] && z <= f.z[1]);
}

/** Color base de un triángulo según el lote del campo donde cae (6 lotes por campo). */
function baseColorAt(x: number, z: number, fieldIndex: number) {
  if (Math.abs(x) < 3 || Math.abs(z) < 3) return ROAD_COLOR;
  if (fieldIndex < 0) return OUTSIDE_COLOR;
  const field = FIELD_LAYOUT[fieldIndex]!;
  const col = Math.min(2, Math.floor(((x - field.x[0]) / (field.x[1] - field.x[0])) * 3));
  const row = Math.min(1, Math.floor(((z - field.z[0]) / (field.z[1] - field.z[0])) * 2));
  return CROP_COLORS[(fieldIndex * 5 + col * 2 + row * 3) % CROP_COLORS.length]!;
}

type MultiFieldSceneProps = {
  fields: { id: string; name: string }[];
  activeFieldIds: string[];
  reduceMotion: boolean;
};

export default function MultiFieldScene({ fields, activeFieldIds, reduceMotion }: MultiFieldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeRef = useRef(activeFieldIds);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    activeRef.current = activeFieldIds;
  }, [activeFieldIds]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      setFailed(true);
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    container.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(BACKGROUND, 62, 118);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 300);
    camera.position.set(0, 44, 58);
    camera.lookAt(0, 0, 2);

    scene.add(new THREE.HemisphereLight("#ffffff", "#c9d4c2", 1.5));
    const sun = new THREE.DirectionalLight("#fff1d6", 1.9);
    sun.position.set(-24, 36, 14);
    scene.add(sun);

    const world = new THREE.Group();
    scene.add(world);

    // Terreno low-poly: geometría no indexada para que cada triángulo tenga color propio.
    // Celdas de 1x1 para que los límites de lotes (enteros) caigan justo en la grilla; el
    // plano se extiende hacia el fondo para que el borde se pierda en la niebla.
    const plane = new THREE.PlaneGeometry(120, 100, 120, 100);
    plane.rotateX(-Math.PI / 2);
    plane.translate(0, 0, -20);
    const geometry = plane.toNonIndexed();
    plane.dispose();

    const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)));
    }
    geometry.computeVertexNormals();

    const vertexCount = positions.count;
    const baseColors = new Float32Array(vertexCount * 3);
    const vertexField = new Int8Array(vertexCount);
    for (let tri = 0; tri < vertexCount; tri += 3) {
      const cx = (positions.getX(tri) + positions.getX(tri + 1) + positions.getX(tri + 2)) / 3;
      const cz = (positions.getZ(tri) + positions.getZ(tri + 1) + positions.getZ(tri + 2)) / 3;
      const fieldIndex = Math.abs(cx) < 3 || Math.abs(cz) < 3 ? -1 : fieldIndexAt(cx, cz);
      const color = baseColorAt(cx, cz, fieldIndex);
      for (let v = tri; v < tri + 3; v++) {
        baseColors.set([color.r, color.g, color.b], v * 3);
        vertexField[v] = fieldIndex;
      }
    }
    const colorAttribute = new THREE.BufferAttribute(new Float32Array(baseColors), 3);
    geometry.setAttribute("color", colorAttribute);

    const terrainMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    world.add(new THREE.Mesh(geometry, terrainMaterial));

    // Contorno de cada campo, siguiendo el relieve.
    const outlineMaterials: LineMaterial[] = [];
    const outlineGeometries: LineGeometry[] = [];
    const pinAnchors: THREE.Vector3[] = [];
    const pinMaterials: THREE.MeshLambertMaterial[] = [];
    const pinGeometry = new THREE.CylinderGeometry(0.14, 0.14, 3.2, 8);
    const headGeometry = new THREE.SphereGeometry(0.62, 16, 12);

    FIELD_LAYOUT.forEach((field) => {
      const inset = 0.7;
      const [x0, x1] = [field.x[0] + inset, field.x[1] - inset];
      const [z0, z1] = [field.z[0] + inset, field.z[1] - inset];
      const corners: [number, number][] = [[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]];
      const points: number[] = [];
      for (let c = 0; c < corners.length - 1; c++) {
        const [ax, az] = corners[c]!;
        const [bx, bz] = corners[c + 1]!;
        for (let s = 0; s <= 24; s++) {
          const x = ax + ((bx - ax) * s) / 24;
          const z = az + ((bz - az) * s) / 24;
          points.push(x, terrainHeight(x, z) + 0.2, z);
        }
      }
      const lineGeometry = new LineGeometry();
      lineGeometry.setPositions(points);
      const lineMaterial = new LineMaterial({ color: 0xffffff, linewidth: 2.5, transparent: true, opacity: 0.9 });
      outlineGeometries.push(lineGeometry);
      outlineMaterials.push(lineMaterial);
      world.add(new Line2(lineGeometry, lineMaterial));

      const cx = (field.x[0] + field.x[1]) / 2;
      const cz = (field.z[0] + field.z[1]) / 2;
      const ground = terrainHeight(cx, cz);
      const pinMaterial = new THREE.MeshLambertMaterial({ color: "#ffffff" });
      pinMaterials.push(pinMaterial);
      const pin = new THREE.Mesh(pinGeometry, pinMaterial);
      pin.position.set(cx, ground + 1.6, cz);
      const head = new THREE.Mesh(headGeometry, pinMaterial);
      head.position.set(cx, ground + 3.4, cz);
      world.add(pin, head);
      pinAnchors.push(new THREE.Vector3(cx, ground + 4.6, cz));
    });

    // Estado animado por campo: 1 = accesible para el rol, 0 = apagado.
    const levels: number[] = FIELD_LAYOUT.map((field) => (activeRef.current.includes(field.id) ? 1 : 0));

    const applyLevels = () => {
      const target = new THREE.Color();
      for (let v = 0; v < vertexCount; v++) {
        const fieldIndex = vertexField[v]!;
        const level = fieldIndex < 0 ? 1 : levels[fieldIndex]!;
        target.setRGB(baseColors[v * 3]!, baseColors[v * 3 + 1]!, baseColors[v * 3 + 2]!).lerp(FADED_COLOR, (1 - level) * 0.82);
        colorAttribute.setXYZ(v, target.r, target.g, target.b);
      }
      colorAttribute.needsUpdate = true;
      outlineMaterials.forEach((material, index) => {
        material.color.set(0xffffff).lerp(OUTLINE_ACTIVE, levels[index]!);
        material.opacity = 0.35 + 0.65 * levels[index]!;
      });
      pinMaterials.forEach((material, index) => material.color.set("#ffffff").lerp(OUTLINE_ACTIVE, levels[index]!));
    };
    applyLevels();

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // En pantallas angostas la cámara se aleja para que entren los cuatro campos.
      const distance = w < 640 ? 1.45 : 1;
      camera.position.set(0, 44 * distance, 58 * distance);
      camera.lookAt(0, 0, 2);
      camera.updateProjectionMatrix();
      outlineMaterials.forEach((material) => material.resolution.set(w, h));
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const pointer = { x: 0, y: 0 };
    const onPointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = ((event.clientY - rect.top) / rect.height) * 2 - 1;
    };
    container.addEventListener("pointermove", onPointerMove);

    const projected = new THREE.Vector3();
    const updateLabels = () => {
      const { clientWidth: w, clientHeight: h } = container;
      pinAnchors.forEach((anchor, index) => {
        const label = labelRefs.current[index];
        if (!label) return;
        projected.copy(anchor).applyMatrix4(world.matrixWorld).project(camera);
        const x = (projected.x * 0.5 + 0.5) * w;
        const y = (-projected.y * 0.5 + 0.5) * h;
        label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        label.style.opacity = String(0.45 + 0.55 * levels[index]!);
        label.dataset.active = levels[index]! > 0.5 ? "true" : "false";
      });
    };

    const timer = new THREE.Timer();
    let running = false;
    let frame = 0;

    const tick = () => {
      if (!running) return;
      timer.update();
      const delta = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();

      let changed = false;
      FIELD_LAYOUT.forEach((field, index) => {
        const goal = activeRef.current.includes(field.id) ? 1 : 0;
        const current = levels[index]!;
        if (Math.abs(goal - current) > 0.001) {
          levels[index] = reduceMotion ? goal : current + (goal - current) * Math.min(1, delta * 6);
          changed = true;
        }
      });
      if (changed) applyLevels();

      if (!reduceMotion) {
        const idle = Math.sin(elapsed * 0.18) * 0.1;
        world.rotation.y += (idle + pointer.x * 0.12 - world.rotation.y) * Math.min(1, delta * 2.5);
        world.rotation.x += (pointer.y * 0.04 - world.rotation.x) * Math.min(1, delta * 2.5);
      }

      world.updateMatrixWorld();
      renderer.render(scene, camera);
      updateLabels();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      timer.reset();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const visibility = new IntersectionObserver(([entry]) => (entry?.isIntersecting ? start() : stop()), {
      rootMargin: "120px",
    });
    visibility.observe(container);
    const onVisibilityChange = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      stop();
      visibility.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      container.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      terrainMaterial.dispose();
      outlineGeometries.forEach((g) => g.dispose());
      outlineMaterials.forEach((m) => m.dispose());
      pinGeometry.dispose();
      headGeometry.dispose();
      pinMaterials.forEach((m) => m.dispose());
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [reduceMotion]);

  if (failed) {
    return (
      <Image
        src="/landing/campo-horizonte.jpg"
        alt="Vista aérea de campos agrícolas hasta el horizonte"
        fill
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="object-cover"
      />
    );
  }

  return (
    <div ref={containerRef} className="absolute inset-0">
      {fields.map((field, index) => (
        <div
          key={field.id}
          ref={(el) => {
            labelRefs.current[index] = el;
          }}
          aria-hidden
          data-active="false"
          className="pointer-events-none absolute top-0 left-0 rounded-full bg-white px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap text-l-ink shadow-l transition-colors duration-300 data-[active=true]:bg-l-ink data-[active=true]:text-white"
        >
          {field.name}
        </div>
      ))}
    </div>
  );
}
