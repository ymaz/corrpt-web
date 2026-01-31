import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import "@/components/canvas/EffectMaterial";

interface ImagePlaneProps {
	texture: THREE.Texture;
}

export function ImagePlane({ texture }: ImagePlaneProps) {
	const materialRef = useRef<THREE.ShaderMaterial>(null);
	const { viewport } = useThree();

	const image = texture.image as HTMLImageElement;
	const imageAspect = image.width / image.height;
	const viewportAspect = viewport.width / viewport.height;

	let scaleX: number;
	let scaleY: number;

	if (imageAspect > viewportAspect) {
		// Image wider than viewport — fit width, letterbox top/bottom
		scaleX = viewport.width;
		scaleY = viewport.width / imageAspect;
	} else {
		// Image taller than viewport — fit height, pillarbox left/right
		scaleY = viewport.height;
		scaleX = viewport.height * imageAspect;
	}

	useFrame((_state, delta) => {
		if (materialRef.current) {
			const uniforms = materialRef.current.uniforms;
			uniforms.u_time.value += delta;
		}
	});

	return (
		<mesh scale={[scaleX, scaleY, 1]}>
			<planeGeometry args={[1, 1]} />
			<passthroughMaterial
				ref={materialRef}
				u_texture={texture}
				u_resolution={new THREE.Vector2(image.width, image.height)}
			/>
		</mesh>
	);
}
