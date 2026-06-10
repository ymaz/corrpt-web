import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { registerEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";

const TEST_EFFECT_ID = "preset-test-effect";
const STORAGE_KEY = "corrpt:presets:v1";

const testDef: EffectDefinition = {
	id: TEST_EFFECT_ID,
	name: "Preset Test Effect",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "intensity",
			label: "Intensity",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
		},
	],
	vertexShader: "",
	fragmentShader: "",
};

registerEffect(testDef);

function installLocalStorage(initial: Record<string, string> = {}): void {
	const store = new Map<string, string>(Object.entries(initial));
	vi.stubGlobal("localStorage", {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => {
			store.set(key, value);
		},
		removeItem: (key: string) => {
			store.delete(key);
		},
		clear: () => {
			store.clear();
		},
	});
}

// The store hydrates from localStorage at module-eval time, so re-import it
// lazily after the stub is installed. presetStore depends on effectStore, so we
// return both from the SAME fresh module graph — otherwise savePreset would read
// a different effectStore instance than the test set up.
async function freshStores() {
	vi.resetModules();
	const presetMod = await import("../presetStore");
	const effectMod = await import("../effectStore");
	return {
		usePresetStore: presetMod.usePresetStore,
		useEffectStore: effectMod.useEffectStore,
	};
}

