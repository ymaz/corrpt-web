import type { DrawCommand, Framebuffer2D, Texture2D } from "regl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { registerEffect } from "@/effects/registry";
import type { EffectDefinition, EffectInstance } from "@/effects/types";
import type { ReglContext } from "@/engine/reglContext";
import { createEffectChainRenderer } from "../createEffectChainRenderer";

const TEST_EFFECT_ID = "cecr-test-effect";

registerEffect({
	id: TEST_EFFECT_ID,
	name: "CECR Test",
	category: "noise",
	description: "",
	parameters: [
		{
			name: "amount",
			label: "Amount",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
		},
	],
	vertexShader: "",
	fragmentShader: "",
} satisfies EffectDefinition);

function makeInstance(overrides?: Partial<EffectInstance>): EffectInstance {
	return {
		instanceId: "cecr-i1",
		effectId: TEST_EFFECT_ID,
		enabled: true,
		parameters: { amount: 0.5 },
		...overrides,
	};
}

function makeFakeBitmap(): ImageBitmap {
	return {} as ImageBitmap;
}

interface FakeContext {
	ctx: ReglContext;
	createFramebuffer: ReturnType<typeof vi.fn>;
	createImageTexture: ReturnType<typeof vi.fn>;
	createEffectCommand: ReturnType<typeof vi.fn>;
	drawCalls: Array<{
		framebuffer: Framebuffer2D;
		props: Record<string, unknown>;
	}>;
	textureDestroySpy: ReturnType<typeof vi.fn>;
	framebufferDestroySpies: Array<ReturnType<typeof vi.fn>>;
}

