import { Canvas } from "@react-three/fiber";

import { EffectPipeline } from "@/components/canvas/EffectPipeline";
import "@/effects/definitions";
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
			{texture && <EffectPipeline texture={texture} />}
		</Canvas>
	);
}
