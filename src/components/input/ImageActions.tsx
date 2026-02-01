import { ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { SUPPORTED_IMAGE_TYPES } from "@/lib/constants";
import { useImageStore } from "@/store/imageStore";

export function ImageActions() {
	const inputRef = useRef<HTMLInputElement>(null);

	const { texture, isLoading, error, loadImage } = useImageStore(
		useShallow((s) => ({
			texture: s.texture,
			isLoading: s.isLoading,
			error: s.error,
			loadImage: s.loadImage,
		})),
	);

	const handleClick = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				loadImage(file);
			}
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		},
		[loadImage],
	);

	if (!texture) return null;

	return (
		<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
			<button
				type="button"
				onClick={handleClick}
				className="rounded-lg bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70"
				title="Replace image"
			>
				{isLoading ? (
					<Loader2 className="size-5 animate-spin text-neutral-300" />
				) : (
					<ImagePlus className="size-5 text-neutral-300" />
				)}
			</button>

			{error && <p className="text-sm text-red-400">{error}</p>}

			<input
				ref={inputRef}
				type="file"
				accept={SUPPORTED_IMAGE_TYPES.join(",")}
				onChange={handleChange}
				className="hidden"
			/>
		</div>
	);
}
