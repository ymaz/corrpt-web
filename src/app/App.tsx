import { EffectCanvas } from "@/components/canvas/EffectCanvas";
import { ExportDialog } from "@/components/controls/ExportDialog";
import { Sidebar } from "@/components/controls/Sidebar";
import { DropZone, ImageActions } from "@/components/input";
import { useUndoRedoShortcuts } from "@/hooks/useUndoRedoShortcuts";

function App() {
	useUndoRedoShortcuts();

	return (
		<DropZone>
			<div className="flex h-full w-full">
				{/* min-w-0 lets the canvas area shrink when the sidebar is docked;
				    the canvas inside fills it via position:absolute + ResizeObserver. */}
				<main className="relative min-w-0 flex-1">
					<EffectCanvas />
					<ImageActions />
				</main>
				<Sidebar />
			</div>
			<ExportDialog />
		</DropZone>
	);
}

export default App;
