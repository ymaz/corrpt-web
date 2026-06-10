import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { EffectsPanel } from "@/components/controls/EffectsPanel";
import { ExportDialog } from "@/components/controls/ExportDialog";
import { DropZone, ImageActions } from "@/components/input";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";

function App() {
	useUndoRedoShortcuts();

	return (
		<DropZone>
			<EffectCanvas />
			<ImageActions />
			<EffectsPanel />
			<ExportDialog />
		</DropZone>
	);
}

export default App;
