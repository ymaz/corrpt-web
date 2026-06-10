import { beforeEach, describe, expect, it } from "vitest";
import { registerEffect } from "@/effects/registry";
import type { EffectDefinition } from "@/effects/types";
import {
	_resetHistory,
	getTime,
	MAX_LAYERS,
	setTime,
	useEffectStore,
} from "../effectStore";

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
		setTime(0);
		_resetHistory();
		useEffectStore.setState({
			effects: [],
			previewMode: "full",
			canUndo: false,
			canRedo: false,
		});
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

	it("toggleEffect flips the enabled flag", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().toggleEffect(instanceId);
		expect(useEffectStore.getState().effects[0].enabled).toBe(false);
		useEffectStore.getState().toggleEffect(instanceId);
		expect(useEffectStore.getState().effects[0].enabled).toBe(true);
	});

	it("toggleEffect is a no-op for an unknown instanceId", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		useEffectStore.getState().toggleEffect("nonexistent");
		expect(useEffectStore.getState().effects[0].enabled).toBe(true);
		expect(useEffectStore.getState().canUndo).toBe(true); // only the add
		useEffectStore.getState().undo();
		expect(useEffectStore.getState().canUndo).toBe(false);
	});

	it("toggleEffect is undoable", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().toggleEffect(instanceId);
		useEffectStore.getState().undo();
		expect(useEffectStore.getState().effects[0].enabled).toBe(true);
	});

	it("addEffect is a no-op at the layer cap", () => {
		for (let i = 0; i < MAX_LAYERS; i++) {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		}
		expect(useEffectStore.getState().effects).toHaveLength(MAX_LAYERS);
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		expect(useEffectStore.getState().effects).toHaveLength(MAX_LAYERS);
	});

	it("duplicateEffect is a no-op at the layer cap", () => {
		for (let i = 0; i < MAX_LAYERS; i++) {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		}
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().duplicateEffect(instanceId);
		expect(useEffectStore.getState().effects).toHaveLength(MAX_LAYERS);
	});

	it("applyEffects clamps oversized stacks to the layer cap", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const template = useEffectStore.getState().effects[0];
		const oversized = Array.from({ length: MAX_LAYERS + 5 }, () =>
			structuredClone(template),
		);
		useEffectStore.getState().applyEffects(oversized);
		expect(useEffectStore.getState().effects).toHaveLength(MAX_LAYERS);
	});

	it("setPreviewMode updates previewMode", () => {
		useEffectStore.getState().setPreviewMode("split");
		expect(useEffectStore.getState().previewMode).toBe("split");
	});

	it("getTime returns 0 on reset", () => {
		expect(getTime()).toBe(0);
	});

	it("setTime / getTime round-trip outside Zustand", () => {
		setTime(1.5);
		expect(getTime()).toBe(1.5);
	});

	it("setTime does not notify Zustand subscribers", () => {
		let notifications = 0;
		const unsub = useEffectStore.subscribe(() => {
			notifications++;
		});
		setTime(2.0);
		unsub();
		expect(notifications).toBe(0);
	});

	it("duplicateEffect copies current parameter values into the new instance", () => {
		useEffectStore.getState().addEffect(TEST_EFFECT_ID);
		const instanceId = useEffectStore.getState().effects[0].instanceId;
		useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.75);
		useEffectStore.getState().duplicateEffect(instanceId);
		expect(useEffectStore.getState().effects[1].parameters.intensity).toBe(
			0.75,
		);
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

	describe("undo / redo", () => {
		it("canUndo / canRedo start false and undo / redo are no-ops on empty history", () => {
			expect(useEffectStore.getState().canUndo).toBe(false);
			expect(useEffectStore.getState().canRedo).toBe(false);
			useEffectStore.getState().undo();
			useEffectStore.getState().redo();
			expect(useEffectStore.getState().effects).toHaveLength(0);
		});

		it("undo reverts addEffect and sets canRedo", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			expect(useEffectStore.getState().canUndo).toBe(true);
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects).toHaveLength(0);
			expect(useEffectStore.getState().canUndo).toBe(false);
			expect(useEffectStore.getState().canRedo).toBe(true);
		});

		it("redo reapplies an undone addEffect", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			useEffectStore.getState().undo();
			useEffectStore.getState().redo();
			expect(useEffectStore.getState().effects).toHaveLength(1);
			expect(useEffectStore.getState().canRedo).toBe(false);
		});

		it("a new mutation clears the redo stack", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().canRedo).toBe(true);
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			expect(useEffectStore.getState().canRedo).toBe(false);
		});

		it("coalesces consecutive setEffectParam edits to the same (instanceId, paramName) into one undo step", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			const instanceId = useEffectStore.getState().effects[0].instanceId;
			// Simulates a slider drag — many setEffectParam calls in a row.
			for (let i = 1; i <= 10; i++) {
				useEffectStore
					.getState()
					.setEffectParam(instanceId, "intensity", i / 10);
			}
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				1.0,
			);

			// One undo collapses the whole drag back to the value before it started.
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				0.5,
			);
		});

		it("does not coalesce setEffectParam edits to different params", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			const instanceId = useEffectStore.getState().effects[0].instanceId;
			useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.9);
			useEffectStore.getState().setEffectParam(instanceId, "active", true);

			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects[0].parameters.active).toBe(
				false,
			);
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				0.9,
			);

			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				0.5,
			);
		});

		it("breaks coalescing when a non-param mutation interrupts the run", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			const instanceId = useEffectStore.getState().effects[0].instanceId;
			useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.7);
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			useEffectStore.getState().setEffectParam(instanceId, "intensity", 0.9);

			// Three distinct history entries: 0.7 edit, addEffect, 0.9 edit.
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				0.7,
			);
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects).toHaveLength(1);
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects[0].parameters.intensity).toBe(
				0.5,
			);
		});

		it("caps undo history at 100 entries — oldest steps are dropped", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			const instanceId = useEffectStore.getState().effects[0].instanceId;
			// 130 distinct (non-coalescing) param edits alternating params so each
			// pushes its own history entry; cap is 100.
			for (let i = 0; i < 130; i++) {
				const param = i % 2 === 0 ? "intensity" : "active";
				const value = i % 2 === 0 ? i / 200 : i % 4 === 1;
				useEffectStore.getState().setEffectParam(instanceId, param, value);
			}
			// Undo every available step; we should be able to undo at most 100 times.
			let undoCount = 0;
			while (useEffectStore.getState().canUndo) {
				useEffectStore.getState().undo();
				undoCount++;
				if (undoCount > 200) throw new Error("undo did not terminate");
			}
			expect(undoCount).toBe(100);
		});

		it("applyEffects (preset application) is undoable", () => {
			useEffectStore.getState().addEffect(TEST_EFFECT_ID);
			const snapshot = structuredClone(useEffectStore.getState().effects);
			useEffectStore.getState().applyEffects([]);
			expect(useEffectStore.getState().effects).toHaveLength(0);
			useEffectStore.getState().undo();
			expect(useEffectStore.getState().effects).toHaveLength(1);
			useEffectStore.getState().redo();
			expect(useEffectStore.getState().effects).toHaveLength(0);
			expect(snapshot).toHaveLength(1);
		});
	});
});
