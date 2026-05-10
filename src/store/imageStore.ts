import * as THREE from "three";
import { create } from "zustand";

import {
	MAX_DIMENSION,
	MAX_FILE_SIZE,
	MAX_PIXEL_COUNT,
	SUPPORTED_IMAGE_TYPES,
} from "@/lib/constants";
import type { ImageStore } from "@/store/types";

let loadGeneration = 0;
let currentBitmap: ImageBitmap | null = null;

export const useImageStore = create<ImageStore>((set, get) => ({
	texture: null,
	dimensions: null,
	originalUrl: null,
	fileName: null,
	mimeType: null,
	isLoading: false,
	error: null,
	warning: null,

	clearImage: () => {
		const { texture, originalUrl } = get();
		if (texture) {
			texture.dispose();
		}
		if (currentBitmap) {
			currentBitmap.close();
			currentBitmap = null;
		}
		if (originalUrl) {
			URL.revokeObjectURL(originalUrl);
		}
		set({
			texture: null,
			dimensions: null,
			originalUrl: null,
			fileName: null,
			mimeType: null,
			isLoading: false,
			error: null,
			warning: null,
		});
	},

	loadImage: (file: File) => {
		if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
			set({
				error: `Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.`,
			});
			return;
		}

		if (file.size > MAX_FILE_SIZE) {
			set({
				error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 50MB.`,
			});
			return;
		}

		const lastDot = file.name.lastIndexOf(".");
		const baseName = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;

		get().clearImage();
		set({ isLoading: true });

		loadGeneration++;
		const gen = loadGeneration;

		const objectUrl = URL.createObjectURL(file);

		(async () => {
			try {
				const rawBitmap = await createImageBitmap(file, {
					imageOrientation: "from-image",
				});
				const rawW = rawBitmap.width;
				const rawH = rawBitmap.height;

				if (gen !== loadGeneration) {
					rawBitmap.close();
					URL.revokeObjectURL(objectUrl);
					return;
				}

				// Satisfies both the per-axis dimension cap and the total pixel
				// budget; clamp to 1 so we never upscale.
				const scale = Math.min(
					MAX_DIMENSION / rawW,
					MAX_DIMENSION / rawH,
					Math.sqrt(MAX_PIXEL_COUNT / (rawW * rawH)),
					1,
				);

				let scaledBitmap: ImageBitmap;
				let warning: string | null = null;

				if (scale < 1) {
					const newW = Math.round(rawW * scale);
					const newH = Math.round(rawH * scale);
					rawBitmap.close(); // release full-size allocation immediately
					scaledBitmap = await createImageBitmap(file, {
						resizeWidth: newW,
						resizeHeight: newH,
						resizeQuality: "high",
						imageOrientation: "from-image",
					});
					warning = `Downscaled from ${rawW}×${rawH} to ${newW}×${newH} — original exceeds the 16 MP GPU memory budget.`;
				} else {
					scaledBitmap = rawBitmap;
				}

				if (gen !== loadGeneration) {
					scaledBitmap.close();
					URL.revokeObjectURL(objectUrl);
					return;
				}

				// Three.js r152+ skips UNPACK_FLIP_Y_WEBGL for ImageBitmap sources,
				// so tex.flipY has no effect. Pre-flip the bitmap for WebGL's
				// bottom-left origin so UV (0,0) reads the bottom of the image.
				const finalBitmap = await createImageBitmap(scaledBitmap, {
					imageOrientation: "flipY",
				});
				scaledBitmap.close();

				if (gen !== loadGeneration) {
					finalBitmap.close();
					URL.revokeObjectURL(objectUrl);
					return;
				}

				currentBitmap = finalBitmap;
				const tex = new THREE.Texture(finalBitmap);
				tex.needsUpdate = true;
				tex.colorSpace = THREE.NoColorSpace;
				tex.flipY = false;
				tex.minFilter = THREE.LinearFilter;
				tex.magFilter = THREE.LinearFilter;
				tex.onUpdate = () => {
					if (currentBitmap === finalBitmap) {
						currentBitmap.close();
						currentBitmap = null;
					}
					tex.onUpdate = null;
				};

				set({
					texture: tex,
					dimensions: { width: finalBitmap.width, height: finalBitmap.height },
					originalUrl: objectUrl,
					fileName: baseName,
					mimeType: file.type,
					isLoading: false,
					warning,
				});
			} catch {
				URL.revokeObjectURL(objectUrl);
				if (gen !== loadGeneration) return;
				set({ error: "Failed to decode image.", isLoading: false });
			}
		})();
	},
}));
