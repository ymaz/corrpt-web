import { ImagePlus, Loader2 } from "lucide-react";
import { useCallback, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { cn } from "@/lib/cn";
import { SUPPORTED_IMAGE_TYPES } from "@/lib/constants";
import { useImageStore } from "@/store/imageStore";

interface DropZoneLandingProps {
	isDragOver: boolean;
	onFileSelect: (file: File) => void;
}

export function DropZoneLanding({
	isDragOver,
	onFileSelect,
}: DropZoneLandingProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	const { isLoading, error } = useImageStore(
		useShallow((s) => ({
			isLoading: s.isLoading,
			error: s.error,
		})),
	);

	const handleClick = useCallback(() => {
		inputRef.current?.click();
	}, []);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				onFileSelect(file);
			}
			// Reset so the same file can be re-selected
			if (inputRef.current) {
				inputRef.current.value = "";
			}
		},
		[onFileSelect],
	);

	return (
		<div className="absolute inset-0 z-10 flex items-center justify-center">
			<button
				type="button"
				onClick={handleClick}
				className={cn(
					"flex max-w-md cursor-pointer flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-12 py-16 transition-all duration-200",
					isDragOver
						? "scale-[1.02] border-white/60 bg-white/5"
						: "border-neutral-600 hover:border-neutral-400",
				)}
			>
				{isLoading ? (
					<Loader2 className="size-12 animate-spin text-neutral-400" />
				) : (
					<ImagePlus className="size-12 text-neutral-400" />
				)}

				<div className="flex flex-col items-center gap-1">
					<p className="text-lg font-medium text-neutral-200">
						{isLoading
							? "Loading image\u2026"
							: isDragOver
								? "Release to upload"
								: "Drop an image here"}
					</p>
					{!isLoading && (
						<p className="text-sm text-neutral-500">
							or click to browse &middot; JPEG, PNG, WebP &middot; up to 50 MB
						</p>
					)}
				</div>

				{error && (
					<p className="max-w-xs text-center text-sm text-red-400">{error}</p>
				)}
			</button>

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
