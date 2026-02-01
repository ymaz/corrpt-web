export interface EffectParameterDef {
	name: string;
	type: "float" | "bool";
	default: number | boolean;
	min?: number;
	max?: number;
	step?: number;
	label: string;
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

export type EffectParameterValues = Record<string, number | boolean>;
