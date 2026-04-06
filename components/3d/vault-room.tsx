"use client"

import * as React from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import {
  Float,
  Environment,
  MeshReflectorMaterial,
  RoundedBox,
  Sparkles,
} from "@react-three/drei"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"

// ─────────────────────────────────────────────────────────────────────────────
// Safety Deposit Box Component
// ─────────────────────────────────────────────────────────────────────────────

interface DepositBoxProps {
  position: [number, number, number]
  isHighlighted?: boolean
  delay?: number
  reducedMotion: boolean
}

function DepositBox({ position, isHighlighted = false, delay = 0, reducedMotion }: DepositBoxProps) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = React.useState(false)
  const glowIntensity = React.useRef(0)

  useFrame((state) => {
    if (!meshRef.current || reducedMotion) return

    // Subtle breathing glow for highlighted boxes
    if (isHighlighted) {
      glowIntensity.current = Math.sin(state.clock.elapsedTime * 2 + delay) * 0.3 + 0.7
    }
  })

  const baseColor = isHighlighted ? "#14b8a6" : "#27272a"
  const emissiveColor = isHighlighted ? "#14b8a6" : "#000000"

  return (
    <group position={position}>
      {/* Box frame */}
      <RoundedBox
        ref={meshRef}
        args={[0.9, 0.4, 0.1]}
        radius={0.02}
        smoothness={4}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <meshStandardMaterial
          color={hovered ? "#3f3f46" : baseColor}
          metalness={0.9}
          roughness={0.2}
          emissive={emissiveColor}
          emissiveIntensity={isHighlighted ? 0.3 : 0}
        />
      </RoundedBox>

      {/* Handle/keyhole */}
      <mesh position={[0.3, 0, 0.06]}>
        <cylinderGeometry args={[0.03, 0.03, 0.02, 16]} />
        <meshStandardMaterial
          color={isHighlighted ? "#5eead4" : "#52525b"}
          metalness={1}
          roughness={0.1}
        />
      </mesh>

      {/* Number plate */}
      <mesh position={[-0.25, 0, 0.06]}>
        <boxGeometry args={[0.15, 0.08, 0.01]} />
        <meshStandardMaterial
          color="#18181b"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Vault Wall with Deposit Boxes
// ─────────────────────────────────────────────────────────────────────────────

interface VaultWallProps {
  position: [number, number, number]
  rotation: [number, number, number]
  reducedMotion: boolean
}

function VaultWall({ position, rotation, reducedMotion }: VaultWallProps) {
  const rows = 5
  const cols = 8
  const highlightedBoxes = [
    [1, 2], [2, 5], [3, 1], [0, 6], [4, 3], [2, 7]
  ]

  const isHighlighted = (row: number, col: number) => {
    return highlightedBoxes.some(([r, c]) => r === row && c === col)
  }

  return (
    <group position={position} rotation={rotation}>
      {/* Wall background */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[8, 2.5, 0.2]} />
        <meshStandardMaterial
          color="#18181b"
          metalness={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Deposit boxes grid */}
      {Array.from({ length: rows }).map((_, row) =>
        Array.from({ length: cols }).map((_, col) => (
          <DepositBox
            key={`${row}-${col}`}
            position={[
              (col - (cols - 1) / 2) * 0.95,
              (row - (rows - 1) / 2) * 0.45,
              0,
            ]}
            isHighlighted={isHighlighted(row, col)}
            delay={row * 0.5 + col * 0.3}
            reducedMotion={reducedMotion}
          />
        ))
      )}
    </group>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Central Vault Core (Glowing Asset Representation)
// ─────────────────────────────────────────────────────────────────────────────

function VaultCore({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = React.useRef<THREE.Group>(null)
  const innerRef = React.useRef<THREE.Mesh>(null)
  const outerRef = React.useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (reducedMotion) return

    const t = state.clock.elapsedTime

    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.1
    }

    if (innerRef.current) {
      innerRef.current.rotation.x = t * 0.2
      innerRef.current.rotation.z = t * 0.15
    }

    if (outerRef.current) {
      const pulse = Math.sin(t * 0.8) * 0.1 + 1
      outerRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <Float
      speed={reducedMotion ? 0 : 1.5}
      rotationIntensity={reducedMotion ? 0 : 0.2}
      floatIntensity={reducedMotion ? 0 : 0.3}
    >
      <group ref={groupRef} position={[0, 0, 0]}>
        {/* Outer glow sphere */}
        <mesh ref={outerRef} scale={1.2}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial
            color="#14b8a6"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>

        {/* Middle ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.02, 16, 64]} />
          <meshStandardMaterial
            color="#14b8a6"
            emissive="#14b8a6"
            emissiveIntensity={0.5}
            metalness={1}
            roughness={0.2}
          />
        </mesh>

        {/* Inner icosahedron */}
        <mesh ref={innerRef} scale={0.35}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#14b8a6"
            emissive="#14b8a6"
            emissiveIntensity={0.8}
            metalness={0.9}
            roughness={0.1}
            wireframe
          />
        </mesh>

        {/* Core glow */}
        <mesh scale={0.25}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#5eead4" transparent opacity={0.9} />
        </mesh>

        {/* Orbital rings */}
        <mesh rotation={[0.5, 0.3, 0]}>
          <torusGeometry args={[0.5, 0.008, 8, 64]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[-0.3, 0.8, 0.2]}>
          <torusGeometry args={[0.55, 0.008, 8, 64]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.4} />
        </mesh>
      </group>
    </Float>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Floor with Reflection
// ─────────────────────────────────────────────────────────────────────────────

function VaultFloor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={1024}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#0a0a0a"
        metalness={0.5}
        mirror={0.5}
      />
    </mesh>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Ambient Particles
// ─────────────────────────────────────────────────────────────────────────────

function VaultParticles({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null

  return (
    <Sparkles
      count={50}
      scale={[10, 6, 10]}
      size={1.5}
      speed={0.3}
      opacity={0.3}
      color="#14b8a6"
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera Controller
// ─────────────────────────────────────────────────────────────────────────────

interface CameraControllerProps {
  reducedMotion: boolean
  mousePosition: React.MutableRefObject<{ x: number; y: number }>
}

function CameraController({ reducedMotion, mousePosition }: CameraControllerProps) {
  const { camera } = useThree()
  const targetPosition = React.useRef(new THREE.Vector3(0, 0.5, 6))

  useFrame(() => {
    if (reducedMotion) return

    // Smooth parallax based on mouse
    targetPosition.current.x = mousePosition.current.x * 1.2
    targetPosition.current.y = mousePosition.current.y * 0.5 + 0.5

    camera.position.set(
      THREE.MathUtils.lerp(camera.position.x, targetPosition.current.x, 0.02),
      THREE.MathUtils.lerp(camera.position.y, targetPosition.current.y, 0.02),
      camera.position.z
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
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        color="#ffffff"
      />
      <pointLight
        position={[0, 2, 0]}
        intensity={1}
        color="#14b8a6"
        distance={10}
        decay={2}
      />
      <pointLight
        position={[-3, 1, 2]}
        intensity={0.3}
        color="#06b6d4"
        distance={8}
      />
      <pointLight
        position={[3, 1, 2]}
        intensity={0.3}
        color="#06b6d4"
        distance={8}
      />

      {/* Fog for depth */}
      <fog attach="fog" args={["#0a0a0a", 5, 15]} />

      {/* Vault walls */}
      <VaultWall
        position={[0, 0, -3]}
        rotation={[0, 0, 0]}
        reducedMotion={reducedMotion}
      />

      {/* Floor */}
      <VaultFloor />

      {/* Central vault core */}
      <VaultCore reducedMotion={reducedMotion} />

      {/* Ambient particles */}
      <VaultParticles reducedMotion={reducedMotion} />

      {/* Environment for reflections */}
      <Environment preset="night" />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

interface VaultRoomProps {
  className?: string
}

export function VaultRoom({ className }: VaultRoomProps) {
  const reducedMotion = useReducedMotion()

  return (
    <div className={cn("h-full w-full", className)}>
      <Canvas
        camera={{ position: [0, 0.5, 6], fov: 45 }}
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
