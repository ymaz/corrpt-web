import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/crt-v2/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const crtV2: EffectDefinition = {
	id: "crtV2",
	name: "CRT",
	category: "aesthetic",
	description:
		"Analog CRT decay — aperture grille phosphor mask, chroma bleed, Gaussian scanlines, and signal noise.",
	shortDescription: "analog decay",
	parameters: [
		{
			name: "scanlines",
			type: "float",
			default: 0.6,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Scanlines",
		},
		{
			name: "phosphor",
			type: "float",
			default: 0.45,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Phosphor Mask",
		},
		{
			name: "bleed",
			type: "float",
			default: 0.35,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Chroma Bleed",
		},
		{
			name: "degradation",
			type: "float",
			default: 0.25,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Degradation",
		},
		{
			name: "lineCount",
			type: "float",
			default: 280,
			min: 100,
			max: 400,
			step: 10,
			label: "Scanline Count",
		},
		{
			name: "curvature",
			type: "float",
			default: 0.0,
			min: 0,
			max: 0.15,
			step: 0.005,
			label: "Curvature",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(crtV2);
