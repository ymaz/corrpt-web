import * as THREE from "three";
import { create } from "zustand";

import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES } from "@/lib/constants";
import type { ImageStore } from "@/store/types";

export const useImageStore = create<ImageStore>((set, get) => ({
	texture: null,
	dimensions: null,
	originalDataUrl: null,
	isLoading: false,
	error: null,

	clearImage: () => {
		const { texture } = get();
		if (texture) {
			texture.dispose();
		}
		set({
			texture: null,
			dimensions: null,
			originalDataUrl: null,
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

		// Dispose previous texture and reset state
		get().clearImage();
		set({ isLoading: true, error: null });

		const reader = new FileReader();

		reader.onload = () => {
			const dataUrl = reader.result as string;
			const img = new Image();

			img.onload = () => {
				const tex = new THREE.Texture(img);
				tex.needsUpdate = true;
				tex.colorSpace = THREE.NoColorSpace;
				tex.minFilter = THREE.LinearFilter;
				tex.magFilter = THREE.LinearFilter;

				set({
					texture: tex,
					dimensions: { width: img.width, height: img.height },
					originalDataUrl: dataUrl,
					isLoading: false,
				});
			};

			img.onerror = () => {
				set({ error: "Failed to decode image.", isLoading: false });
			};

			img.src = dataUrl;
		};

		reader.onerror = () => {
			set({ error: "Failed to read file.", isLoading: false });
		};

		reader.readAsDataURL(file);
	},
}));
