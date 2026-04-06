'use client'

import { useEffect, useRef } from 'react'

export function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    let animFrameId: number
    let scene: import('three').Scene
    let camera: import('three').PerspectiveCamera
    let renderer: import('three').WebGLRenderer
    let globe: import('three').Points
    let arcs: import('three').Line[] = []
    let mouse = { x: 0, y: 0 }
    let targetRot = { x: 0, y: 0 }

    const init = async () => {
      const THREE = await import('three')
      const canvas = canvasRef.current
      if (!canvas) return

      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 1000)
      camera.position.z = 2.8

      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setSize(canvas.clientWidth, canvas.clientHeight)
      renderer.setClearColor(0x000000, 0)

      // ── Globe particles ──────────────────────────────────────────────────────
      const RADIUS = 1
      const SEGMENTS = 1800
      const positions: number[] = []
      const colors: number[] = []

      for (let i = 0; i < SEGMENTS; i++) {
        const phi = Math.acos(1 - 2 * (i / SEGMENTS))
        const theta = Math.PI * (1 + Math.sqrt(5)) * i

        const x = RADIUS * Math.sin(phi) * Math.cos(theta)
        const y = RADIUS * Math.cos(phi)
        const z = RADIUS * Math.sin(phi) * Math.sin(theta)

        positions.push(x, y, z)

        // Color: mix between cyan and blue/purple
        const t = 0.5 + 0.5 * y
        colors.push(
          0.1 + t * 0.3,        // r
          0.4 + t * 0.3,        // g  
          0.8 + (1 - t) * 0.2, // b
        )
      }

      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
      geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

      const mat = new THREE.PointsMaterial({
        size: 0.012,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        sizeAttenuation: true,
      })

      globe = new THREE.Points(geo, mat)
      scene.add(globe)

      // ── Connection arcs ──────────────────────────────────────────────────────
      const arcMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.25,
      })

      const CITY_LATLONS = [
        [23.6850, 90.3563],  // Bangladesh
        [7.8731, 80.7718],   // Sri Lanka
        [28.3949, 84.1240],  // Nepal
        [20.5937, 78.9629],  // India
        [37.0902, -95.7129], // USA
        [36.2048, 138.2529], // Japan
      ]

      const latLonToVec3 = (lat: number, lon: number, r = 1.01) => {
        const phi = (90 - lat) * (Math.PI / 180)
        const theta = (lon + 180) * (Math.PI / 180)
        return new THREE.Vector3(
          -r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        )
      }

      for (let i = 0; i < CITY_LATLONS.length; i++) {
        for (let j = i + 1; j < CITY_LATLONS.length; j++) {
          const a = latLonToVec3(CITY_LATLONS[i][0], CITY_LATLONS[i][1])
          const b = latLonToVec3(CITY_LATLONS[j][0], CITY_LATLONS[j][1])
          const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5)
          mid.normalize().multiplyScalar(1.3)

          const curve = new THREE.QuadraticBezierCurve3(a, mid, b)
          const pts = curve.getPoints(32)
          const arcGeo = new THREE.BufferGeometry().setFromPoints(pts)
          const arc = new THREE.Line(arcGeo, arcMat)
          scene.add(arc)
          arcs.push(arc)
        }
      }

      // ── Ambient light ────────────────────────────────────────────────────────
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
      scene.add(ambientLight)

      // ── Mouse parallax ───────────────────────────────────────────────────────
      const onMouseMove = (e: MouseEvent) => {
        mouse.x = (e.clientX / window.innerWidth - 0.5) * 2
        mouse.y = (e.clientY / window.innerHeight - 0.5) * 2
      }
      window.addEventListener('mousemove', onMouseMove)

      // ── Resize ───────────────────────────────────────────────────────────────
      const onResize = () => {
        if (!canvas) return
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      // ── Animation loop ───────────────────────────────────────────────────────
      let tick = 0
      const animate = () => {
        animFrameId = requestAnimationFrame(animate)
        tick += 0.003

        targetRot.x += (mouse.y * 0.3 - targetRot.x) * 0.05
        targetRot.y += (mouse.x * 0.3 - targetRot.y) * 0.05

        globe.rotation.y = tick + targetRot.y
        globe.rotation.x = targetRot.x

        arcs.forEach((arc) => {
          arc.rotation.y = tick + targetRot.y
          arc.rotation.x = targetRot.x
        })

        renderer.render(scene, camera)
      }
      animate()

      return () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('resize', onResize)
        cancelAnimationFrame(animFrameId)
        renderer.dispose()
      }
    }

    const cleanup = init()
    return () => {
      cleanup.then((fn) => fn?.())
      if (animFrameId) cancelAnimationFrame(animFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: 'block' }}
    />
  )
}
