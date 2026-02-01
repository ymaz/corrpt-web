import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { DropZone, ImageActions } from "@/components/input";

function App() {
	return (
		<DropZone>
			<EffectCanvas />
			<ImageActions />
		</DropZone>
	);
}

export default App;
