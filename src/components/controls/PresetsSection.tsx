import { Check, Pencil, Save, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
	PRESET_NAME_INPUT,
	PRESET_SAVE_BUTTON,
	PRESETS_PANEL,
	presetApply,
	presetDelete,
	presetItem,
	presetRename,
} from "@/lib/test-ids";
import { useEffectStore } from "@/store/effectStore";
import { usePresetStore } from "@/store/presetStore";

function PresetRow({ id, name }: { id: string; name: string }) {
	const applyPreset = usePresetStore((s) => s.applyPreset);
	const renamePreset = usePresetStore((s) => s.renamePreset);
	const deletePreset = usePresetStore((s) => s.deletePreset);

	const [editing, setEditing] = useState(false);
	const [draft, setDraft] = useState(name);

	function commitRename() {
		renamePreset(id, draft);
		setEditing(false);
	}

	return (
		<li
			data-testid={presetItem(id)}
			className="flex items-center gap-1 rounded border border-white/10 px-2 py-1"
		>
			{editing ? (
				<>
					<input
						ref={(el) => el?.focus()}
						type="text"
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") commitRename();
							if (e.key === "Escape") setEditing(false);
						}}
						className="min-w-0 flex-1 rounded bg-white/10 px-1 py-0.5 text-white"
					/>
					<button
						type="button"
						className="rounded p-1 text-white/70 hover:bg-white/20"
						title="Confirm rename"
						onClick={commitRename}
					>
						<Check size={12} />
					</button>
					<button
						type="button"
						className="rounded p-1 text-white/70 hover:bg-white/20"
						title="Cancel"
						onClick={() => setEditing(false)}
					>
						<X size={12} />
					</button>
				</>
			) : (
				<>
					<button
						data-testid={presetApply(id)}
						type="button"
						className="min-w-0 flex-1 truncate text-left text-white/90 hover:text-white"
						title="Apply preset"
						onClick={() => applyPreset(id)}
					>
						{name}
					</button>
					<button
						data-testid={presetRename(id)}
						type="button"
						className="rounded p-1 text-white/70 hover:bg-white/20"
						title="Rename preset"
						onClick={() => {
							setDraft(name);
							setEditing(true);
						}}
					>
						<Pencil size={12} />
					</button>
					<button
						data-testid={presetDelete(id)}
						type="button"
						className="rounded p-1 text-white/70 hover:bg-red-500/40"
						title="Delete preset"
						onClick={() => deletePreset(id)}
					>
						<Trash2 size={12} />
					</button>
				</>
			)}
		</li>
	);
}

export function PresetsSection() {
	const presets = usePresetStore((s) => s.presets);
	const savePreset = usePresetStore((s) => s.savePreset);
	const hasEffects = useEffectStore((s) => s.effects.length > 0);

	const [name, setName] = useState("");

	function handleSave() {
		const trimmed = name.trim();
		if (!trimmed) return;
		savePreset(trimmed);
		setName("");
	}

	return (
		<div
			data-testid={PRESETS_PANEL}
			className="mt-4 border-t border-white/10 pt-3"
		>
			<h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
				Presets
			</h3>

			<div className="mb-2 flex gap-1">
				<input
					data-testid={PRESET_NAME_INPUT}
					type="text"
					value={name}
					placeholder="Preset name"
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") handleSave();
					}}
					className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white placeholder:text-white/30"
				/>
				<button
					data-testid={PRESET_SAVE_BUTTON}
					type="button"
					disabled={!name.trim() || !hasEffects}
					title={hasEffects ? "Save current stack" : "Add an effect first"}
					onClick={handleSave}
					className="flex items-center gap-1 rounded bg-fuchsia-600/80 px-2 py-1 text-white transition hover:bg-fuchsia-600 disabled:cursor-not-allowed disabled:opacity-40"
				>
					<Save size={12} />
					Save
				</button>
			</div>

			{presets.length === 0 ? (
				<p className="text-xs italic text-white/40">No presets saved yet.</p>
			) : (
				<ul className="flex flex-col gap-1">
					{presets.map((preset) => (
						<PresetRow key={preset.id} id={preset.id} name={preset.name} />
					))}
				</ul>
			)}
		</div>
	);
}
