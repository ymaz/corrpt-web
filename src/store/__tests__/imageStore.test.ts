import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useImageStore } from "../imageStore";

function makeFakeBitmap(width = 200, height = 100): ImageBitmap {
	return { width, height, close: vi.fn() } as unknown as ImageBitmap;
}

describe("imageStore", () => {
	let createImageBitmapMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		createImageBitmapMock = vi.fn(() => Promise.resolve(makeFakeBitmap()));
		vi.stubGlobal("createImageBitmap", createImageBitmapMock);
		Object.assign(URL, {
			createObjectURL: vi.fn().mockReturnValue("blob:fake"),
			revokeObjectURL: vi.fn(),
		});
		useImageStore.setState({
			texture: null,
			dimensions: null,
			originalUrl: null,
			fileName: null,
			mimeType: null,
			isLoading: false,
			error: null,
			warning: null,
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		const u = URL as unknown as Record<string, unknown>;
		delete u.createObjectURL;
		delete u.revokeObjectURL;
	});

	it("sets texture.flipY to false — Three.js skips UNPACK_FLIP_Y_WEBGL for ImageBitmap sources", async () => {
		const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
		useImageStore.getState().loadImage(file);

		await vi.waitFor(() =>
			expect(useImageStore.getState().texture).not.toBeNull(),
		);

		expect(useImageStore.getState().texture?.flipY).toBe(false);
	});

	it("pre-flips the bitmap with imageOrientation: flipY so UV (0,0) reads the bottom of the image", async () => {
		const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
		useImageStore.getState().loadImage(file);

		await vi.waitFor(() =>
			expect(useImageStore.getState().texture).not.toBeNull(),
		);

		const hasFlipYCall = (
			createImageBitmapMock.mock.calls as [unknown, ImageBitmapOptions?][]
		).some(([, opts]) => opts?.imageOrientation === "flipY");
		expect(hasFlipYCall).toBe(true);
	});

	it("resize path: preserves imageOrientation: from-image on both initial and resize decodes, then flips", async () => {
		// 5000×5000 = 25 MP > 16 MP budget → forces scale < 1 resize branch
		createImageBitmapMock
			.mockResolvedValueOnce(makeFakeBitmap(5000, 5000)) // raw probe
			.mockResolvedValueOnce(makeFakeBitmap(4096, 4096)) // resize decode
			.mockResolvedValueOnce(makeFakeBitmap(4096, 4096)); // flipY decode

		const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
		useImageStore.getState().loadImage(file);

		await vi.waitFor(() =>
			expect(useImageStore.getState().texture).not.toBeNull(),
		);

		const calls = createImageBitmapMock.mock.calls as [
			unknown,
			ImageBitmapOptions?,
		][];
		expect(calls).toHaveLength(3);
		// Raw probe — EXIF correction, no resize
		expect(calls[0][1]).toMatchObject({ imageOrientation: "from-image" });
		expect(calls[0][1]).not.toHaveProperty("resizeWidth");
		// Resize decode — EXIF correction preserved alongside resize dims
		expect(calls[1][1]).toMatchObject({
			imageOrientation: "from-image",
			resizeWidth: expect.any(Number),
			resizeHeight: expect.any(Number),
		});
		// Pre-flip for WebGL bottom-left UV origin
		expect(calls[2][1]).toMatchObject({ imageOrientation: "flipY" });

		expect(useImageStore.getState().warning).toMatch(
			/Downscaled from 5000×5000/,
		);
	});
});
