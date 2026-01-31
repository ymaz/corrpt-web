import { shaderMaterial } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import * as THREE from "three";

import fragmentShader from "@/effects/shaders/common/passthrough.frag";
import vertexShader from "@/effects/shaders/common/passthrough.vert";

const PassthroughMaterial = shaderMaterial(
	{
		u_texture: new THREE.Texture(),
		u_resolution: new THREE.Vector2(1, 1),
		u_time: 0,
	},
	vertexShader,
	fragmentShader,
);

extend({ PassthroughMaterial });

declare module "@react-three/fiber" {
	interface ThreeElements {
		passthroughMaterial: React.JSX.IntrinsicElements["shaderMaterial"] & {
			u_texture?: THREE.Texture;
			u_resolution?: THREE.Vector2;
			u_time?: number;
		};
	}
}

export { PassthroughMaterial };
