"use client";

import { useEffect, useRef, useState } from "react";

export function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let animFrameId: number;
    let scene: import("three").Scene;
    let camera: import("three").PerspectiveCamera;
    let renderer: import("three").WebGLRenderer;
    let globe: import("three").Points;
    let innerGlobe: import("three").Points;
    let arcs: import("three").Line[] = [];
    let rings: import("three").Mesh[] = [];
    let cityDots: import("three").Points[] = [];
    let particles: import("three").Points;
    let mouse = { x: 0, y: 0 };
    let targetRot = { x: 0, y: 0 };
    let tick = 0;

    const init = async () => {
      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000,
      );
      camera.position.z = 3;

      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setClearColor(0x000000, 0);

      // ── Outer particle atmosphere ─────────────────────────────────────────────
      const atmospherePositions: number[] = [];
      const atmosphereColors: number[] = [];
      const ATMOSPHERE_COUNT = 3000;

      for (let i = 0; i < ATMOSPHERE_COUNT; i++) {
        const phi = Math.acos(1 - 2 * (i / ATMOSPHERE_COUNT));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i * 2;
        const r = 1.15 + Math.random() * 0.15;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        atmospherePositions.push(x, y, z);

        const brightness = 0.3 + Math.random() * 0.7;
        atmosphereColors.push(
          0.2 * brightness,
          0.6 * brightness,
          1 * brightness,
        );
      }

      const atmosphereGeo = new THREE.BufferGeometry();
      atmosphereGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(atmospherePositions, 3),
      );
      atmosphereGeo.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(atmosphereColors, 3),
      );

      const atmosphereMat = new THREE.PointsMaterial({
        size: 0.008,
        vertexColors: true,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
      });

      const atmosphere = new THREE.Points(atmosphereGeo, atmosphereMat);
      scene.add(atmosphere);

      // ── Main Globe particles ──────────────────────────────────────────────────
      const RADIUS = 1;
      const SEGMENTS = 2500;
      const positions: number[] = [];
      const colors: number[] = [];
      const sizes: number[] = [];

      for (let i = 0; i < SEGMENTS; i++) {
        const phi = Math.acos(1 - 2 * (i / SEGMENTS));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;

        const x = RADIUS * Math.sin(phi) * Math.cos(theta);
        const y = RADIUS * Math.cos(phi);
        const z = RADIUS * Math.sin(phi) * Math.sin(theta);

        positions.push(x, y, z);

        const t = 0.5 + 0.5 * y;
        const brightness = 0.7 + Math.random() * 0.3;
        colors.push(
          (0.1 + t * 0.4) * brightness,
          (0.5 + t * 0.3) * brightness,
          (0.9 - t * 0.2) * brightness,
        );
        sizes.push(0.5 + Math.random() * 0.5);
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
      geo.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: 0.015,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

      globe = new THREE.Points(geo, mat);
      scene.add(globe);

      // ── Inner glow sphere ────────────────────────────────────────────────────
      const innerPositions: number[] = [];
      const innerColors: number[] = [];
      const INNER_COUNT = 800;

      for (let i = 0; i < INNER_COUNT; i++) {
        const phi = Math.acos(1 - 2 * (i / INNER_COUNT));
        const theta = Math.PI * (1 + Math.sqrt(3)) * i;
        const r = 0.92 + Math.random() * 0.06;

        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);

        innerPositions.push(x, y, z);
        innerColors.push(0.1, 0.5, 0.95);
      }

      const innerGeo = new THREE.BufferGeometry();
      innerGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(innerPositions, 3),
      );
      innerGeo.setAttribute(
        "color",
        new THREE.Float32BufferAttribute(innerColors, 3),
      );

      const innerMat = new THREE.PointsMaterial({
        size: 0.025,
        vertexColors: true,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
      });

      innerGlobe = new THREE.Points(innerGeo, innerMat);
      scene.add(innerGlobe);

      // ── Orbital rings ─────────────────────────────────────────────────────────
      const ringAngles = [0, Math.PI / 3, Math.PI / 1.5];

      ringAngles.forEach((angle, idx) => {
        const ringGeo = new THREE.RingGeometry(
          1.25 + idx * 0.15,
          1.28 + idx * 0.15,
          128,
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 0 ? 0x38bdf8 : idx === 1 ? 0x818cf8 : 0xc084fc,
          transparent: true,
          opacity: 0.12 - idx * 0.03,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2 + angle;
        ring.rotation.z = angle / 2;
        scene.add(ring);
        rings.push(ring);
      });

      // ── Connection arcs with glow ─────────────────────────────────────────────
      const CITY_LATLONS = [
        [23.685, 90.3563], // Bangladesh
        [7.8731, 80.7718], // Sri Lanka
        [28.3949, 84.124], // Nepal
        [20.5937, 78.9629], // India
        [37.0902, -95.7129], // USA
        [36.2048, 138.2529], // Japan
        [51.5074, -0.1278], // UK
        [-33.8688, 151.2093], // Australia
      ];

      const latLonToVec3 = (lat: number, lon: number, r = 1.01) => {
        const phi = (90 - lat) * (Math.PI / 180);
        const theta = (lon + 180) * (Math.PI / 180);
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        );
      };

      // Create arcs between cities
      for (let i = 0; i < CITY_LATLONS.length; i++) {
        for (let j = i + 1; j < CITY_LATLONS.length; j++) {
          const a = latLonToVec3(CITY_LATLONS[i][0], CITY_LATLONS[i][1]);
          const b = latLonToVec3(CITY_LATLONS[j][0], CITY_LATLONS[j][1]);
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
          mid.normalize().multiplyScalar(1.35 + Math.random() * 0.1);

          const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
          const pts = curve.getPoints(48);
          const arcGeo = new THREE.BufferGeometry().setFromPoints(pts);
          const arcMat = new THREE.LineBasicMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.2 + Math.random() * 0.15,
          });
          const arc = new THREE.Line(arcGeo, arcMat);
          scene.add(arc);
          arcs.push(arc);
        }

        // City dot with pulse
        const cityPos = latLonToVec3(
          CITY_LATLONS[i][0],
          CITY_LATLONS[i][1],
          1.03,
        );
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(
            [cityPos.x, cityPos.y, cityPos.z],
            3,
          ),
        );
        const dotMat = new THREE.PointsMaterial({
          color: i < 6 ? 0x06b6d4 : 0x8b5cf6,
          size: 0.06,
          transparent: true,
          opacity: 0.9,
          sizeAttenuation: true,
        });
        const dot = new THREE.Points(dotGeo, dotMat);
        scene.add(dot);
        cityDots.push(dot);
      }

      // ── Floating particles ───────────────────────────────────────────────────
      const particlePositions: number[] = [];
      const particleVelocities: { x: number; y: number; z: number }[] = [];
      const PARTICLE_COUNT = 200;

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlePositions.push(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6,
        );
        particleVelocities.push({
          x: (Math.random() - 0.5) * 0.002,
          y: (Math.random() - 0.5) * 0.002,
          z: (Math.random() - 0.5) * 0.002,
        });
      }

      const particleGeo = new THREE.BufferGeometry();
      const particlePosAttr = new THREE.Float32BufferAttribute(
        particlePositions,
        3,
      );
      particleGeo.setAttribute("position", particlePosAttr);
      const particleMat = new THREE.PointsMaterial({
        color: 0x67e8f9,
        size: 0.02,
        transparent: true,
        opacity: 0.6,
        sizeAttenuation: true,
      });
      particles = new THREE.Points(particleGeo, particleMat);
      scene.add(particles);

      // ── Ambient & point lights ────────────────────────────────────────────────
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.15);
      scene.add(ambientLight);

      const pointLight = new THREE.PointLight(0x38bdf8, 0.5, 10);
      pointLight.position.set(2, 2, 2);
      scene.add(pointLight);

      // ── Mouse tracking ───────────────────────────────────────────────────────
      const onMouseMove = (e: MouseEvent) => {
        const rect = canvas.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouse.y = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
        setMousePos({ x: e.clientX, y: e.clientY });
      };
      window.addEventListener("mousemove", onMouseMove);

      // ── Resize handler ────────────────────────────────────────────────────────
      const onResize = () => {
        if (!canvas) return;
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener("resize", onResize);

      // ── Animation loop ────────────────────────────────────────────────────────
      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        tick += 0.004;

        // Smooth rotation toward mouse
        targetRot.x += (mouse.y * 0.4 - targetRot.x) * 0.03;
        targetRot.y += (mouse.x * 0.4 - targetRot.y) * 0.03;

        // Globe rotation with auto-spin
        globe.rotation.y = tick * 0.3 + targetRot.y;
        globe.rotation.x = Math.sin(tick * 0.2) * 0.1 + targetRot.x;
        globe.rotation.z = Math.cos(tick * 0.15) * 0.05;

        // Inner glow slightly offset
        innerGlobe.rotation.y = tick * 0.25 + targetRot.y + 0.2;
        innerGlobe.rotation.x = targetRot.x * 0.5;

        // Atmosphere counter-rotation
        atmosphere.rotation.y = -tick * 0.15 + targetRot.y;
        atmosphere.rotation.x = targetRot.x * 0.3;

        // Orbital rings animation
        rings.forEach((ring, idx) => {
          ring.rotation.z = tick * (0.1 + idx * 0.05) + (idx * Math.PI) / 3;
          ring.rotation.x = Math.PI / 2 + Math.sin(tick * 0.5 + idx) * 0.1;
        });

        // Arcs follow globe
        arcs.forEach((arc, idx) => {
          arc.rotation.y = tick * 0.3 + targetRot.y;
          arc.rotation.x = Math.sin(tick * 0.2) * 0.1 + targetRot.x;
          // Pulse opacity
          const mat = arc.material as THREE.LineBasicMaterial;
          mat.opacity = 0.15 + Math.sin(tick * 2 + idx * 0.5) * 0.1;
        });

        // City dots pulse
        cityDots.forEach((dot, idx) => {
          dot.rotation.y = tick * 0.3 + targetRot.y;
          dot.rotation.x = targetRot.x;
          const scale = 1 + Math.sin(tick * 3 + idx) * 0.3;
          dot.scale.set(scale, scale, scale);
        });

        // Floating particles
        const posAttr = particles.geometry.attributes.position;
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          posAttr.array[i * 3] += particleVelocities[i].x;
          posAttr.array[i * 3 + 1] += particleVelocities[i].y;
          posAttr.array[i * 3 + 2] += particleVelocities[i].z;

          // Wrap around
          for (let j = 0; j < 3; j++) {
            if (Math.abs(posAttr.array[i * 3 + j]) > 3) {
              posAttr.array[i * 3 + j] *= -0.9;
            }
          }
        }
        posAttr.needsUpdate = true;

        // Point light movement
        pointLight.position.x = Math.sin(tick) * 2;
        pointLight.position.y = Math.cos(tick * 0.7) * 2;
        pointLight.position.z = Math.cos(tick) * 2 + 1;

        renderer.render(scene, camera);
      };
      animate();

      return () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("resize", onResize);
        cancelAnimationFrame(animFrameId);
        renderer.dispose();
      };
    };

    const cleanup = init();
    return () => {
      cleanup.then((fn) => fn?.());
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      style={{ display: "block" }}
    />
  );
}
