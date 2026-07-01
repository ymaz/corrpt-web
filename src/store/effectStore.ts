import { create } from "zustand";

import { getEffect } from "@/effects/registry";
import type {
	EffectInstance,
	EffectParameterValue,
	EffectParameterValues,
} from "@/effects/types";
import type { EffectStore } from "@/store/types";

function createInstanceId(effectId: string): string {
	return `${effectId}-${crypto.randomUUID()}`;
}

function createDefaultParameters(effectId: string): EffectParameterValues {
	const def = getEffect(effectId);
	const defaults: EffectParameterValues = {};
	if (!def) return defaults;

	for (const p of def.parameters) {
		defaults[p.name] = structuredClone(p.default);
	}

	return defaults;
}

function createEffectInstance(effectId: string): EffectInstance {
	return {
		instanceId: createInstanceId(effectId),
		effectId,
		enabled: true,
		parameters: createDefaultParameters(effectId),
	};
}

// Layers are a flat bucket — one global cap, any mix of effect types.
export const MAX_LAYERS = 10;
const HISTORY_LIMIT = 100;

// The effects the renderer should actually draw: none while bypassed (the
// before/after toggle shows the original), otherwise the full stack. Single
// source of truth so the canvas's init and subscription paths can't diverge.
export const renderableEffects = (state: {
	effects: readonly EffectInstance[];
	bypassed: boolean;
}): readonly EffectInstance[] => (state.bypassed ? [] : state.effects);

// Module-level clock — advanced per rendered frame by EffectCanvas, read at
// export time. Kept outside Zustand so writes don't trigger the notification cycle.
let _time = 0;
export const getTime = (): number => _time;
export const setTime = (t: number): void => {
	_time = t;
};

// Undo history lives outside Zustand state: it never drives rendering and we
// don't want snapshots to participate in shallow-equality selectors.
let past: EffectInstance[][] = [];
let future: EffectInstance[][] = [];

// Coalescing key for the most recent setEffectParam push. While consecutive
// edits target the same (instanceId, paramName), they share a single undo entry
// so dragging a slider collapses to one step. Cleared by any other mutation.
let coalesceKey: string | null = null;

function flags() {
	return { canUndo: past.length > 0, canRedo: future.length > 0 };
}

// Test-only: clears the module-level undo/redo history so suites start clean.
export function _resetHistory(): void {
	past = [];
	future = [];
	coalesceKey = null;
}

export const useEffectStore = create<EffectStore>((set, get) => {
	// Snapshot current effects onto the undo stack before a mutation. `key`
	// enables coalescing: a repeated key replaces the prior history entry's
	// "redo target" rather than pushing a new one.
	function pushHistory(key: string | null): void {
		const snapshot = structuredClone(get().effects);
		const coalesced = key !== null && key === coalesceKey && past.length > 0;
		if (!coalesced) {
			past.push(snapshot);
			if (past.length > HISTORY_LIMIT) past.shift();
		}
		future = [];
		coalesceKey = key;
	}

	return {
		effects: [],
		// Preview-only before/after toggle: render the original image while true.
		// Deliberately not in undo history and never touches per-layer `enabled`,
		// so flipping it back restores the exact previous state.
		bypassed: false,
		previewMode: "full",
		canUndo: false,
		canRedo: false,

		addEffect: (effectId: string) => {
			const { effects } = get();
			if (effects.length >= MAX_LAYERS) return;
			pushHistory(null);
			set({
				effects: [...effects, createEffectInstance(effectId)],
				...flags(),
			});
		},

		removeEffect: (instanceId: string) => {
			const { effects } = get();
			if (!effects.some((effect) => effect.instanceId === instanceId)) return;
			pushHistory(null);
			set({
				effects: effects.filter((effect) => effect.instanceId !== instanceId),
				...flags(),
			});
		},

		toggleEffect: (instanceId: string) => {
			const { effects } = get();
			if (!effects.some((effect) => effect.instanceId === instanceId)) return;
			pushHistory(null);
			set({
				effects: effects.map((effect) =>
					effect.instanceId === instanceId
						? { ...effect, enabled: !effect.enabled }
						: effect,
				),
				...flags(),
			});
		},

		setEffectParam: (
			instanceId: string,
			paramName: string,
			value: EffectParameterValue,
		) => {
			const { effects } = get();
			if (!effects.some((effect) => effect.instanceId === instanceId)) return;

			pushHistory(`${instanceId}|${paramName}`);
			set({
				effects: effects.map((effect) =>
					effect.instanceId === instanceId
						? {
								...effect,
								parameters: {
									...effect.parameters,
									[paramName]: structuredClone(value),
								},
							}
						: effect,
				),
				...flags(),
			});
		},

		reorderEffects: (instanceIds: string[]) => {
			const { effects } = get();
			if (instanceIds.length !== effects.length) return;

			const effectsById = new Map(
				effects.map((effect) => [effect.instanceId, effect]),
			);
			const nextEffects: EffectInstance[] = [];
			const seenInstanceIds = new Set<string>();

			for (const instanceId of instanceIds) {
				if (seenInstanceIds.has(instanceId)) return;
				const effect = effectsById.get(instanceId);
				if (!effect) return;
				seenInstanceIds.add(instanceId);
				nextEffects.push(effect);
			}

			pushHistory(null);
			set({ effects: nextEffects, ...flags() });
		},

		duplicateEffect: (instanceId: string) => {
			const { effects } = get();
			const sourceIndex = effects.findIndex(
				(effect) => effect.instanceId === instanceId,
			);
			if (sourceIndex === -1) return;

			if (effects.length >= MAX_LAYERS) return;
			const source = effects[sourceIndex];
			const duplicate: EffectInstance = {
				...source,
				instanceId: createInstanceId(source.effectId),
				parameters: structuredClone(source.parameters),
			};
			const nextEffects = [...effects];
			nextEffects.splice(sourceIndex + 1, 0, duplicate);

			pushHistory(null);
			set({ effects: nextEffects, ...flags() });
		},

		applyEffects: (effects: EffectInstance[]) => {
			// Presets saved before the layer cap existed may exceed it — clamp.
			const next = effects.slice(0, MAX_LAYERS).map((effect) => ({
				...effect,
				instanceId: createInstanceId(effect.effectId),
				parameters: structuredClone(effect.parameters),
			}));
			pushHistory(null);
			set({ effects: next, ...flags() });
		},

		undo: () => {
			if (past.length === 0) return;
			const previous = past.pop() as EffectInstance[];
			future.push(structuredClone(get().effects));
			coalesceKey = null;
			set({ effects: previous, ...flags() });
		},

		redo: () => {
			if (future.length === 0) return;
			const next = future.pop() as EffectInstance[];
			past.push(structuredClone(get().effects));
			coalesceKey = null;
			set({ effects: next, ...flags() });
		},

		toggleBypass: () => {
			set((state) => ({ bypassed: !state.bypassed }));
		},

		setPreviewMode: (mode) => {
			set({ previewMode: mode });
		},
	};
});
