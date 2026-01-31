import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { MAX_FILE_SIZE, SUPPORTED_IMAGE_TYPES } from "@/lib/constants";

interface ImageDimensions {
	width: number;
	height: number;
}

interface UseImageLoaderResult {
	texture: THREE.Texture | null;
	dimensions: ImageDimensions | null;
	isLoading: boolean;
	error: string | null;
	loadImage: (file: File) => void;
	clearImage: () => void;
}

export function useImageLoader(): UseImageLoaderResult {
	const [texture, setTexture] = useState<THREE.Texture | null>(null);
	const [dimensions, setDimensions] = useState<ImageDimensions | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const textureRef = useRef<THREE.Texture | null>(null);

	const clearImage = useCallback(() => {
		if (textureRef.current) {
			textureRef.current.dispose();
			textureRef.current = null;
		}
		setTexture(null);
		setDimensions(null);
		setError(null);
	}, []);

	const loadImage = useCallback(
		(file: File) => {
			if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
				setError(
					`Unsupported file type: ${file.type}. Use JPEG, PNG, or WebP.`,
				);
				return;
			}

			if (file.size > MAX_FILE_SIZE) {
				setError(
					`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum is 50MB.`,
				);
				return;
			}

			clearImage();
			setIsLoading(true);
			setError(null);

			const reader = new FileReader();

			reader.onload = () => {
				const img = new Image();

				img.onload = () => {
					const tex = new THREE.Texture(img);
					tex.needsUpdate = true;
					tex.colorSpace = THREE.NoColorSpace;
					tex.minFilter = THREE.LinearFilter;
					tex.magFilter = THREE.LinearFilter;

					textureRef.current = tex;
					setTexture(tex);
					setDimensions({ width: img.width, height: img.height });
					setIsLoading(false);
				};

				img.onerror = () => {
					setError("Failed to decode image.");
					setIsLoading(false);
				};

				img.src = reader.result as string;
			};

			reader.onerror = () => {
				setError("Failed to read file.");
				setIsLoading(false);
			};

			reader.readAsDataURL(file);
		},
		[clearImage],
	);

	useEffect(() => {
		return () => {
			if (textureRef.current) {
				textureRef.current.dispose();
			}
		};
	}, []);

	return { texture, dimensions, isLoading, error, loadImage, clearImage };
}
