import { Download, ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { SUPPORTED_IMAGE_TYPES } from "@/lib/constants";
import { exportImage } from "@/lib/exportImage";
import {
	DOWNLOAD_BUTTON,
	IMAGE_ERROR,
	REPLACE_FILE_INPUT,
	REPLACE_IMAGE_BUTTON,
} from "@/lib/test-ids";
import { useEffectStore } from "@/store/effectStore";
import { useImageStore } from "@/store/imageStore";

export function ImageActions() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [isExporting, setIsExporting] = useState(false);

	const {
		texture,
		dimensions,
		fileName,
		mimeType,
		isLoading,
		error,
		loadImage,
	} = useImageStore(
		useShallow((s) => ({
			texture: s.texture,
			dimensions: s.dimensions,
			fileName: s.fileName,
			mimeType: s.mimeType,
			isLoading: s.isLoading,
			error: s.error,
			loadImage: s.loadImage,
		})),
	);

	const { activeEffects, parameters } = useEffectStore(
		useShallow((s) => ({
			activeEffects: s.activeEffects,
			parameters: s.parameters,
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

	const handleDownload = useCallback(() => {
		if (!texture || !dimensions || !fileName || !mimeType) return;

		setIsExporting(true);
		// Use setTimeout to allow the UI to update before blocking export
		setTimeout(() => {
			try {
				exportImage({
					texture,
					dimensions,
					activeEffects,
					parameters,
					mimeType,
					fileName,
				});
			} finally {
				setIsExporting(false);
			}
		}, 0);
	}, [texture, dimensions, fileName, mimeType, activeEffects, parameters]);

	if (!texture) return null;

	return (
		<div className="absolute top-4 left-4 z-10 flex flex-col items-start gap-2">
			<div className="flex flex-row gap-2">
				<button
					data-testid={REPLACE_IMAGE_BUTTON}
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

				<button
					data-testid={DOWNLOAD_BUTTON}
					type="button"
					onClick={handleDownload}
					disabled={isExporting}
					className="rounded-lg bg-black/50 p-2 backdrop-blur-sm transition-colors hover:bg-black/70 disabled:opacity-50"
					title="Download image"
				>
					{isExporting ? (
						<Loader2 className="size-5 animate-spin text-neutral-300" />
					) : (
						<Download className="size-5 text-neutral-300" />
					)}
				</button>
			</div>

			{error && (
				<p data-testid={IMAGE_ERROR} className="text-sm text-red-400">
					{error}
				</p>
			)}

			<input
				data-testid={REPLACE_FILE_INPUT}
				ref={inputRef}
				type="file"
				accept={SUPPORTED_IMAGE_TYPES.join(",")}
				onChange={handleChange}
				className="hidden"
			/>
		</div>
	);
}
