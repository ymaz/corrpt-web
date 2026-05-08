// Discriminated union for effect parameter definitions
interface BaseParamDef {
	name: string;
	label: string;
}

export interface FloatParamDef extends BaseParamDef {
	type: "float";
	default: number;
	min: number;
	max: number;
	step: number;
}

export interface BoolParamDef extends BaseParamDef {
	type: "bool";
	default: boolean;
}

export interface IntParamDef extends BaseParamDef {
	type: "int";
	default: number;
	min: number;
	max: number;
}

export interface EnumParamDef extends BaseParamDef {
	type: "enum";
	default: string;
	options: { label: string; value: string }[];
}

export interface Vec2ParamDef extends BaseParamDef {
	type: "vec2";
	default: [number, number];
	min?: [number, number];
	max?: [number, number];
	step?: [number, number];
}

export interface ColorParamDef extends BaseParamDef {
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

export interface EffectDefinition {
	id: string;
	name: string;
	category: "distortion" | "color" | "noise" | "aesthetic";
	description: string;
	parameters: EffectParameterDef[];
	vertexShader: string;
	fragmentShader: string;
}
