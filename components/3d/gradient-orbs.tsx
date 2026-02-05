"use client"

import * as React from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Environment, MeshTransmissionMaterial } from "@react-three/drei"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Orb Configuration - Each represents wealth/asset abstraction
// ─────────────────────────────────────────────────────────────────────────────

interface OrbConfig {
  position: [number, number, number]
  scale: number
  color: string
  speed: number
  rotationAxis: [number, number, number]
  orbitRadius: number
  orbitSpeed: number
  floatIntensity: number
}

const orbConfigs: OrbConfig[] = [
  // Main large orb - center of composition
  {
    position: [0, 0, 0],
    scale: 1.8,
    color: "#14b8a6", // teal-500
    speed: 0.15,
    rotationAxis: [0, 1, 0],
    orbitRadius: 0,
    orbitSpeed: 0,
    floatIntensity: 0.3,
  },
  // Secondary orbs - orbiting
  {
    position: [2.5, 0.5, -1],
    scale: 0.9,
    color: "#06b6d4", // cyan-500
    speed: 0.2,
    rotationAxis: [1, 0.5, 0],
    orbitRadius: 2.8,
    orbitSpeed: 0.15,
    floatIntensity: 0.5,
  },
  {
    position: [-2, -0.3, 0.5],
    scale: 0.7,
    color: "#0891b2", // cyan-600
    speed: 0.25,
    rotationAxis: [0.5, 1, 0.5],
    orbitRadius: 2.5,
    orbitSpeed: -0.12,
    floatIntensity: 0.6,
  },
  {
    position: [1.5, -1, 1.5],
    scale: 0.5,
    color: "#2dd4bf", // teal-400
    speed: 0.3,
    rotationAxis: [0, 0.5, 1],
    orbitRadius: 2.2,
    orbitSpeed: 0.2,
    floatIntensity: 0.7,
  },
  // Smaller accent orbs
  {
    position: [-1.8, 1.2, -0.5],
    scale: 0.4,
    color: "#22d3ee", // cyan-400
    speed: 0.35,
    rotationAxis: [1, 1, 0],
    orbitRadius: 2,
    orbitSpeed: -0.18,
    floatIntensity: 0.8,
  },
  {
    position: [0.8, 1.5, 0.8],
    scale: 0.35,
    color: "#5eead4", // teal-300
    speed: 0.4,
    rotationAxis: [0.5, 0, 1],
    orbitRadius: 1.8,
    orbitSpeed: 0.22,
    floatIntensity: 0.9,
  },
  {
    position: [-0.5, -1.5, 1],
    scale: 0.3,
    color: "#99f6e4", // teal-200
    speed: 0.45,
    rotationAxis: [1, 0, 0.5],
    orbitRadius: 2.3,
    orbitSpeed: -0.25,
    floatIntensity: 1,
  },
  // Tiny accent particles
  {
    position: [2, 1, 0],
    scale: 0.2,
    color: "#a5f3fc", // cyan-200
    speed: 0.5,
    rotationAxis: [0, 1, 1],
    orbitRadius: 3,
    orbitSpeed: 0.3,
    floatIntensity: 1.2,
  },
  {
    position: [-2.5, 0.8, 0.3],
    scale: 0.18,
    color: "#67e8f9", // cyan-300
    speed: 0.55,
    rotationAxis: [1, 0.5, 0.5],
    orbitRadius: 3.2,
    orbitSpeed: -0.28,
    floatIntensity: 1.1,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Glass Orb Component
// ─────────────────────────────────────────────────────────────────────────────

interface GlassOrbProps {
  config: OrbConfig
  reducedMotion: boolean
  mousePosition: React.MutableRefObject<{ x: number; y: number }>
}

function GlassOrb({ config, reducedMotion, mousePosition }: GlassOrbProps) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const initialPosition = React.useRef(new THREE.Vector3(...config.position))
  const time = React.useRef(Math.random() * 100) // Random phase offset

  useFrame((state, delta) => {
    if (!meshRef.current || reducedMotion) return

    time.current += delta

    // Orbital motion
    if (config.orbitRadius > 0) {
      const angle = time.current * config.orbitSpeed
      const x = Math.cos(angle) * config.orbitRadius
      const z = Math.sin(angle) * config.orbitRadius
      const y = Math.sin(angle * 0.5) * 0.5 + initialPosition.current.y

      meshRef.current.position.x = x
      meshRef.current.position.z = z
      meshRef.current.position.y = y
    }

    // Subtle rotation
    meshRef.current.rotation.x += delta * config.speed * 0.5
    meshRef.current.rotation.y += delta * config.speed

    // Mouse influence (very subtle)
    const mouseInfluence = 0.1 * (1 - config.scale) // Smaller orbs move more
    meshRef.current.position.x += mousePosition.current.x * mouseInfluence * 0.02
    meshRef.current.position.y += mousePosition.current.y * mouseInfluence * 0.02
  })

  return (
    <Float
      speed={reducedMotion ? 0 : 1.5}
      rotationIntensity={reducedMotion ? 0 : 0.1}
      floatIntensity={reducedMotion ? 0 : config.floatIntensity * 0.3}
    >
      <mesh
        ref={meshRef}
        position={config.position}
        scale={config.scale}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial
          color={config.color}
          thickness={0.5}
          roughness={0.1}
          transmission={0.95}
          ior={1.5}
          chromaticAberration={0.02}
          backside={true}
          backsideThickness={0.3}
          distortion={0.1}
          distortionScale={0.2}
          temporalDistortion={0.1}
        />
      </mesh>
    </Float>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Inner Glow Orb (for the main center orb)
// ─────────────────────────────────────────────────────────────────────────────

function CoreOrb({ reducedMotion }: { reducedMotion: boolean }) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const glowRef = React.useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (reducedMotion) return

    const t = state.clock.elapsedTime

    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.1
      meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.1
    }

    if (glowRef.current) {
      // Pulsing glow
      const pulse = Math.sin(t * 0.5) * 0.1 + 1
      glowRef.current.scale.setScalar(2.2 * pulse)
    }
  })

  return (
    <group>
      {/* Inner glow sphere */}
      <mesh ref={glowRef} scale={2.2}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Main glass orb */}
      <mesh ref={meshRef} scale={1.8}>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshTransmissionMaterial
          color="#14b8a6"
          thickness={0.8}
          roughness={0.05}
          transmission={0.97}
          ior={1.5}
          chromaticAberration={0.03}
          backside={true}
          backsideThickness={0.5}
          distortion={0.05}
          distortionScale={0.1}
          temporalDistortion={0.05}
        />
      </mesh>

      {/* Inner core glow */}
      <mesh scale={0.6}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#2dd4bf"
          transparent
          opacity={0.4}
        />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Particle Field Background
