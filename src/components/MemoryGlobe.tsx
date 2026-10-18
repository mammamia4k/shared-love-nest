import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Html, Lightformer, OrbitControls, useTexture } from "@react-three/drei";
import { Color, SRGBColorSpace } from "three";
import earth from "@/assets/earth.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";
import { locationToPoint, pointToLocation } from "@/lib/location";

export type GlobeMarker = { id: string; title: string; latitude: number; longitude: number };
type Props = { markers: GlobeMarker[]; onMarker?: (id: string) => void; onPick?: (latitude: number, longitude: number) => void };

function Earth({ markers, onMarker, onPick, markerColor }: Props & { markerColor: Color }) {
  const texture = useTexture(earth.url, (loaded) => { loaded.colorSpace = SRGBColorSpace; });
  return <>
    <mesh onClick={(event) => {
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
      <Html center occlude position={[0, 0, 0]}>
        <Button type="button" variant="default" size="icon" className="h-8 w-8 rounded-full shadow-soft" aria-label={`${marker.title} — anıya git`} title={marker.title}
          onClick={(event) => { event.stopPropagation(); onMarker?.(marker.id); }}><MapPin className="h-4 w-4" /></Button>
      </Html>
    </group>)}
  </>;
}

export default function MemoryGlobe(props: Props) {
  const [markerColor, setMarkerColor] = useState<Color | null>(null);
  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim();
    const probe = document.createElement("canvas").getContext("2d");
    if (probe) { probe.fillStyle = value; setMarkerColor(new Color(probe.fillStyle)); }
    else setMarkerColor(new Color("crimson"));
  }, []);
  return <div className="globe-surface relative w-full touch-none" aria-label="Anıların dünya haritası">
    {markerColor && <Canvas dpr={1} camera={{ position: [4, 3, -2], fov: 48 }} gl={{ antialias: true }}>
      <ambientLight intensity={1.4} />
      <directionalLight position={[4, 5, 3]} intensity={2} />
      <Suspense fallback={null}>
        <Environment resolution={64}>
          <Lightformer intensity={1} position={[0, 5, 0]} scale={[8, 8, 1]} />
        </Environment>
        <Earth {...props} markerColor={markerColor} />
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableDamping minDistance={3} maxDistance={8} />
    </Canvas>}
    <a href="https://www.nasa.gov/" target="_blank" rel="noreferrer" className="absolute bottom-2 right-2 text-xs text-muted-foreground">NASA · Blue Marble</a>
  </div>;
}