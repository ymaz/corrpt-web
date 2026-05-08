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
export const effectInstance = (instanceId: string) =>
	`effect-instance-${instanceId}`;
export const effectDuplicate = (instanceId: string) =>
	`effect-duplicate-${instanceId}`;
export const effectRemove = (instanceId: string) =>
	`effect-remove-${instanceId}`;
export const paramSlider = (instanceId: string, name: string) =>
	`param-slider-${instanceId}-${name}`;
export const paramValue = (instanceId: string, name: string) =>
	`param-value-${instanceId}-${name}`;
export const paramBool = (instanceId: string, name: string) =>
	`param-bool-${instanceId}-${name}`;
export const paramInt = (instanceId: string, name: string) =>
	`param-int-${instanceId}-${name}`;
export const paramEnum = (instanceId: string, name: string) =>
	`param-enum-${instanceId}-${name}`;
export const paramVec2 = (instanceId: string, name: string) =>
	`param-vec2-${instanceId}-${name}`;
export const paramColor = (instanceId: string, name: string) =>
	`param-color-${instanceId}-${name}`;
