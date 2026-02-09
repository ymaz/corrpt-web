import { create } from "zustand";

import { getEffect } from "@/effects/registry";
import type { EffectParameterValue } from "@/effects/types";
import type { EffectStore } from "@/store/types";

export const useEffectStore = create<EffectStore>((set, get) => ({
	activeEffects: [],
	parameters: {},
	previewMode: "full",

	addEffect: (id: string) => {
		const { activeEffects } = get();
		if (activeEffects.includes(id)) return;
		const def = getEffect(id);
		const defaults: Record<string, EffectParameterValue> = {};
		if (def) {
			for (const p of def.parameters) {
				defaults[p.name] = p.default;
			}
		}
		set({
			activeEffects: [...activeEffects, id],
			parameters: { ...get().parameters, [id]: defaults },
		});
	},

	removeEffect: (id: string) => {
		const { activeEffects, parameters } = get();
		const { [id]: _, ...rest } = parameters;
		set({
			activeEffects: activeEffects.filter((e) => e !== id),
			parameters: rest,
		});
	},

	setEffectParam: (
		effectId: string,
		paramName: string,
		value: EffectParameterValue,
	) => {
		const { parameters } = get();
		if (!parameters[effectId]) return;
		set({
			parameters: {
				...parameters,
				[effectId]: { ...parameters[effectId], [paramName]: value },
			},
		});
	},

	reorderEffects: (effectIds: string[]) => {
		set({ activeEffects: effectIds });
	},

	setPreviewMode: (mode) => {
		set({ previewMode: mode });
	},
}));
