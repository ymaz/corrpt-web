// Shared data-testid constants — single source of truth for components and tests.
// Plain JS so both TypeScript (via allowJs) and test scripts can import it.

// Input components
export const DROPZONE_LANDING = "dropzone-landing";
export const LANDING_FILE_INPUT = "landing-file-input";
export const REPLACE_IMAGE_BUTTON = "replace-image-button";
export const REPLACE_FILE_INPUT = "replace-file-input";
export const DOWNLOAD_BUTTON = "download-button";
export const IMAGE_ERROR = "image-error";

// Effect dev panel
export const EFFECT_DEV_PANEL = "effect-dev-panel";
export const effectSection = (id) => `effect-section-${id}`;
export const effectToggle = (id) => `effect-toggle-${id}`;
export const paramSlider = (id, name) => `param-slider-${id}-${name}`;
export const paramValue = (id, name) => `param-value-${id}-${name}`;
export const paramBool = (id, name) => `param-bool-${id}-${name}`;
