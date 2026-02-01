import type { EffectDefinition } from "@/effects/types";

const registry = new Map<string, EffectDefinition>();

export function registerEffect(def: EffectDefinition): void {
	registry.set(def.id, def);
}

export function getEffect(id: string): EffectDefinition | undefined {
	return registry.get(id);
}

export function getAllEffects(): EffectDefinition[] {
	return Array.from(registry.values());
}