// ─────────────────────────────────────────────────────────────────────────────

function ParticleField({ reducedMotion }: { reducedMotion: boolean }) {
  const pointsRef = React.useRef<THREE.Points>(null)
  const particleCount = 200

  const geometry = React.useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame((state) => {
    if (!pointsRef.current || reducedMotion) return
    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02
    pointsRef.current.rotation.x = state.clock.elapsedTime * 0.01
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#14b8a6"
        size={0.03}
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera Controller with Mouse Parallax
// ─────────────────────────────────────────────────────────────────────────────

interface CameraControllerProps {
  reducedMotion: boolean
  mousePosition: React.MutableRefObject<{ x: number; y: number }>
}

function CameraController({ reducedMotion, mousePosition }: CameraControllerProps) {
  const { camera } = useThree()
  const targetPosition = React.useRef(new THREE.Vector3(0, 0, 8))

  useFrame(() => {
    if (reducedMotion) return

    // Smooth parallax based on mouse
    targetPosition.current.x = mousePosition.current.x * 1.5
    targetPosition.current.y = mousePosition.current.y * 0.8

    camera.position.x = THREE.MathUtils.lerp(
      camera.position.x,
      targetPosition.current.x,
      0.03
    )
    camera.position.y = THREE.MathUtils.lerp(
      camera.position.y,
      targetPosition.current.y,
      0.03
    )

    camera.lookAt(0, 0, 0)
  })

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene Content
// ─────────────────────────────────────────────────────────────────────────────

interface SceneProps {
  reducedMotion: boolean
}

function Scene({ reducedMotion }: SceneProps) {
  const mousePosition = React.useRef({ x: 0, y: 0 })

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      mousePosition.current = {
        x: (event.clientX / window.innerWidth) * 2 - 1,
        y: -(event.clientY / window.innerHeight) * 2 + 1,
      }
    }

    if (!reducedMotion) {
      window.addEventListener("mousemove", handleMouseMove)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
    }
  }, [reducedMotion])

  return (
    <>
      <CameraController reducedMotion={reducedMotion} mousePosition={mousePosition} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={0.6}
        color="#ffffff"
      />
      <pointLight
        position={[-5, 5, -5]}
        intensity={0.4}
        color="#06b6d4"
      />
      <pointLight
        position={[5, -5, 5]}
        intensity={0.3}
        color="#14b8a6"
      />

      {/* Background particles */}
      <ParticleField reducedMotion={reducedMotion} />

      {/* Main center orb */}
      <CoreOrb reducedMotion={reducedMotion} />

      {/* Orbiting glass orbs (skip the first config which is the center) */}
      {orbConfigs.slice(1).map((config, index) => (
        <GlassOrb
          key={index}
          config={config}
          reducedMotion={reducedMotion}
          mousePosition={mousePosition}
        />
      ))}

      {/* Environment for reflections */}
      <Environment preset="night" />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

interface GradientOrbsProps {
  className?: string
}

export function GradientOrbs({ className }: GradientOrbsProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className={cn("h-full w-full", className)}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
        }}
        style={{ background: "transparent" }}
      >
        <React.Suspense fallback={null}>
          <Scene reducedMotion={reducedMotion} />
        </React.Suspense>
      </Canvas>
    </div>
  )
}
