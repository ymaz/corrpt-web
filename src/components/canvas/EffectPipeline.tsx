import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import "@/components/canvas/EffectMaterial";
import {
	createEffectChainRenderer,
	type EffectChainRenderer,
} from "@/engine/createEffectChainRenderer";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

interface EffectPipelineProps {
	texture: THREE.Texture;
}

export function EffectPipeline({ texture }: EffectPipelineProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const rendererRef = useRef<EffectChainRenderer | null>(null);
	const timeRef = useRef(0);
	const { viewport, gl } = useThree();

	// dimensions is always set in the same set() call as texture, and this
	// component only renders when texture exists (guarded by parent)
	const { width: imageWidth, height: imageHeight } = useImageStore(
		(s) => s.dimensions,
	) as { width: number; height: number };
	const imageAspect = imageWidth / imageHeight;
	const viewportAspect = viewport.width / viewport.height;

	let scaleX: number;
	let scaleY: number;

	if (imageAspect > viewportAspect) {
		scaleX = viewport.width;
		scaleY = viewport.width / imageAspect;
	} else {
		scaleY = viewport.height;
		scaleX = viewport.height * imageAspect;
	}

	useEffect(() => {
		if (!materialRef.current) return;

		const renderer = createEffectChainRenderer({
			gl,
			outputMaterial: materialRef.current,
		});
		rendererRef.current = renderer;

		const imageState = useImageStore.getState();
		const effectState = useEffectStore.getState();
		renderer.setImage(imageState.texture);
		if (imageState.dimensions) {
			renderer.resize(
				imageState.dimensions.width,
				imageState.dimensions.height,
			);
		}
		renderer.setEffects(effectState.activeEffects, effectState.parameters);

		return () => {
			renderer.dispose();
			if (rendererRef.current === renderer) {
				rendererRef.current = null;
			}
		};
	}, [gl]);

	// Stable Vector2 for JSX prop — avoids per-render allocation
	const initialResolution = useMemo(
		() => new THREE.Vector2(imageWidth, imageHeight),
		[imageWidth, imageHeight],
	);

	useEffect(() => {
		rendererRef.current?.setImage(texture);
	}, [texture]);

	useEffect(() => {
		rendererRef.current?.resize(imageWidth, imageHeight);
	}, [imageHeight, imageWidth]);

	useFrame((_state, delta) => {
		timeRef.current += delta;
		const renderer = rendererRef.current;
		if (!renderer) return;

		const { activeEffects, parameters } = useEffectStore.getState();
		renderer.setEffects(activeEffects, parameters);
		renderer.renderFrame(timeRef.current);
	});

	return (
		<mesh scale={[scaleX, scaleY, 1]}>
			<planeGeometry args={[1, 1]} />
			<passthroughMaterial
				ref={materialRef}
				u_texture={texture}
				u_resolution={initialResolution}
			/>
		</mesh>
	);
}
