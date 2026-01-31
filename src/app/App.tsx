import { type ChangeEvent, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";

import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { useImageStore } from "@/store/imageStore";

function App() {
	const { isLoading, error, loadImage } = useImageStore(
		useShallow((s) => ({
			isLoading: s.isLoading,
			error: s.error,
			loadImage: s.loadImage,
		})),
	);

	const handleFileChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0];
			if (file) {
				loadImage(file);
			}
		},
		[loadImage],
	);

	return (
		<div style={{ width: "100vw", height: "100vh", position: "relative" }}>
			<EffectCanvas />

			<div
				style={{
					position: "absolute",
					top: 16,
					left: 16,
					zIndex: 10,
					display: "flex",
					flexDirection: "column",
					gap: 8,
				}}
			>
				<input
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={handleFileChange}
				/>
				{isLoading && <span style={{ color: "#aaa" }}>Loading image...</span>}
				{error && <span style={{ color: "#f44" }}>{error}</span>}
			</div>
		</div>
	);
}

export default App;
