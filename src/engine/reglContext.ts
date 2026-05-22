import createREGL, {
	type DrawCommand,
	type Framebuffer2D,
	type Regl,
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
	readonly regl: Regl;
	createPassCommand(opts: PassCommandOptions): DrawCommand;
	createImageTexture(bitmap: ImageBitmap): Texture2D;
	createFramebuffer(width: number, height: number): Framebuffer2D;
	destroy(): void;
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

	function createPassCommand(opts: PassCommandOptions): DrawCommand {
		return regl({
			vert: opts.vertexShader,
			frag: FRAGMENT_PRECISION + opts.fragmentShader,
			attributes: { a_position: positionBuffer },
			uniforms: opts.uniforms,
			primitive: "triangle strip",
			count: 4,
			depth: { enable: false },
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