function makeFakeContext(): FakeContext {
	const drawCalls: FakeContext["drawCalls"] = [];
	const framebufferDestroySpies: FakeContext["framebufferDestroySpies"] = [];
	const textureDestroySpy = vi.fn();

	const createFramebuffer = vi.fn(
		(width: number, height: number): Framebuffer2D => {
			const destroy = vi.fn();
			framebufferDestroySpies.push(destroy);
			return { width, height, destroy } as unknown as Framebuffer2D;
		},
	);

	const createImageTexture = vi.fn(
		(_bitmap: ImageBitmap): Texture2D =>
			({ destroy: textureDestroySpy }) as unknown as Texture2D,
	);

	const createEffectCommand = vi.fn((): DrawCommand => {
		return vi.fn((props: Record<string, unknown>) => {
			const { framebuffer, ...rest } = props;
			drawCalls.push({
				framebuffer: framebuffer as Framebuffer2D,
				props: rest,
			});
		}) as unknown as DrawCommand;
	});

	const ctx = {
		regl: { prop: (n: string) => n },
		createFramebuffer,
		createImageTexture,
		createEffectCommand,
		destroy: vi.fn(),
	} as unknown as ReglContext;

	return {
		ctx,
		createFramebuffer,
		createImageTexture,
		createEffectCommand,
		drawCalls,
		textureDestroySpy,
		framebufferDestroySpies,
	};
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("createEffectChainRenderer", () => {
	describe("setImage", () => {
		it("creates a regl texture from the bitmap", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			const bitmap = makeFakeBitmap();
			renderer.setImage(bitmap);
			expect(fake.createImageTexture).toHaveBeenCalledWith(bitmap);
		});

		it("destroys the previous texture when a new bitmap is set", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			expect(fake.textureDestroySpy).not.toHaveBeenCalled();
			renderer.setImage(makeFakeBitmap());
			expect(fake.textureDestroySpy).toHaveBeenCalledOnce();
		});

		it("destroys the texture when bitmap is null", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.setImage(null);
			expect(fake.textureDestroySpy).toHaveBeenCalledOnce();
		});

		it("is a no-op after dispose", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.dispose();
			fake.createImageTexture.mockClear();
			renderer.setImage(makeFakeBitmap());
			expect(fake.createImageTexture).not.toHaveBeenCalled();
		});
	});

	describe("resize", () => {
		it("creates a pair of framebuffers at the requested size", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(800, 600);
			expect(fake.createFramebuffer).toHaveBeenCalledTimes(2);
			expect(fake.createFramebuffer).toHaveBeenCalledWith(800, 600);
		});

		it("does not recreate framebuffers when called again with the same dimensions", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(100, 100);
			fake.createFramebuffer.mockClear();
			renderer.resize(100, 100);
			expect(fake.createFramebuffer).not.toHaveBeenCalled();
		});

		it("destroys old framebuffers when dimensions change", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(100, 100);
			const [destroyA, destroyB] = fake.framebufferDestroySpies;
			renderer.resize(200, 200);
			expect(destroyA).toHaveBeenCalledOnce();
			expect(destroyB).toHaveBeenCalledOnce();
		});
	});

	describe("renderFrame", () => {
		it("returns null when no texture is set", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(100, 100);
			expect(renderer.renderFrame(0)).toBeNull();
		});

		it("returns null before resize (width/height still 0)", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			expect(renderer.renderFrame(0)).toBeNull();
		});

		it("does not invoke any draw command when effects list is empty", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([]);
			renderer.renderFrame(0);
			expect(fake.drawCalls).toHaveLength(0);
		});

		it("returns the input texture when effects list is empty", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([]);
			expect(renderer.renderFrame(0)).toBeTruthy();
		});

		it("invokes the draw command once per enabled effect", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-r1" }),
				makeInstance({ instanceId: "cecr-r2" }),
			]);
			renderer.renderFrame(0);
			expect(fake.drawCalls).toHaveLength(2);
		});

		it("returns null after dispose", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance()]);
			renderer.dispose();
			expect(renderer.renderFrame(0)).toBeNull();
		});
	});

	describe("setEffects", () => {
		it("is a no-op when called with the same array reference", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			const effects = [makeInstance({ instanceId: "cecr-same-ref" })];
			renderer.setEffects(effects);
			renderer.renderFrame(0);
			fake.createEffectCommand.mockClear();
			renderer.setEffects(effects);
			renderer.renderFrame(0);
			// Cached command reused — no new command compiled
			expect(fake.createEffectCommand).not.toHaveBeenCalled();
		});

		it("evicts cached command for a removed effect", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-evict-a" }),
				makeInstance({ instanceId: "cecr-evict-b" }),
			]);
			renderer.renderFrame(0);
			expect(fake.createEffectCommand).toHaveBeenCalledTimes(2);
			renderer.setEffects([makeInstance({ instanceId: "cecr-evict-b" })]);
			renderer.renderFrame(0);
			// Only "cecr-evict-b" remains in the cache; if "cecr-evict-a" had been
			// retained, no new command would be compiled. We rerun the chain after
			// re-adding "cecr-evict-a" and assert a fresh compile to prove it was
			// evicted.
			fake.createEffectCommand.mockClear();
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-evict-a" }),
				makeInstance({ instanceId: "cecr-evict-b" }),
			]);
			renderer.renderFrame(0);
			expect(fake.createEffectCommand).toHaveBeenCalledTimes(1);
		});

		it("does not evict commands when instance IDs are unchanged", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance({ instanceId: "cecr-keep-a" })]);
			renderer.renderFrame(0);
			fake.createEffectCommand.mockClear();
			renderer.setEffects([
				makeInstance({
					instanceId: "cecr-keep-a",
					parameters: { amount: 0.9 },
				}),
			]);
			renderer.renderFrame(0);
			expect(fake.createEffectCommand).not.toHaveBeenCalled();
		});

		it("evicts replaced effect when same-length swap occurs", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-swap-a" }),
				makeInstance({ instanceId: "cecr-swap-b" }),
			]);
			renderer.renderFrame(0);
			fake.createEffectCommand.mockClear();
			renderer.setEffects([
				makeInstance({ instanceId: "cecr-swap-a" }),
				makeInstance({ instanceId: "cecr-swap-c" }),
			]);
			renderer.renderFrame(0);
			// "cecr-swap-c" is new → 1 compile.
			expect(fake.createEffectCommand).toHaveBeenCalledTimes(1);
		});

		it("is a no-op after dispose", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.resize(100, 100);
			renderer.setEffects([makeInstance({ instanceId: "cecr-postdisp-a" })]);
			renderer.renderFrame(0);
			renderer.dispose();
			fake.createEffectCommand.mockClear();
			renderer.setEffects([makeInstance({ instanceId: "cecr-postdisp-b" })]);
			expect(fake.createEffectCommand).not.toHaveBeenCalled();
		});
	});

	describe("dispose", () => {
		it("destroys both framebuffers created during resize", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(100, 100);
			const [destroyA, destroyB] = fake.framebufferDestroySpies;
			renderer.dispose();
			expect(destroyA).toHaveBeenCalledOnce();
			expect(destroyB).toHaveBeenCalledOnce();
		});

		it("destroys the image texture", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.setImage(makeFakeBitmap());
			renderer.dispose();
			expect(fake.textureDestroySpy).toHaveBeenCalledOnce();
		});

		it("is idempotent: calling dispose twice does not throw", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.resize(100, 100);
			expect(() => {
				renderer.dispose();
				renderer.dispose();
			}).not.toThrow();
		});
	});

	describe("resize after dispose", () => {
		it("is a no-op: does not create new framebuffers", () => {
			const fake = makeFakeContext();
			const renderer = createEffectChainRenderer({ ctx: fake.ctx });
			renderer.dispose();
			fake.createFramebuffer.mockClear();
			renderer.resize(100, 100);
			expect(fake.createFramebuffer).not.toHaveBeenCalled();
		});
	});
});
