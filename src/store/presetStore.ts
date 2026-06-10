import { create } from "zustand";

import type { EffectInstance } from "@/effects/types";
import { useEffectStore } from "@/store/effectStore";
import type { Preset, PresetStore } from "@/store/types";

const STORAGE_KEY = "corrpt:presets:v1";
// localStorage is a shared, persisted surface — cap the serialized payload so a
// runaway stack can't blow past quota or wedge hydration on the next load.
const MAX_SERIALIZED_BYTES = 1_000_000;

function isEffectInstance(value: unknown): value is EffectInstance {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.instanceId === "string" &&
		typeof v.effectId === "string" &&
		typeof v.enabled === "boolean" &&
		typeof v.parameters === "object" &&
		v.parameters !== null
	);
}

function isPreset(value: unknown): value is Preset {
	if (typeof value !== "object" || value === null) return false;
	const v = value as Record<string, unknown>;
	return (
		typeof v.id === "string" &&
		typeof v.name === "string" &&
		typeof v.createdAt === "number" &&
		Array.isArray(v.effects) &&
		v.effects.every(isEffectInstance)
	);
}

function loadPresets(): Preset[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		if (raw.length > MAX_SERIALIZED_BYTES) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(isPreset);
	} catch {
		return [];
	}
}

function persist(presets: Preset[]): void {
	try {
		const serialized = JSON.stringify(presets);
		if (serialized.length > MAX_SERIALIZED_BYTES) return;
		localStorage.setItem(STORAGE_KEY, serialized);
	} catch {
		// Quota exceeded or storage unavailable — keep the in-memory list usable.
	}
}

function createPresetId(): string {
	return `preset-${crypto.randomUUID()}`;
}

export const usePresetStore = create<PresetStore>((set, get) => ({
	presets: loadPresets(),

	savePreset: (name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const preset: Preset = {
			id: createPresetId(),
			name: trimmed,
			createdAt: Date.now(),
			effects: structuredClone(useEffectStore.getState().effects),
		};
		const presets = [...get().presets, preset];
		persist(presets);
		set({ presets });
	},

	applyPreset: (id: string) => {
		const preset = get().presets.find((p) => p.id === id);
		if (!preset) return;
		useEffectStore.getState().applyEffects(preset.effects);
	},

	renamePreset: (id: string, name: string) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const presets = get().presets.map((p) =>
			p.id === id ? { ...p, name: trimmed } : p,
		);
		persist(presets);
		set({ presets });
	},

	deletePreset: (id: string) => {
		const presets = get().presets.filter((p) => p.id !== id);
		persist(presets);
		set({ presets });
	},
}));
