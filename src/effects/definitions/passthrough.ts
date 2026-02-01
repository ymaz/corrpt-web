import { registerEffect } from "@/effects/registry";
import fragmentShader from "@/effects/shaders/common/passthrough.frag";
import vertexShader from "@/effects/shaders/common/passthrough.vert";
import type { EffectDefinition } from "@/effects/types";

const passthrough: EffectDefinition = {
	id: "passthrough",
	name: "Passthrough",
	category: "color",
	description: "Identity effect — outputs the input unchanged.",
	parameters: [],
	vertexShader,
	fragmentShader,
};

registerEffect(passthrough);
