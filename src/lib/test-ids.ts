// Shared data-testid constants — single source of truth for components and tests.

// Input components
export const DROPZONE_LANDING = "dropzone-landing";
export const LANDING_FILE_INPUT = "landing-file-input";
export const REPLACE_IMAGE_BUTTON = "replace-image-button";
export const REPLACE_FILE_INPUT = "replace-file-input";
export const DOWNLOAD_BUTTON = "download-button";
export const IMAGE_ERROR = "image-error";

// Effect dev panel
export const EFFECT_DEV_PANEL = "effect-dev-panel";
export const effectSection = (id: string) => `effect-section-${id}`;
export const effectToggle = (id: string) => `effect-toggle-${id}`;
export const paramSlider = (id: string, name: string) =>
	`param-slider-${id}-${name}`;
export const paramValue = (id: string, name: string) =>
	`param-value-${id}-${name}`;
export const paramBool = (id: string, name: string) =>
	`param-bool-${id}-${name}`;
export const paramInt = (id: string, name: string) => `param-int-${id}-${name}`;
export const paramEnum = (id: string, name: string) =>
	`param-enum-${id}-${name}`;
export const paramVec2 = (id: string, name: string) =>
	`param-vec2-${id}-${name}`;
export const paramColor = (id: string, name: string) =>
	`param-color-${id}-${name}`;
