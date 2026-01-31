import { Canvas } from "@react-three/fiber";
import type * as THREE from "three";

import { ImagePlane } from "@/components/canvas/ImagePlane";
import { RENDERER_SETTINGS } from "@/lib/constants";

interface EffectCanvasProps {
	texture: THREE.Texture | null;
	className?: string;
}

export function EffectCanvas({ texture, className }: EffectCanvasProps) {
	return (
		<Canvas
			className={className}
			orthographic
			linear
			flat
			gl={RENDERER_SETTINGS}
			camera={{ zoom: 1, near: 0.1, far: 100, position: [0, 0, 1] }}
		>
			<color attach="background" args={["#1a1a1a"]} />
			{texture && <ImagePlane texture={texture} />}
		</Canvas>
	);
}
