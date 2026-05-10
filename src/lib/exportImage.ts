import * as THREE from "three";

import { renderEffectChain } from "@/effects/renderEffectChain";
import passthroughFrag from "@/effects/shaders/common/passthrough.frag";
import passthroughVert from "@/effects/shaders/common/passthrough.vert";
import type { EffectInstance } from "@/effects/types";
import {
	EXPORT_RENDERER_SETTINGS,
	LOSSY_EXPORT_QUALITY,
	MIME_TO_EXT,
} from "@/lib/constants";

export interface ExportOptions {
	texture: THREE.Texture;
	dimensions: { width: number; height: number };
	effects: readonly EffectInstance[];
	mimeType: string;
	fileName: string;
	time: number;
}

/**
 * Exports the current image with all active effects applied at full resolution.
 * Creates off-screen renderer, processes effects, and triggers download.
 */
export function exportImage(options: ExportOptions): Promise<void> {
	const { texture, dimensions, effects, mimeType, fileName, time } = options;
	const { width, height } = dimensions;

	// Create off-screen canvas and renderer
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;

	const renderer = new THREE.WebGLRenderer({
		canvas,
		...EXPORT_RENDERER_SETTINGS,
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

	const materialCache = new Map<string, THREE.ShaderMaterial>();

	let displayMaterial: THREE.ShaderMaterial | undefined;
	const cleanup = () => {
		geometry.dispose();
		displayMaterial?.dispose();
		for (const mat of materialCache.values()) {
			mat.dispose();
		}
		fbo0.dispose();
		fbo1.dispose();
		renderer.dispose();
	};

	const ext = MIME_TO_EXT[mimeType] || "png";
	const quality = mimeType === "image/png" ? undefined : LOSSY_EXPORT_QUALITY;

	const resolution = new THREE.Vector2(width, height);

	try {
		const finalTexture = renderEffectChain({
			gl: renderer,
			texture,
			effects,
			fbos,
			offScreen: { scene, camera, mesh },
			materialCache,
			resolution,
			time,
		});

		displayMaterial = new THREE.ShaderMaterial({
			vertexShader: passthroughVert,
			fragmentShader: passthroughFrag,
			uniforms: {
				u_texture: { value: finalTexture },
				u_resolution: { value: resolution },
				u_time: { value: 0 },
			},
		});

		mesh.material = displayMaterial;
		renderer.setRenderTarget(null);
		renderer.render(scene, camera);
	} catch (error) {
		cleanup();
		return Promise.reject(error);
	}

	return new Promise((resolve, reject) => {
		// Guard against browsers that silently drop the toBlob callback on context loss.
		const timer = setTimeout(() => {
			cleanup();
			reject(new Error("Export timed out"));
		}, 30_000);

		canvas.toBlob(
			(blob) => {
				clearTimeout(timer);
				if (!blob) {
					cleanup();
					reject(new Error("Failed to create blob for export"));
					return;
				}

				const url = URL.createObjectURL(blob);
				const link = document.createElement("a");
				try {
					link.href = url;
					link.download = `${fileName}__corrpt.${ext}`;
					document.body.appendChild(link);
					link.click();
					resolve();
				} catch (error) {
					reject(error);
				} finally {
					if (link.isConnected) {
						document.body.removeChild(link);
					}
					URL.revokeObjectURL(url);
					cleanup();
				}
			},
			mimeType,
			quality,
		);
	});
}
