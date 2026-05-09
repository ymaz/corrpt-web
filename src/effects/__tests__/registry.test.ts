import { describe, expect, it } from "vitest";
import { getAllEffects, getEffect, registerEffect } from "../registry";
import type { EffectDefinition } from "../types";

const makeEffect = (id: string): EffectDefinition => ({
	id,
	name: id,
	category: "noise",
	description: "",
	parameters: [],
	vertexShader: "",
	fragmentShader: "",
});

describe("registry", () => {
	it("registers and retrieves an effect by id", () => {
		const def = makeEffect("reg-test-get");
		registerEffect(def);
		expect(getEffect("reg-test-get")).toBe(def);
	});

	it("returns undefined for unknown id", () => {
		expect(getEffect("nonexistent-xyz")).toBeUndefined();
	});

	it("getAllEffects includes registered effects", () => {
		const def = makeEffect("reg-test-all");
		registerEffect(def);
		expect(getAllEffects()).toContainEqual(def);
	});

	it("overwrites existing effect on re-register — getEffect reflects new definition", () => {
		registerEffect(makeEffect("reg-test-overwrite"));
		const updated = { ...makeEffect("reg-test-overwrite"), name: "updated" };
		registerEffect(updated);
		expect(getEffect("reg-test-overwrite")?.name).toBe("updated");
	});

	it("getAllEffects reflects updated definition after re-register", () => {
		registerEffect(makeEffect("reg-test-overwrite-all"));
		const updated = {
			...makeEffect("reg-test-overwrite-all"),
			name: "updated-all",
		};
		registerEffect(updated);
		const all = getAllEffects();
		const found = all.find((e) => e.id === "reg-test-overwrite-all");
		expect(found?.name).toBe("updated-all");
	});

	it("getAllEffects returns a new array each call (not the internal iterator)", () => {
		const a = getAllEffects();
		const b = getAllEffects();
		expect(a).not.toBe(b);
	});
});
