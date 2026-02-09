import * as THREE from "three";
import { create } from "zustand";

import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES } from "@/lib/constants";
import type { ImageStore } from "@/store/types";

let loadGeneration = 0;

export const useImageStore = create<ImageStore>((set, get) => ({
	texture: null,
	dimensions: null,
	originalUrl: null,
	fileName: null,
	mimeType: null,
	isLoading: false,
	error: null,

	clearImage: () => {
		const { texture, originalUrl } = get();
		if (texture) {
			texture.dispose();
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

		// Extract filename without extension
		const lastDot = file.name.lastIndexOf(".");
		const baseName = lastDot > 0 ? file.name.slice(0, lastDot) : file.name;

		// Dispose previous texture and reset state
		get().clearImage();
		set({ isLoading: true, error: null });

		loadGeneration++;
		const gen = loadGeneration;

		const objectUrl = URL.createObjectURL(file);
		// EXIF orientation is applied natively by target browsers
		// (Chrome 81+, Firefox 77+, Safari 14+) during HTMLImageElement
		// decode, so img.width/height and pixel data are already rotated.
		const img = new Image();

		img.onload = () => {
			if (gen !== loadGeneration) return;

			const tex = new THREE.Texture(img);
			tex.needsUpdate = true;
			tex.colorSpace = THREE.NoColorSpace;
			tex.minFilter = THREE.LinearFilter;
			tex.magFilter = THREE.LinearFilter;

			set({
				texture: tex,
				dimensions: { width: img.width, height: img.height },
				originalUrl: objectUrl,
				fileName: baseName,
				mimeType: file.type,
				isLoading: false,
			});
		};

		img.onerror = () => {
			if (gen !== loadGeneration) return;
			URL.revokeObjectURL(objectUrl);
			set({ error: "Failed to decode image.", isLoading: false });
		};

		img.src = objectUrl;
	},
}));
