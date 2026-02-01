import { ImagePlus } from "lucide-react";

export function DropZoneOverlay() {
	return (
		<div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="flex flex-col items-center gap-3">
				<ImagePlus className="size-12 text-white/80" />
				<p className="text-lg font-medium text-white/80">
					Drop to replace image
				</p>
			</div>
		</div>
	);
}
