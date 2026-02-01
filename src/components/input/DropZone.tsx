import {
	type DragEvent,
	type ReactNode,
	useCallback,
	useRef,
	useState,
} from "react";
import { useShallow } from "zustand/react/shallow";

import { DropZoneLanding } from "@/components/input/DropZoneLanding";
import { DropZoneOverlay } from "@/components/input/DropZoneOverlay";
import { useImageStore } from "@/store/imageStore";

interface DropZoneProps {
	children: ReactNode;
}

export function DropZone({ children }: DropZoneProps) {
	const [isDragOver, setIsDragOver] = useState(false);
	const dragCounter = useRef(0);

	const { texture, loadImage } = useImageStore(
		useShallow((s) => ({
			texture: s.texture,
			loadImage: s.loadImage,
		})),
	);

	const handleDragEnter = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current++;
		setIsDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounter.current--;
		if (dragCounter.current === 0) {
			setIsDragOver(false);
		}
	}, []);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			dragCounter.current = 0;
			setIsDragOver(false);

			const file = e.dataTransfer.files[0];
			if (file) {
				loadImage(file);
			}
		},
		[loadImage],
	);

	const showLanding = !texture;
	const showOverlay = isDragOver && !!texture;

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: drop zone wrapper captures drag events; primary interaction is via file input buttons
		<div
			className="relative h-screen w-screen"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{children}
			{showLanding && (
				<DropZoneLanding isDragOver={isDragOver} onFileSelect={loadImage} />
			)}
			{showOverlay && <DropZoneOverlay />}
		</div>
	);
}
