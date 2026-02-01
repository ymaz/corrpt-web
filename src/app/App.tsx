import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { EffectDevPanel } from "@/components/controls/EffectDevPanel";
import { DropZone, ImageActions } from "@/components/input";

function App() {
	return (
		<DropZone>
			<EffectCanvas />
			<ImageActions />
			<EffectDevPanel />
		</DropZone>
	);
}

export default App;
