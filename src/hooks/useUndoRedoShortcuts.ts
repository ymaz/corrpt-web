import { useEffect } from "react";

import { useEffectStore } from "@/store/effectStore";

function isTextEntryTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;
	const tag = target.tagName;
	return (
		tag === "INPUT" ||
		tag === "TEXTAREA" ||
		tag === "SELECT" ||
		target.isContentEditable
	);
}

/**
 * Global undo/redo keybindings: Cmd/Ctrl+Z undoes, Cmd/Ctrl+Shift+Z and Ctrl+Y
 * redo. Shortcuts are ignored while focus is inside a text-entry control so they
 * don't hijack native field editing (e.g. typing in the preset name input).
 */
export function useUndoRedoShortcuts(): void {
	useEffect(() => {
		function onKeyDown(e: KeyboardEvent) {
			if (isTextEntryTarget(e.target)) return;
			const mod = e.metaKey || e.ctrlKey;
			if (!mod) return;

			const key = e.key.toLowerCase();
			const isRedo =
				(key === "z" && e.shiftKey) || (key === "y" && !e.shiftKey);
			const isUndo = key === "z" && !e.shiftKey;

			if (isRedo) {
				e.preventDefault();
				useEffectStore.getState().redo();
			} else if (isUndo) {
				e.preventDefault();
				useEffectStore.getState().undo();
			}
		}

		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);
}
