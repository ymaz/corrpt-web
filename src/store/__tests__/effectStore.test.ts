import { beforeEach, describe, expect, it } from "vitest";
import { registerEffect } from "@/effects/registry";
import type { EffectDefinition } from "@/effects/types";
import { useEffectStore } from "../effectStore";

const TEST_EFFECT_ID = "store-test-effect";

const testDef: EffectDefinition = {
	id: TEST_EFFECT_ID,
	name: "Test Effect",
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
		{ name: "active", label: "Active", type: "bool", default: false },
	],
	vertexShader: "",
	fragmentShader: "",
};

registerEffect(testDef);

describe("effectStore", () => {
	beforeEach(() => {
		useEffectStore.setState({ effects: [], previewMode: "full" });
	});

	it("starts with no effects after reset", () => {
		expect(useEffectStore.getState().effects).toHaveLength(0);
	});

	it("addEffect creates an instance with default parameters", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const { effects } = useEffectStore.getState();
		expect(effects).toHaveLength(1);
		expect(effects[0].effectId).toBe(TEST_EFFECT_ID);
		expect(effects[0].enabled).toBe(true);
		expect(effects[0].parameters.intensity).toBe(0.5);
		expect(effects[0].parameters.active).toBe(false);
	});

	it("addEffect assigns a unique instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const { effects } = useEffectStore.getState();
		expect(effects[0].instanceId).not.toBe(effects[1].instanceId);
	});

	it("removeEffect removes by instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const { effects } = useEffectStore.getState();
		useEffectStore.getState().removeEffect(effects[0].instanceId);
		expect(useEffectStore.getState().effects).toHaveLength(0);
	});

	it("removeEffect ignores unknown instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().removeEffect("nonexistent");
		expect(useEffectStore.getState().effects).toHaveLength(1);
	});

	it("setEffectParam updates the parameter value", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.8);
		expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(0.8);
	});

	it("setEffectParam does not mutate other instances", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const [first, second] = useEffectStore
			.getState()
			.effects.map((e) => e.instanceId);
		useEffectStore.getState().setEffectParam(first, "intensity", 0.9);
		expect(
			useEffectStore.getState().effects.find((e) => e.instanceId === second)
				?.parameters.intensity,
		).toBe(0.5);
	});

	it("reorderEffects reorders the list", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const [first, second] = useEffectStore
			.getState()
			.effects.map((e) => e.instanceId);
		useEffectStore.getState().reorderEffects([second, first]);
		const reordered = useEffectStore.getState().effects;
		expect(reordered[0].instanceId).toBe(second);
		expect(reordered[1].instanceId).toBe(first);
	});

	it("reorderEffects is a no-op when length mismatches", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const before = useEffectStore.getState().effects.map((e) => e.instanceId);
		useEffectStore.getState().reorderEffects([before[0]]);
		const after = useEffectStore.getState().effects.map((e) => e.instanceId);
		expect(after).toEqual(before);
	});

	it("duplicateEffect inserts a copy after the source", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.9);
		useEffectStore.getState().duplicateEffect(instanceId);
		const { effects } = useEffectStore.getState();
		expect(effects).toHaveLength(2);
		expect(effects[1].parameters.intensity).toBe(0.9);
		expect(effects[1].instanceId).not.toBe(instanceId);
	});

	it("removeEffectsByEffectId removes all instances of an effect", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().removeEffectsByEffectId(TEST_EFFECT_ID);
		expect(useEffectStore.getState().effects).toHaveLength(0);
	});

	it("setPreviewMode updates previewMode", () => {
		useEffectStore.getState().setPreviewMode("split");
		expect(useEffectStore.getState().previewMode).toBe("split");
	});

	it("duplicateEffect copies current parameter values into the new instance", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.75);
		useEffectStore.getState().duplicateEffect(instanceId);
		expect(useEffectStore.getState().effects[1].parameters.intensity).toBe(0.75);
	});

	it("duplicateEffect parameters are independent — mutating original does not affect the copy", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().duplicateEffect(instanceId);
		useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.99);
		expect(useEffectStore.getState().effects[1].parameters.intensity).toBe(0.5);
	});

	it("reorderEffects is a no-op when input contains duplicate instanceIds", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const before = useEffectStore.getState().effects.map((e) => e.instanceId);
		useEffectStore.getState().reorderEffects([before[0], before[0]]);
		const after = useEffectStore.getState().effects.map((e) => e.instanceId);
		expect(after).toEqual(before);
	});

	it("setEffectParam is a no-op for an unknown instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().setEffectParam("nonexistent", "intensity", 0.99);
		expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(0.5);
	});

	it("duplicateEffect is a no-op for an unknown instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().duplicateEffect("nonexistent");
		expect(useEffectStore.getState().effects).toHaveLength(1);
	});
});
