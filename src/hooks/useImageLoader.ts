import { useShallow } from "zustand/react/shallow";

import { useImageStore } from "@/store/imageStore";

export function useImageLoader() {
	return useImageStore(
		useShallow((s) => ({
			texture: s.texture,
			dimensions: s.dimensions,
			isLoading: s.isLoading,
			error: s.error,
			loadImage: s.loadImage,
			clearImage: s.clearImage,
		})),
	);
}
