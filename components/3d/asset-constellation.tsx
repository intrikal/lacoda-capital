"use client"

import * as React from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, Html, Environment } from "@react-three/drei"
import { useSpring, animated, config } from "@react-spring/three"
import * as THREE from "three"
import { cn } from "@/lib/utils"
import { useReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { assetClassConfig } from "@/lib/config/asset-classes"
import { formatCurrency } from "@/lib/utils"
import type { ConstellationNode as ConstellationNodeType } from "@/lib/types/mock"

// ─────────────────────────────────────────────────────────────────────────────
// Constellation Node Component
// ─────────────────────────────────────────────────────────────────────────────

interface NodeProps {
  node: ConstellationNodeType
  isHovered: boolean
  isSelected: boolean
  onHover: (id: string | null) => void
  onClick: (node: ConstellationNodeType) => void
  reducedMotion: boolean
}

function ConstellationNode({
  node,
  isHovered,
  isSelected,
  onHover,
  onClick,
  reducedMotion,
}: NodeProps) {
  const meshRef = React.useRef<THREE.Mesh>(null)
  const classConfig = assetClassConfig[node.class]

  // Spring animation for hover/select scale
  const { scale, emissiveIntensity } = useSpring({
    scale: isHovered || isSelected ? 1.3 : 1,
    emissiveIntensity: isHovered || isSelected ? 0.8 : 0.3,
    config: config.wobbly,
    immediate: reducedMotion,
  })

  // Gentle floating rotation
  useFrame((state) => {
    if (meshRef.current && !reducedMotion) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  const color = new THREE.Color(classConfig.color)

  return (
    <Float
      speed={reducedMotion ? 0 : 1.5}
      rotationIntensity={reducedMotion ? 0 : 0.2}
      floatIntensity={reducedMotion ? 0 : 0.5}
    >
      <group position={node.position}>
        {/* Main sphere */}
        <animated.mesh
          ref={meshRef}
          scale={scale.to((s) => s * node.size)}
          onPointerEnter={(e) => {
            e.stopPropagation()
            onHover(node.id)
            document.body.style.cursor = "pointer"
          }}
          onPointerLeave={() => {
            onHover(null)
            document.body.style.cursor = "auto"
          }}
          onClick={(e) => {
            e.stopPropagation()
            onClick(node)
          }}
        >
          <sphereGeometry args={[0.5, 32, 32]} />
          <animated.meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emissiveIntensity}
            roughness={0.3}
            metalness={0.7}
            transparent
            opacity={0.9}
          />
        </animated.mesh>

        {/* Outer glow ring */}
        {(isHovered || isSelected) && (
          <mesh scale={node.size * 1.8}>
            <ringGeometry args={[0.6, 0.7, 32]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}

        {/* Label */}
        {(isHovered || isSelected) && (
          <Html
            position={[0, node.size * 0.8 + 0.3, 0]}
            center
            distanceFactor={10}
            style={{ pointerEvents: "none" }}
          >
            <div className="glass rounded-lg border border-zinc-700 px-3 py-2 min-w-[140px]">
              <p className="text-xs font-medium text-zinc-100 whitespace-nowrap">
                {node.label}
              </p>
              <p className="text-sm font-semibold text-teal-400">
                {formatCurrency(node.value)}
              </p>
              <p className="text-xs text-zinc-400">
                {node.details.count} asset{node.details.count !== 1 ? "s" : ""}
              </p>
            </div>
          </Html>
        )}
      </group>
    </Float>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Connection Lines
// ─────────────────────────────────────────────────────────────────────────────

interface ConnectionLineProps {
  start: [number, number, number]
  end: [number, number, number]
  opacity?: number
}

function ConnectionLine({ start, end, opacity = 0.15 }: ConnectionLineProps) {
  const points = React.useMemo(() => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)]
  }, [start, end])

  const lineGeometry = React.useMemo(() => {
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    return geometry
  }, [points])

  return (
    <line>
      <bufferGeometry attach="geometry" {...lineGeometry} />
      <lineBasicMaterial
        color="#14b8a6"
        transparent
        opacity={opacity}
        linewidth={1}
      />
    </line>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Camera Controller
// ─────────────────────────────────────────────────────────────────────────────

interface CameraControllerProps {
  reducedMotion: boolean
}

function CameraController({ reducedMotion }: CameraControllerProps) {
  const { camera } = useThree()
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

  useFrame(() => {
    if (reducedMotion) return

    // Subtle parallax effect
    const targetX = mousePosition.current.x * 0.5
    const targetY = mousePosition.current.y * 0.3

    camera.position.set(
      THREE.MathUtils.lerp(camera.position.x, targetX, 0.02),
      THREE.MathUtils.lerp(camera.position.y, targetY + 1, 0.02),
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
  nodes: ConstellationNodeType[]
  onNodeSelect: (node: ConstellationNodeType | null) => void
  reducedMotion: boolean
}

function Scene({ nodes, onNodeSelect, reducedMotion }: SceneProps) {
  const [hoveredNode, setHoveredNode] = React.useState<string | null>(null)
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null)

  const handleNodeClick = (node: ConstellationNodeType) => {
    const newSelected = selectedNode === node.id ? null : node.id
    setSelectedNode(newSelected)
    onNodeSelect(newSelected ? node : null)
  }

  // Build connection lookup
  const nodePositions = React.useMemo(() => {
    const map: Record<string, [number, number, number]> = {}
    nodes.forEach((node) => {
      map[node.id] = node.position
    })
    return map
  }, [nodes])

  return (
    <>
      <CameraController reducedMotion={reducedMotion} />

      {/* Ambient and directional lights */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#06b6d4" />

      {/* Connection lines */}
      {nodes.map((node) =>
        node.connections.map((connectionId) => {
          const targetPos = nodePositions[connectionId]
          if (!targetPos) return null
          return (
            <ConnectionLine
              key={`${node.id}-${connectionId}`}
              start={node.position}
              end={targetPos}
              opacity={
                hoveredNode === node.id || hoveredNode === connectionId
                  ? 0.4
                  : 0.15
              }
            />
          )
        })
      )}

      {/* Nodes */}
      {nodes.map((node) => (
        <ConstellationNode
          key={node.id}
          node={node}
          isHovered={hoveredNode === node.id}
          isSelected={selectedNode === node.id}
          onHover={setHoveredNode}
          onClick={handleNodeClick}
          reducedMotion={reducedMotion}
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

interface AssetConstellationProps {
  className?: string
  nodes?: ConstellationNodeType[]
  onNodeSelect?: (node: ConstellationNodeType | null) => void
}

export function AssetConstellation({
  className,
  nodes = [],
  onNodeSelect,
}: AssetConstellationProps) {
  const reducedMotion = useReducedMotion()

  const handleNodeSelect = (node: ConstellationNodeType | null) => {
    onNodeSelect?.(node)
  }

  return (
    <div className={cn("h-full w-full", className)}>
      <Canvas
        camera={{ position: [0, 1, 8], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene nodes={nodes} onNodeSelect={handleNodeSelect} reducedMotion={reducedMotion} />
      </Canvas>
    </div>
  )
}
