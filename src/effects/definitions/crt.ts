import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/crt/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const crt: EffectDefinition = {
	id: "crt",
	name: "CRT",
	category: "aesthetic",
	description:
		"Simulates retro CRT monitor with scanlines, curvature, and vignette.",
	parameters: [
		{
			name: "lineIntensity",
			type: "float",
			default: 0.3,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Scanline Intensity",
		},
		{
			name: "lineCount",
			type: "float",
			default: 300,
			min: 100,
			max: 800,
			step: 10,
			label: "Scanline Count",
		},
		{
			name: "curvature",
			type: "float",
			default: 0,
			min: 0,
			max: 0.5,
			step: 0.01,
			label: "Screen Curvature",
		},
		{
			name: "vignette",
			type: "float",
			default: 0.3,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Vignette",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(crt);
