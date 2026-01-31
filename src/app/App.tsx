import { type ChangeEvent, useCallback } from "react";

import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { useImageLoader } from "@/hooks/useImageLoader";

function App() {
	const { texture, isLoading, error, loadImage } = useImageLoader();

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
			<EffectCanvas texture={texture} />

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
