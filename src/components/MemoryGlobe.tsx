import { memo, Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { Color, SRGBColorSpace, Mesh, Vector3 } from "three";
import earth from "@/assets/earth.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { locationToPoint, pointToLocation } from "@/lib/location";

export type GlobeMarker = { id: string; title: string; latitude: number; longitude: number };
type Focus = { latitude: number; longitude: number } | null;
type Props = { markers: GlobeMarker[]; onMarker?: (id: string) => void; onPick?: (latitude: number, longitude: number) => void; focus?: Focus; compact?: boolean; fit?: boolean; activeId?: string | null };

/** Smoothly turns the camera so the focused location faces the viewer. */
function FocusCamera({ focus }: { focus: Focus }) {
  const { camera, controls } = useThree() as unknown as { camera: import("three").Camera; controls: { update: () => void } | null };
  const target = useRef<Vector3 | null>(null);
  useEffect(() => {
    target.current = focus ? new Vector3(...locationToPoint(focus.latitude, focus.longitude, 1)).normalize() : null;
  }, [focus?.latitude, focus?.longitude]);
  useFrame((_, delta) => {
    const goal = target.current;
    if (!goal) return;
    const dist = camera.position.length();
    const dir = camera.position.clone().normalize();
    if (dir.angleTo(goal) < 0.002) { target.current = null; return; }
    dir.lerp(goal, 1 - Math.exp(-4 * Math.min(delta, 0.05))).normalize();
    camera.position.copy(dir.multiplyScalar(dist));
    camera.lookAt(0, 0, 0);
    controls?.update();
  });
  return null;
}

function Earth({ markers, onMarker, onPick, markerColor, activeId, compact }: Props & { markerColor: Color }) {
  const earthRef = useRef(new Mesh());
  const texture = useTexture(earth.url, (loaded) => { loaded.colorSpace = SRGBColorSpace; });
  return <>
    <mesh ref={earthRef} onClick={(event) => {
      if (!onPick || event.delta > 5) return;
      event.stopPropagation();
      const point = event.object.worldToLocal(event.point.clone());
      const location = pointToLocation(point.x, point.y, point.z);
      onPick(location.latitude, location.longitude);
    }}>
      <sphereGeometry args={[2, 64, 48]} />
      <meshStandardMaterial map={texture} roughness={0.85} metalness={0.05} />
    </mesh>
    {markers.map((marker) => <group key={marker.id} position={locationToPoint(marker.latitude, marker.longitude, 2.055)}>
      <mesh onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshBasicMaterial color={markerColor} />
      </mesh>
      <Html center occlude={[earthRef]} position={[0, 0, 0]}>
        <Button type="button" variant={!activeId || activeId === marker.id ? "default" : "secondary"} size="icon" className={`${compact ? "h-6 w-6" : "h-8 w-8"} rounded-full shadow-soft transition-transform ${activeId === marker.id ? "scale-125" : ""}`} aria-label={`${marker.title} — anıya git`} title={marker.title}
          onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}><MapPin className="h-4 w-4" /></Button>
      </Html>
    </group>)}
  </>;
}

function GlobeCamera() {
  const { camera, size } = useThree();
  useEffect(() => {
    const factor = Math.max(1, size.height / Math.max(size.width, 1));
    camera.position.set(4 * factor, 3 * factor, -2 * factor);
    camera.lookAt(0, 0, 0);
  }, [camera, size.width, size.height]);
  return null;
}

function MemoryGlobe(props: Props) {
  const [markerColor, setMarkerColor] = useState<Color | null>(null);
  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const probe = document.createElement("canvas").getContext("2d");
    if (!probe) return;
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const pixel = probe.getImageData(0, 0, 1, 1).data;
    setMarkerColor(new Color().setRGB((pixel[0] ?? 0) / 255, (pixel[1] ?? 0) / 255, (pixel[2] ?? 0) / 255, SRGBColorSpace));
  }, []);
  return <div className={`${props.compact ? "h-full" : "globe-surface"} relative w-full touch-none`} aria-label="Anıların dünya haritası">
    {markerColor && <Canvas dpr={1} camera={{ position: [4, 3, -2], fov: 48 }} gl={{ antialias: true, alpha: true }}>
      {!props.compact && <GlobeCamera />}
      <FocusCamera focus={props.focus ?? null} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[4, 5, 3]} intensity={2} />
      <Suspense fallback={null}>
        <Environment resolution={64}>
          <Lightformer intensity={1} position={[0, 5, 0]} scale={[8, 8, 1]} />
        </Environment>
        <Earth {...props} markerColor={markerColor} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3} maxDistance={12} enableZoom={!props.compact} />
    </Canvas>}
    <a href="https://www.nasa.gov/" target="_blank" rel="noreferrer" className={`absolute bottom-2 right-2 text-muted-foreground ${props.compact ? "text-[9px]" : "text-xs"}`}>NASA · Blue Marble</a>
  </div>;
}

export default memo(MemoryGlobe);
