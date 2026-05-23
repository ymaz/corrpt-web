import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";
import { describe, expect, it, vi } from "vitest";

import type { ReglContext } from "@/engine/reglContext";
import { registerEffect } from "../registry";
import { renderEffectChain } from "../renderEffectChain";
import type { EffectDefinition, EffectInstance } from "../types";

const RC_EFFECT_ID = "rc-chain-effect";
const RC_ENUM_EFFECT_ID = "rc-enum-effect";

registerEffect({
	id: RC_EFFECT_ID,
	name: "RC Test",
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
} satisfies EffectDefinition);

registerEffect({
	id: RC_ENUM_EFFECT_ID,
	name: "RC Enum Test",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "mode",
			label: "Mode",
			type: "enum",
			default: "b",
			options: [
				{ label: "A", value: "a" },
				{ label: "B", value: "b" },
				{ label: "C", value: "c" },
			],
		},
	],
	vertexShader: "",
	fragmentShader: "",
} satisfies EffectDefinition);

function makeInstance(overrides?: Partial<EffectInstance>): EffectInstance {
	return {
		instanceId: "rc-i1",
		effectId: RC_EFFECT_ID,
		enabled: true,
		parameters: { intensity: 0.5, active: false },
		...overrides,
	};
}

interface DrawCall {
	framebuffer: Framebuffer2D;
	props: Record<string, unknown>;
}

function setup(
	effects: EffectInstance[] = [],
	cache = new Map<string, DrawCommand>(),
) {
	const calls: DrawCall[] = [];

	const createEffectCommand = vi.fn((): DrawCommand => {
		const cmd = vi.fn((props: Record<string, unknown>) => {
			const { framebuffer, ...rest } = props;
			calls.push({ framebuffer: framebuffer as Framebuffer2D, props: rest });
		}) as unknown as DrawCommand;
		return cmd;
	});

	const ctx = {
		regl: {
			prop: (name: string) => name,
		},
		createEffectCommand,
	} as unknown as ReglContext;

	const texture = { __id: "tex" } as unknown as Texture2D;
	const fbos = [
		{ __id: "fbo0" } as unknown as Framebuffer2D,
		{ __id: "fbo1" } as unknown as Framebuffer2D,
	] as [Framebuffer2D, Framebuffer2D];

	return {
		params: {
			ctx,
			texture,
			effects,
			fbos,
			commandCache: cache,
			resolution: [100, 100] as [number, number],
			time: 1.5,
		},
		ctx,
		createEffectCommand,
		calls,
		texture,
		fbos,
		cache,
	};
}

describe("renderEffectChain", () => {
	it("passthrough: returns original texture when effects list is empty", () => {
		const { params, texture } = setup([]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("passthrough: returns original texture when all effects are disabled", () => {
		const { params, texture } = setup([
			makeInstance({ enabled: false }),
			makeInstance({ instanceId: "rc-i2", enabled: false }),
		]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("invokes the draw command once per enabled effect", () => {
		const { params, calls } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		renderEffectChain(params);
		expect(calls).toHaveLength(2);
	});

	it("single effect: writes to fbos[1] and returns fbos[1]", () => {
		const { params, fbos, calls } = setup([makeInstance()]);
		const result = renderEffectChain(params);
		expect(calls[0].framebuffer).toBe(fbos[1]);
		expect(result).toBe(fbos[1]);
	});

	it("two effects: ping-pongs fbos and returns fbos[0]", () => {
		const { params, fbos, calls } = setup([
			makeInstance(),
			makeInstance({ instanceId: "rc-i2" }),
		]);
		const result = renderEffectChain(params);
		expect(calls[0].framebuffer).toBe(fbos[1]);
		expect(calls[1].framebuffer).toBe(fbos[0]);
		expect(result).toBe(fbos[0]);
	});

	it("creates a DrawCommand and stores it in commandCache", () => {
		const cache = new Map<string, DrawCommand>();
		const { params } = setup(
			[makeInstance({ instanceId: "rc-cache-1" })],
			cache,
		);
		renderEffectChain(params);
		expect(cache.has("rc-cache-1")).toBe(true);
	});

	it("reuses cached command on subsequent calls", () => {
		const cache = new Map<string, DrawCommand>();
		const { params, createEffectCommand } = setup(
			[makeInstance({ instanceId: "rc-reuse-1" })],
			cache,
		);
		renderEffectChain(params);
		const cmd = cache.get("rc-reuse-1");
		renderEffectChain(params);
		expect(cache.size).toBe(1);
		expect(cache.get("rc-reuse-1")).toBe(cmd);
		expect(createEffectCommand).toHaveBeenCalledTimes(1);
	});

	it("passes the float instance parameter as a uniform prop", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-float-1",
				parameters: { intensity: 0.8, active: false },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_intensity).toBe(0.8);
	});

	it("maps bool parameter true → 1.0", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-bool-t",
				parameters: { intensity: 0.5, active: true },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_active).toBe(1.0);
	});

	it("maps bool parameter false → 0.0", () => {
		const { params, calls } = setup([
			makeInstance({
				instanceId: "rc-bool-f",
				parameters: { intensity: 0.5, active: false },
			}),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_active).toBe(0.0);
	});

	it("passes the time parameter as u_time", () => {
		const { params, calls } = setup([
			makeInstance({ instanceId: "rc-time-1" }),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_time).toBe(1.5);
	});

	it("uses original texture as u_texture on the first pass", () => {
		const { params, texture, calls } = setup([
			makeInstance({ instanceId: "rc-tex-1" }),
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_texture).toBe(texture);
	});

	it("passthrough: silently skips effects with unknown effectId", () => {
		const { params, texture } = setup([
			makeInstance({ effectId: "does-not-exist" }),
		]);
		expect(renderEffectChain(params)).toBe(texture);
	});

	it("maps enum default value to its option index", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-init",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "b" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(1);
	});

	it("maps enum instance parameter to its option index", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-update",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "c" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(2);
	});

	it("falls back to 0 for an unknown enum value", () => {
		const { params, calls } = setup([
			{
				instanceId: "rc-enum-unknown",
				effectId: RC_ENUM_EFFECT_ID,
				enabled: true,
				parameters: { mode: "unknown" },
			},
		]);
		renderEffectChain(params);
		expect(calls[0].props.u_mode).toBe(0);
	});
});
