import createREGL from "regl";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("regl");

import { createPassthroughUniforms, createReglContext } from "../reglContext";

type MockRegl = {
	buffer: ReturnType<typeof vi.fn>;
	prop: ReturnType<typeof vi.fn>;
	clear: ReturnType<typeof vi.fn>;
	texture: ReturnType<typeof vi.fn>;
	framebuffer: ReturnType<typeof vi.fn>;
	destroy: ReturnType<typeof vi.fn>;
};

function makeMockRegl(): MockRegl {
	const fakeBuffer = { destroy: vi.fn() };
	return {
		buffer: vi.fn(() => fakeBuffer),
		prop: vi.fn((n: string) => `prop:${n}`),
		clear: vi.fn(),
		texture: vi.fn(() => ({ destroy: vi.fn() })),
		framebuffer: vi.fn(() => ({ destroy: vi.fn() })),
		destroy: vi.fn(),
	};
}

describe("createReglContext", () => {
	let mock: MockRegl;

	beforeEach(() => {
		vi.mocked(createREGL).mockReset();
		mock = makeMockRegl();
		vi.mocked(createREGL).mockReturnValue(
			mock as unknown as ReturnType<typeof createREGL>,
		);
	});

	it("passes premultipliedAlpha: true to the WebGL context", () => {
		createReglContext({} as HTMLCanvasElement);
		const opts = vi.mocked(createREGL).mock.calls[0][0] as {
			attributes?: Record<string, unknown>;
		};
		expect(opts?.attributes?.premultipliedAlpha).toBe(true);
	});

	it("preserveDrawingBuffer defaults to false", () => {
		createReglContext({} as HTMLCanvasElement);
		const opts = vi.mocked(createREGL).mock.calls[0][0] as {
			attributes?: Record<string, unknown>;
		};
		expect(opts?.attributes?.preserveDrawingBuffer).toBe(false);
	});

	it("passes preserveDrawingBuffer: true when requested", () => {
		createReglContext({} as HTMLCanvasElement, { preserveDrawingBuffer: true });
		const opts = vi.mocked(createREGL).mock.calls[0][0] as {
			attributes?: Record<string, unknown>;
		};
		expect(opts?.attributes?.preserveDrawingBuffer).toBe(true);
	});

	it("creates image textures with premultiplyAlpha: false and flipY: false", () => {
		const ctx = createReglContext({} as HTMLCanvasElement);
		ctx.createImageTexture({} as ImageBitmap);
		expect(mock.texture).toHaveBeenCalledWith(
			expect.objectContaining({ premultiplyAlpha: false, flipY: false }),
		);
	});

	it("prop() delegates to regl.prop and returns its result", () => {
		const ctx = createReglContext({} as HTMLCanvasElement);
		const result = ctx.prop("u_time");
		expect(mock.prop).toHaveBeenCalledWith("u_time");
		expect(result).toBe("prop:u_time");
	});

	it("clear() delegates to regl.clear", () => {
		const ctx = createReglContext({} as HTMLCanvasElement);
		ctx.clear({ color: [0, 0, 0, 1], depth: 1 });
		expect(mock.clear).toHaveBeenCalledWith(
			expect.objectContaining({ depth: 1 }),
		);
	});

	it("destroy() calls positionBuffer.destroy and regl.destroy", () => {
		const fakeBuffer = { destroy: vi.fn() };
		mock.buffer.mockReturnValue(fakeBuffer);
		const ctx = createReglContext({} as HTMLCanvasElement);
		ctx.destroy();
		expect(fakeBuffer.destroy).toHaveBeenCalledOnce();
		expect(mock.destroy).toHaveBeenCalledOnce();
	});
});

describe("createPassthroughUniforms", () => {
	it("returns prop bindings for u_texture, u_resolution, and u_time", () => {
		const mock = makeMockRegl();
		vi.mocked(createREGL).mockReturnValue(
			mock as unknown as ReturnType<typeof createREGL>,
		);
		const ctx = createReglContext({} as HTMLCanvasElement);
		const uniforms = createPassthroughUniforms(ctx);
		expect(uniforms).toMatchObject({
			u_texture: "prop:u_texture",
			u_resolution: "prop:u_resolution",
			u_time: "prop:u_time",
		});
	});
});
