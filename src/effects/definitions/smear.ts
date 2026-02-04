import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/smear/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const smear: EffectDefinition = {
	id: "smear",
	name: "Smear",
	category: "distortion",
	description: "Brightness-based pixel stretching — datamosh approximation.",
	parameters: [
		{
			name: "intensity",
			type: "float",
			default: 0.2,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Intensity",
		},
		{
			name: "threshold",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Threshold",
		},
		{
			name: "falloff",
			type: "float",
			default: 0.5,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Falloff",
		},
		{
			name: "seed",
			type: "float",
			default: 0,
			min: 0,
			max: 1000,
			step: 1,
			label: "Seed",
		},
		{
			name: "vertical",
			type: "bool",
			default: false,
			label: "Vertical",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(smear);
