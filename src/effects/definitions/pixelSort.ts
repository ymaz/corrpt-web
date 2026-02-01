import { registerEffect } from "@/effects/registry";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import fragmentShader from "@/effects/shaders/pixel-sort/fragment.glsl";
import type { EffectDefinition } from "@/effects/types";

const pixelSort: EffectDefinition = {
	id: "pixelSort",
	name: "Pixel Sort",
	category: "aesthetic",
	description:
		"GPU-friendly pixel sorting approximation using brightness threshold and directional blur.",
	parameters: [
		{
			name: "threshold",
			type: "float",
			default: 0.25,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Threshold",
		},
		{
			name: "upperThreshold",
			type: "float",
			default: 0.75,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Upper Threshold",
		},
		{
			name: "spread",
			type: "float",
			default: 0.02,
			min: 0,
			max: 0.1,
			step: 0.001,
			label: "Spread",
		},
		{
			name: "direction",
			type: "float",
			default: 0.0,
			min: 0,
			max: 1,
			step: 0.01,
			label: "Direction",
		},
	],
	vertexShader,
	fragmentShader,
};

registerEffect(pixelSort);
