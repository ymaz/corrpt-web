import { Canvas } from "@react-three/fiber";

import { ImagePlane } from "@/components/canvas/ImagePlane";
import { RENDERER_SETTINGS } from "@/lib/constants";
import { useImageStore } from "@/store/imageStore";

interface EffectCanvasProps {
	className?: string;
}

export function EffectCanvas({ className }: EffectCanvasProps) {
	const texture = useImageStore((s) => s.texture);

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
