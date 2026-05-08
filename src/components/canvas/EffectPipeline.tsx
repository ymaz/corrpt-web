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
	const { viewport, gl, invalidate } = useThree();

	// dimensions is always set in the same set() call as texture, and this
	// component only renders when texture exists (guarded by parent)
	const { width: imageWidth, height: imageHeight } = useImageStore(
		(s) => s.dimensions,
	) as { width: number; height: number };
	const imageAspect = imageWidth / imageHeight;
	const viewportAspect = viewport.width / viewport.height;

	useEffect(() => {
		return useEffectStore.subscribe((state, prev) => {
			if (state.effects !== prev.effects) invalidate();
		});
	}, [invalidate]);

	let scaleX: number;
	let scaleY: number;

	if (imageAspect > viewportAspect) {
		scaleX = viewport.width;
		scaleY = viewport.width / imageAspect;
	} else {
		scaleY = viewport.height;
		scaleX = viewport.height * imageAspect;
	}

	// Cap FBO at 2× physical canvas pixels — prevents full-res GPU work when a
	// large image is displayed in a small viewport. Export always uses full res.
	const { previewWidth, previewHeight } = useMemo(() => {
		const capW = Math.round(viewport.width * viewport.dpr * 2);
		const capH = Math.round(viewport.height * viewport.dpr * 2);
		const scale = Math.min(capW / imageWidth, capH / imageHeight, 1);
		return {
			previewWidth: Math.max(1, Math.round(imageWidth * scale)),
			previewHeight: Math.max(1, Math.round(imageHeight * scale)),
		};
	}, [imageWidth, imageHeight, viewport.width, viewport.height, viewport.dpr]);

	// Ref so the mount effect always reads the latest preview size without
	// needing it as a dep (which would teardown the renderer on every resize).
	const previewDimsRef = useRef({ width: previewWidth, height: previewHeight });
	previewDimsRef.current = { width: previewWidth, height: previewHeight };

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
				previewDimsRef.current.width,
				previewDimsRef.current.height,
			);
		}
		renderer.setEffects(effectState.effects);
		invalidate();

		return () => {
			renderer.dispose();
			if (rendererRef.current === renderer) {
				rendererRef.current = null;
			}
		};
	}, [gl, invalidate]);

	// Stable Vector2 for JSX prop — avoids per-render allocation
	const initialResolution = useMemo(
		() => new THREE.Vector2(previewWidth, previewHeight),
		[previewWidth, previewHeight],
	);

	useEffect(() => {
		rendererRef.current?.setImage(texture);
		invalidate();
	}, [texture, invalidate]);

	useEffect(() => {
		rendererRef.current?.resize(previewWidth, previewHeight);
		invalidate();
	}, [previewWidth, previewHeight, invalidate]);

	useFrame((_state, delta) => {
		const store = useEffectStore.getState();
		const time = store.time + delta;
		store.setTime(time);

		const renderer = rendererRef.current;
		if (!renderer) return;

		renderer.setEffects(store.effects);
		renderer.renderFrame(time);
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
