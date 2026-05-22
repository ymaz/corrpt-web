import createREGL, {
	type DrawCommand,
	type Framebuffer2D,
	type Regl,
	type Texture2D,
} from "regl";

export interface PassUniforms {
	[name: string]: unknown;
}

export interface PassCommandOptions {
	vertexShader: string;
	fragmentShader: string;
	uniforms: PassUniforms;
}

export interface ReglContext {
	readonly regl: Regl;
	createPassCommand(opts: PassCommandOptions): DrawCommand;
	createImageTexture(bitmap: ImageBitmap): Texture2D;
	createFramebuffer(width: number, height: number): Framebuffer2D;
	destroy(): void;
}

export interface CreateReglContextOptions {
	preserveDrawingBuffer?: boolean;
}

// Match three.js WebGLRenderer defaults so the swap is observably identical:
// - premultipliedAlpha: true (three's default) — final canvas composites against the page
//   as premultiplied; we match so background blending stays identical.
// - antialias: false — orthographic full-screen quads, no need.
// - powerPreference: "high-performance" — discrete GPU on laptops.
const BASE_CONTEXT_ATTRS: WebGLContextAttributes = {
	alpha: true,
	antialias: false,
	premultipliedAlpha: true,
	powerPreference: "high-performance",
};

// Full-screen quad as a triangle strip in clip space.
// The vertex shader maps [-1,1] → [0,1] UVs so any pass can sample without setup.
const FULLSCREEN_QUAD: ReadonlyArray<readonly [number, number]> = [
	[-1, -1],
	[1, -1],
	[-1, 1],
	[1, 1],
];

export function createReglContext(
	canvas: HTMLCanvasElement,
	options: CreateReglContextOptions = {},
): ReglContext {
	const regl = createREGL({
		canvas,
		attributes: {
			...BASE_CONTEXT_ATTRS,
			// Required when reading pixels via canvas.toBlob() (export path):
			// WebGL may clear the drawing buffer after compositing.
			preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
		},
	});

	const positionBuffer = regl.buffer(FULLSCREEN_QUAD as unknown as number[][]);

	function createPassCommand(opts: PassCommandOptions): DrawCommand {
		return regl({
			vert: opts.vertexShader,
			frag: opts.fragmentShader,
			attributes: { a_position: positionBuffer },
			uniforms: opts.uniforms,
			primitive: "triangle strip",
			count: 4,
			depth: { enable: false },
		});
	}

	function createImageTexture(bitmap: ImageBitmap): Texture2D {
		// regl 2.1.1 supports ImageBitmap at runtime (lib/texture.js BITMAP_CLASS)
		// but its TypeScript types only list HTMLImageElement etc. — hence the cast.
		// The bitmap is pre-flipped at upload time (imageStore.ts: createImageBitmap
		// with imageOrientation "flipY") to match WebGL's bottom-left UV origin, so
		// we set flipY: false to avoid a second flip. premultiplyAlpha: false
		// because source images are always opaque (JPEG/PNG/WebP) — leaving alpha
		// untouched keeps intermediate FBO math identical to the three.js pipeline.
		return regl.texture({
			data: bitmap as unknown as HTMLImageElement,
			format: "rgba",
			type: "uint8",
			min: "linear",
			mag: "linear",
			wrap: "clamp",
			flipY: false,
			premultiplyAlpha: false,
			mipmap: false,
		});
	}

	function createFramebuffer(width: number, height: number): Framebuffer2D {
		return regl.framebuffer({
			width,
			height,
			colorFormat: "rgba",
			colorType: "uint8",
			depth: false,
			stencil: false,
		});
	}

	function destroy(): void {
		positionBuffer.destroy();
		regl.destroy();
	}

	return {
		regl,
		createPassCommand,
		createImageTexture,
		createFramebuffer,
		destroy,
	};
}
