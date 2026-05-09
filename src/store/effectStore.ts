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

export const MAX_EFFECT_INSTANCES = 3;

// Module-level clock — written at 60fps by EffectPipeline, read at export time.
// Kept outside Zustand so writes don't trigger the notification cycle.
let _time = 0;
export const getTime = (): number => _time;
export const setTime = (t: number): void => {
	_time = t;
};

export const useEffectStore = create<EffectStore>((set, get) => ({
	effects: [],
	previewMode: "full",

	addEffect: (effectId: string) => {
		const { effects } = get();
		if (
			effects.filter((e) => e.effectId === effectId).length >=
			MAX_EFFECT_INSTANCES
		)
			return;
		set({ effects: [...effects, createEffectInstance(effectId)] });
	},

	removeEffect: (instanceId: string) => {
		const { effects } = get();
		set({
			effects: effects.filter((effect) => effect.instanceId !== instanceId),
		});
	},

	removeEffectsByEffectId: (effectId: string) => {
		const { effects } = get();
		set({
			effects: effects.filter((effect) => effect.effectId !== effectId),
		});
	},

	setEffectParam: (
		instanceId: string,
		paramName: string,
		value: EffectParameterValue,
	) => {
		const { effects } = get();
		if (!effects.some((effect) => effect.instanceId === instanceId)) return;

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

		set({ effects: nextEffects });
	},

	duplicateEffect: (instanceId: string) => {
		const { effects } = get();
		const sourceIndex = effects.findIndex(
			(effect) => effect.instanceId === instanceId,
		);
		if (sourceIndex === -1) return;

		const source = effects[sourceIndex];
		if (
			effects.filter((e) => e.effectId === source.effectId).length >=
			MAX_EFFECT_INSTANCES
		)
			return;
		const duplicate: EffectInstance = {
			...source,
			instanceId: createInstanceId(source.effectId),
			parameters: structuredClone(source.parameters),
		};
		const nextEffects = [...effects];
		nextEffects.splice(sourceIndex + 1, 0, duplicate);

		set({ effects: nextEffects });
	},

	setPreviewMode: (mode) => {
		set({ previewMode: mode });
	},
}));
