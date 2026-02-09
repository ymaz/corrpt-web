import * as THREE from "three";

import { renderEffectChain } from "@/effects/renderEffectChain";
import passthroughFrag from "@/effects/shaders/common/passthrough.frag";
import passthroughVert from "@/effects/shaders/common/passthrough.vert";
import type { EffectParameterValue } from "@/effects/types";
import { RENDERER_SETTINGS } from "@/lib/constants";

export interface ExportOptions {
	texture: THREE.Texture;
	dimensions: { width: number; height: number };
	activeEffects: string[];
	parameters: Record<string, Record<string, EffectParameterValue>>;
	mimeType: string;
	fileName: string;
}

const MIME_TO_EXT: Record<string, string> = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
};

/**
 * Exports the current image with all active effects applied at full resolution.
 * Creates off-screen renderer, processes effects, and triggers download.
 */
export function exportImage(options: ExportOptions): void {
	const { texture, dimensions, activeEffects, parameters, mimeType, fileName } =
		options;
	const { width, height } = dimensions;

	// Create off-screen canvas and renderer
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const renderer = new THREE.WebGLRenderer({
		canvas,
		...RENDERER_SETTINGS,
	});
	renderer.setSize(width, height, false);

	// Create FBOs at full resolution
	const fboOptions = {
		minFilter: THREE.LinearFilter,
		magFilter: THREE.LinearFilter,
		format: THREE.RGBAFormat,
		type: THREE.UnsignedByteType,
	};
	const fbo0 = new THREE.WebGLRenderTarget(width, height, fboOptions);
	const fbo1 = new THREE.WebGLRenderTarget(width, height, fboOptions);
	const fbos = [fbo0, fbo1] as const;

	// Create off-screen scene with orthographic camera
	const scene = new THREE.Scene();
	const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
	camera.position.z = 1;

	// Unit plane geometry
	const geometry = new THREE.PlaneGeometry(1, 1);
	const mesh = new THREE.Mesh(geometry);
	scene.add(mesh);

	// Material cache for effect chain
	const materialCache = new Map<string, THREE.ShaderMaterial>();

	// Run effect chain
	const finalTexture = renderEffectChain({
		gl: renderer,
		texture,
		activeEffects,
		parameters,
		fbos,
		offScreen: { scene, camera, mesh },
		materialCache,
		resolution: new THREE.Vector2(width, height),
		time: 0,
	});

	// Create display material to render final texture to canvas
	const displayMaterial = new THREE.ShaderMaterial({
		vertexShader: passthroughVert,
		fragmentShader: passthroughFrag,
		uniforms: {
			u_texture: { value: finalTexture },
			u_resolution: { value: new THREE.Vector2(width, height) },
			u_time: { value: 0 },
		},
	});

	mesh.material = displayMaterial;
	renderer.setRenderTarget(null);
	renderer.render(scene, camera);

	// Convert canvas to blob and trigger download
	const ext = MIME_TO_EXT[mimeType] || "png";
	const quality = mimeType === "image/jpeg" ? 0.92 : undefined;

	const cleanup = () => {
		geometry.dispose();
		displayMaterial.dispose();
		for (const mat of materialCache.values()) {
			mat.dispose();
		}
		fbo0.dispose();
		fbo1.dispose();
		renderer.dispose();
	};

	canvas.toBlob(
		(blob) => {
			if (!blob) {
				console.error("Failed to create blob for export");
				cleanup();
				return;
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `${fileName}__corrpt.${ext}`;
			link.click();

			URL.revokeObjectURL(url);
			cleanup();
		},
		mimeType,
		quality,
	);
}