describe("presetStore", () => {
	beforeEach(() => {
		installLocalStorage();
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("savePreset snapshots the current effect stack and persists to localStorage", async () => {
		const { usePresetStore, useEffectStore } = await freshStores();
		useEffectStore.setState({
			effects: [
				{
					instanceId: "i-1",
					effectId: TEST_EFFECT_ID,
					enabled: true,
					parameters: { intensity: 0.8 },
				},
			],
			previewMode: "full",
			canUndo: false,
			canRedo: false,
		});
		usePresetStore.setState({ presets: [] });

		usePresetStore.getState().savePreset("My Look");
		const { presets } = usePresetStore.getState();
		expect(presets).toHaveLength(1);
		expect(presets[0].name).toBe("My Look");
		expect(presets[0].effects[0].parameters.intensity).toBe(0.8);
		expect(typeof presets[0].id).toBe("string");
		expect(typeof presets[0].createdAt).toBe("number");

		const raw = localStorage.getItem(STORAGE_KEY);
		expect(raw).not.toBeNull();
		expect(JSON.parse(raw as string)).toHaveLength(1);
	});

	it("savePreset deep-clones effects so later edits don't mutate the preset", async () => {
		const { usePresetStore, useEffectStore } = await freshStores();
		const instance: EffectInstance = {
			instanceId: "i-1",
			effectId: TEST_EFFECT_ID,
			enabled: true,
			parameters: { intensity: 0.3 },
		};
		useEffectStore.setState({
			effects: [instance],
			previewMode: "full",
			canUndo: false,
			canRedo: false,
		});
		usePresetStore.setState({ presets: [] });
		usePresetStore.getState().savePreset("Snapshot");

		useEffectStore.getState().setEffectParam("i-1", "intensity", 0.99);
		expect(
			usePresetStore.getState().presets[0].effects[0].parameters.intensity,
		).toBe(0.3);
	});

	it("savePreset ignores blank names", async () => {
		const { usePresetStore } = await freshStores();
		usePresetStore.setState({ presets: [] });
		usePresetStore.getState().savePreset("   ");
		expect(usePresetStore.getState().presets).toHaveLength(0);
	});

	it("applyPreset replaces the effect stack with fresh instanceIds", async () => {
		const { usePresetStore, useEffectStore } = await freshStores();
		useEffectStore.setState({
			effects: [],
			previewMode: "full",
			canUndo: false,
			canRedo: false,
		});
		usePresetStore.setState({
			presets: [
				{
					id: "p-1",
					name: "Preset",
					createdAt: 1,
					effects: [
						{
							instanceId: "old-id",
							effectId: TEST_EFFECT_ID,
							enabled: true,
							parameters: { intensity: 0.42 },
						},
					],
				},
			],
		});

		usePresetStore.getState().applyPreset("p-1");
		const { effects } = useEffectStore.getState();
		expect(effects).toHaveLength(1);
		expect(effects[0].effectId).toBe(TEST_EFFECT_ID);
		expect(effects[0].parameters.intensity).toBe(0.42);
		// Fresh instanceId — not reused from the stored preset.
		expect(effects[0].instanceId).not.toBe("old-id");
	});

	it("applyPreset is a no-op for an unknown id", async () => {
		const { usePresetStore, useEffectStore } = await freshStores();
		useEffectStore.setState({
			effects: [],
			previewMode: "full",
			canUndo: false,
			canRedo: false,
		});
		usePresetStore.setState({ presets: [] });
		usePresetStore.getState().applyPreset("nope");
		expect(useEffectStore.getState().effects).toHaveLength(0);
	});

	it("renamePreset updates the name and persists", async () => {
		const { usePresetStore } = await freshStores();
		usePresetStore.setState({
			presets: [{ id: "p-1", name: "Old", createdAt: 1, effects: [] }],
		});
		usePresetStore.getState().renamePreset("p-1", "New Name");
		expect(usePresetStore.getState().presets[0].name).toBe("New Name");
		expect(localStorage.getItem(STORAGE_KEY)).toContain("New Name");
	});

	it("renamePreset ignores blank names", async () => {
		const { usePresetStore } = await freshStores();
		usePresetStore.setState({
			presets: [{ id: "p-1", name: "Old", createdAt: 1, effects: [] }],
		});
		usePresetStore.getState().renamePreset("p-1", "  ");
		expect(usePresetStore.getState().presets[0].name).toBe("Old");
	});

	it("deletePreset removes the preset and persists", async () => {
		const { usePresetStore } = await freshStores();
		usePresetStore.setState({
			presets: [
				{ id: "p-1", name: "A", createdAt: 1, effects: [] },
				{ id: "p-2", name: "B", createdAt: 2, effects: [] },
			],
		});
		usePresetStore.getState().deletePreset("p-1");
		const { presets } = usePresetStore.getState();
		expect(presets).toHaveLength(1);
		expect(presets[0].id).toBe("p-2");
		expect(
			JSON.parse(localStorage.getItem(STORAGE_KEY) as string),
		).toHaveLength(1);
	});

	it("hydrates valid presets from localStorage on init", async () => {
		installLocalStorage({
			[STORAGE_KEY]: JSON.stringify([
				{ id: "p-1", name: "Stored", createdAt: 1, effects: [] },
			]),
		});
		const { usePresetStore } = await freshStores();
		expect(usePresetStore.getState().presets).toHaveLength(1);
		expect(usePresetStore.getState().presets[0].name).toBe("Stored");
	});

	it("ignores malformed JSON on init", async () => {
		installLocalStorage({ [STORAGE_KEY]: "{not json" });
		const { usePresetStore } = await freshStores();
		expect(usePresetStore.getState().presets).toEqual([]);
	});

	it("filters out preset entries with the wrong shape on init", async () => {
		installLocalStorage({
			[STORAGE_KEY]: JSON.stringify([
				{ id: "ok", name: "Valid", createdAt: 1, effects: [] },
				{ id: "bad", name: 42, effects: "nope" },
				"definitely-not-a-preset",
			]),
		});
		const { usePresetStore } = await freshStores();
		const { presets } = usePresetStore.getState();
		expect(presets).toHaveLength(1);
		expect(presets[0].id).toBe("ok");
	});

	it("ignores a non-array payload on init", async () => {
		installLocalStorage({ [STORAGE_KEY]: JSON.stringify({ foo: "bar" }) });
		const { usePresetStore } = await freshStores();
		expect(usePresetStore.getState().presets).toEqual([]);
	});

	it("ignores an oversized payload on init", async () => {
		installLocalStorage({ [STORAGE_KEY]: "x".repeat(1_000_001) });
		const { usePresetStore } = await freshStores();
		expect(usePresetStore.getState().presets).toEqual([]);
	});

	it("starts empty when no stored value exists", async () => {
		const { usePresetStore } = await freshStores();
		expect(usePresetStore.getState().presets).toEqual([]);
	});
});
