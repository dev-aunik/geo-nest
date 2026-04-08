"use client";

import { useEffect, useRef } from "react";

export function FooterGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animFrameId: number;

    const init = async () => {
      const THREE = await import("three");
      const canvas = canvasRef.current;
      if (!canvas) return;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        50,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000,
      );
      camera.position.z = 2.5;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setClearColor(0x000000, 0);

      const positions: number[] = [];
      const colors: number[] = [];
      const SEGMENTS = 1200;

      for (let i = 0; i < SEGMENTS; i++) {
        const phi = Math.acos(1 - 2 * (i / SEGMENTS));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const RADIUS = 0.8;

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
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.PointsMaterial({
        size: 0.02,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

      const globe = new THREE.Points(geo, mat);
      scene.add(globe);

      const atmospherePositions: number[] = [];
      const ATMOSPHERE_COUNT = 1500;

      for (let i = 0; i < ATMOSPHERE_COUNT; i++) {
        const phi = Math.acos(1 - 2 * (i / ATMOSPHERE_COUNT));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i * 2;
        const r = 0.92 + Math.random() * 0.1;

        atmospherePositions.push(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        );
      }

      const atmosphereGeo = new THREE.BufferGeometry();
      atmosphereGeo.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(atmospherePositions, 3),
      );

      const atmosphereMat = new THREE.PointsMaterial({
        size: 0.01,
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.4,
        sizeAttenuation: true,
      });

      const atmosphere = new THREE.Points(atmosphereGeo, atmosphereMat);
      scene.add(atmosphere);

      let tick = 0;
      const animate = () => {
        animFrameId = requestAnimationFrame(animate);
        tick += 0.003;

        globe.rotation.y = tick * 0.4;
        globe.rotation.x = Math.sin(tick * 0.2) * 0.1;
        atmosphere.rotation.y = -tick * 0.2;

        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-[60px] h-[60px] sm:w-[75px] sm:h-[75px] md:w-[105px] md:h-[105px]"
      style={{ display: "block" }}
    />
  );
}
