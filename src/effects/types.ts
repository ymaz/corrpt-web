// Discriminated union for effect parameter definitions
interface BaseParamDef {
	name: string;
	label: string;
}

interface FloatParamDef extends BaseParamDef {
	type: "float";
	default: number;
	min: number;
	max: number;
	step: number;
}

interface BoolParamDef extends BaseParamDef {
	type: "bool";
	default: boolean;
}

interface IntParamDef extends BaseParamDef {
	type: "int";
	default: number;
	min: number;
	max: number;
}

interface EnumParamDef extends BaseParamDef {
	type: "enum";
	default: string;
	options: { label: string; value: string }[];
}

interface Vec2ParamDef extends BaseParamDef {
	type: "vec2";
	default: [number, number];
	min?: [number, number];
	max?: [number, number];
	step?: [number, number];
}

interface ColorParamDef extends BaseParamDef {
	type: "color";
	default: [number, number, number];
}

export type EffectParameterDef =
	| FloatParamDef
	| BoolParamDef
	| IntParamDef
	| EnumParamDef
	| Vec2ParamDef
	| ColorParamDef;

export type EffectParameterValue =
	| number
	| boolean
	| string
	| [number, number]
	| [number, number, number];

export type EffectParameterValues = Record<string, EffectParameterValue>;

export interface EffectInstance {
	instanceId: string;
	effectId: string;
	enabled: boolean;
	parameters: EffectParameterValues;
}

/**
 * A static auxiliary texture (LUT, mask, noise table, …) made available to an
 * effect's shaders as the `sampler2D` uniform `u_<name>`. The texture is built
 * once from RGBA8 `data` and cached for the life of the GL context. A pass only
 * receives the uniform if its shader source references `u_<name>`, so passes
 * that don't use a given texture incur no binding.
 */
export interface EffectTextureDef {
	name: string;
	width: number;
	height: number;
	/** RGBA8 pixels, length `width * height * 4`. Function form is evaluated once. */
	data: Uint8Array | (() => Uint8Array);
	/** Sampling filter. Default `"linear"`; use `"nearest"` for LUTs. */
	filter?: "nearest" | "linear";
}

/**
 * One GPU pass within a multi-pass effect. Passes ping-pong through scratch
 * framebuffers; the final pass writes the effect's output.
 */
export interface EffectPass {
	fragmentShader: string;
	/** Defaults to the effect's `vertexShader`. */
	vertexShader?: string;
	/**
	 * What `u_texture` samples:
	 *  - `"previous"` (default): the prior pass's output, or the effect's input
	 *    on the first pass.
	 *  - `"source"`: the effect's input texture (the previous effect's output).
	 *
	 * Any pass may additionally sample the effect's input via `u_source` simply
	 * by declaring `uniform sampler2D u_source;` — e.g. a final composite pass
	 * that blends a processed buffer back over the original.
	 */
	input?: "previous" | "source";
}

export interface EffectDefinition {
	id: string;
	name: string;
	category: "distortion" | "color" | "noise" | "aesthetic";
	description: string;
	shortDescription?: string;
	parameters: EffectParameterDef[];
	/** Auxiliary sampler2D inputs bound as `u_<name>`. */
	textures?: EffectTextureDef[];
	/** Shared default vertex shader for every pass. */
	vertexShader: string;
	/** Single-pass fragment shader. Ignored when `passes` is provided. */
	fragmentShader: string;
	/** Optional multi-pass pipeline; overrides `fragmentShader` when present. */
	passes?: EffectPass[];
}
