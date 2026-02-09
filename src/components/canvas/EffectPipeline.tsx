import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import "@/components/canvas/EffectMaterial";
import { renderEffectChain } from "@/effects/renderEffectChain";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

interface EffectPipelineProps {
	texture: THREE.Texture;
}

export function EffectPipeline({ texture }: EffectPipelineProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
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

	// Ping-pong FBOs at image dimensions
	const fbos = useMemo(() => {
		const options: THREE.RenderTargetOptions = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			type: THREE.UnsignedByteType,
		};
		const a = new THREE.WebGLRenderTarget(imageWidth, imageHeight, options);
		const b = new THREE.WebGLRenderTarget(imageWidth, imageHeight, options);
		return [a, b] as const;
	}, [imageWidth, imageHeight]);

	// Dispose FBOs on cleanup
	useEffect(() => {
		return () => {
			fbos[0].dispose();
			fbos[1].dispose();
		};
	}, [fbos]);

	// Off-screen scene for multi-pass rendering
	const offScreen = useMemo(() => {
		const scene = new THREE.Scene();
		const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
		camera.position.set(0, 0, 1);
		const geometry = new THREE.PlaneGeometry(1, 1);
		const mesh = new THREE.Mesh(geometry);
		scene.add(mesh);
		return { scene, camera, mesh, geometry };
	}, []);

	// Dispose off-screen geometry on unmount
	useEffect(() => {
		return () => {
			offScreen.geometry.dispose();
		};
	}, [offScreen]);

	// Material cache: effect ID → ShaderMaterial
	const materialCacheRef = useRef<Map<string, THREE.ShaderMaterial>>(new Map());

	// Clean up materials for effects no longer active
	const activeEffects = useEffectStore((s) => s.activeEffects);

	useEffect(() => {
		const cache = materialCacheRef.current;
		const activeSet = new Set(activeEffects);
		for (const [id, mat] of cache) {
			if (!activeSet.has(id)) {
				mat.dispose();
				cache.delete(id);
			}
		}
	}, [activeEffects]);

	// Dispose all cached materials on unmount
	useEffect(() => {
		const cache = materialCacheRef.current;
		return () => {
			for (const mat of cache.values()) {
				mat.dispose();
			}
			cache.clear();
		};
	}, []);

	// Elapsed time accumulator
	const timeRef = useRef(0);

	// Reusable Vector2 for resolution uniform — avoids per-frame allocation
	const resolutionRef = useRef(new THREE.Vector2());

	// Stable Vector2 for JSX prop — avoids per-render allocation
	const initialResolution = useMemo(
		() => new THREE.Vector2(imageWidth, imageHeight),
		[imageWidth, imageHeight],
	);

	useFrame((_state, delta) => {
		timeRef.current += delta;

		if (!materialRef.current) return;

		const { activeEffects, parameters } = useEffectStore.getState();

		// No active effects — display original texture directly
		if (activeEffects.length === 0) {
			materialRef.current.uniforms.u_texture.value = texture;
			return;
		}

		resolutionRef.current.set(imageWidth, imageHeight);

		const outputTexture = renderEffectChain({
			gl,
			texture,
			activeEffects,
			parameters,
			fbos,
			offScreen,
			materialCache: materialCacheRef.current,
			resolution: resolutionRef.current,
			time: timeRef.current,
		});

		materialRef.current.uniforms.u_texture.value = outputTexture;
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
