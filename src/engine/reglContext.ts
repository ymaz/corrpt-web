import createREGL, {
	type DrawCommand,
	type Framebuffer2D,
	type Texture2D,
} from "regl";

interface PassUniforms {
	[name: string]: unknown;
}

interface PassCommandOptions {
	vertexShader: string;
	fragmentShader: string;
	uniforms: PassUniforms;
}

export interface ReglContext {
	/** Bind a named uniform prop for use in a command config. */
	prop(name: string): unknown;
	/** Clear the default framebuffer. */
	clear(opts: {
		color?: readonly [number, number, number, number];
		depth?: number;
	}): void;
	/**
	 * Draws to a framebuffer that's chosen per-invocation via the
	 * `framebuffer` prop. Used by every effect pass in the chain.
	 */
	createEffectCommand(opts: PassCommandOptions): DrawCommand;
	/**
	 * Draws to the canvas (no framebuffer) inside a per-invocation `viewport`.
	 * Used for the final letterboxed blit to screen.
	 */
	createScreenCommand(opts: PassCommandOptions): DrawCommand;
	createImageTexture(bitmap: ImageBitmap): Texture2D;
	/** Build a static RGBA8 texture (LUT, mask, …) from raw pixel data. */
	createDataTexture(
		width: number,
		height: number,
		data: Uint8Array,
		filter?: "nearest" | "linear",
	): Texture2D;
	createFramebuffer(width: number, height: number): Framebuffer2D;
	destroy(): void;
}

/** Standard per-pass uniforms: texture input, resolution, and time. */
export function createPassthroughUniforms(ctx: ReglContext): PassUniforms {
	return {
		u_texture: ctx.prop("u_texture"),
		u_resolution: ctx.prop("u_resolution"),
		u_time: ctx.prop("u_time"),
	};
}

interface CreateReglContextOptions {
	preserveDrawingBuffer?: boolean;
}

const FULLSCREEN_QUAD: number[][] = [
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
			alpha: true,
			antialias: false,
			// Page compositing assumes premultiplied output.
			premultipliedAlpha: true,
			powerPreference: "high-performance",
			// Required for the export path: canvas.toBlob is async and reads
			// the drawing buffer after the frame, which may otherwise be cleared.
			preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
		},
	});

	const positionBuffer = regl.buffer(FULLSCREEN_QUAD);

	// Required: regl, unlike three, does not inject a precision qualifier.
	const FRAGMENT_PRECISION = "precision highp float;\n";

	function baseCommandConfig(opts: PassCommandOptions) {
		return {
			vert: opts.vertexShader,
			frag: FRAGMENT_PRECISION + opts.fragmentShader,
			attributes: { a_position: positionBuffer },
			uniforms: opts.uniforms,
			primitive: "triangle strip" as const,
			count: 4,
			depth: { enable: false },
		};
	}

	function createEffectCommand(opts: PassCommandOptions): DrawCommand {
		return regl({
			...baseCommandConfig(opts),
			framebuffer: regl.prop<{ framebuffer: Framebuffer2D }, "framebuffer">(
				"framebuffer",
			),
		});
	}

	function createScreenCommand(opts: PassCommandOptions): DrawCommand {
		return regl({
			...baseCommandConfig(opts),
			viewport: regl.prop<
				{ viewport: { x: number; y: number; width: number; height: number } },
				"viewport"
			>("viewport"),
		});
	}

	function createImageTexture(bitmap: ImageBitmap): Texture2D {
		// regl supports ImageBitmap at runtime, but its types only list
		// HTMLImageElement etc. — hence the cast.
		// flipY: false because the bitmap is pre-flipped at decode time
		// (imageStore.ts) to match WebGL's bottom-left UV origin.
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

	function createDataTexture(
		width: number,
		height: number,
		data: Uint8Array,
		filter: "nearest" | "linear" = "linear",
	): Texture2D {
		return regl.texture({
			width,
			height,
			data,
			format: "rgba",
			type: "uint8",
			min: filter,
			mag: filter,
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
		prop: (name) => regl.prop(name as never),
		clear: (opts) =>
			regl.clear(opts as unknown as Parameters<typeof regl.clear>[0]),
		createEffectCommand,
		createScreenCommand,
		createImageTexture,
		createDataTexture,
		createFramebuffer,
		destroy,
	};
}
