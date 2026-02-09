import { Canvas } from "@react-three/fiber";

import { CanvasErrorBoundary } from "@/components/canvas/CanvasErrorBoundary";
import { EffectPipeline } from "@/components/canvas/EffectPipeline";
import "@/effects/definitions";
import { RENDERER_SETTINGS } from "@/lib/constants";
import { useImageStore } from "@/store/imageStore";

interface EffectCanvasProps {
	className?: string;
}

export function EffectCanvas({ className }: EffectCanvasProps) {
	const texture = useImageStore((s) => s.texture);
	const originalUrl = useImageStore((s) => s.originalUrl);

	return (
		<CanvasErrorBoundary resetKey={originalUrl}>
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
		</CanvasErrorBoundary>
	);
}
