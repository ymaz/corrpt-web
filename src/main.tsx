import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerEffect } from "@/effects/registry";
import passthroughVert from "@/effects/shaders/common/passthrough.vert";
import type { EffectDefinition } from "@/effects/types";
import { useEffectStore } from "@/store/effectStore";
import "./styles/globals.css";
import App from "./app/App";

// Dev-only test seam. The multi-pass / auxiliary-texture engine paths have no
// product effect that uses them yet, so e2e registers a throwaway effect here
// to drive them through real WebGL. Dead-code-eliminated from production builds.
if (import.meta.env.DEV) {
	(
		window as unknown as {
			__corrpt: {
				passthroughVert: string;
				registerEffect: (def: EffectDefinition) => void;
				addEffect: (id: string) => void;
			};
		}
	).__corrpt = {
		passthroughVert,
		registerEffect,
		addEffect: (id) => useEffectStore.getState().addEffect(id),
	};
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	);
}
