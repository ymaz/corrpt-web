// Shared data-testid constants — single source of truth for components and tests.

// Input components
export const DROPZONE_LANDING = "dropzone-landing";
export const LANDING_FILE_INPUT = "landing-file-input";
export const REPLACE_IMAGE_BUTTON = "replace-image-button";
export const REPLACE_FILE_INPUT = "replace-file-input";
export const DOWNLOAD_BUTTON = "download-button";
export const IMAGE_ERROR = "image-error";
export const IMAGE_WARNING = "image-warning";

// Effects panel
export const EFFECT_DEV_PANEL = "effect-dev-panel";
export const effectSection = (id: string) => `effect-section-${id}`;
export const effectToggle = (id: string) => `effect-toggle-${id}`;
export const effectInstance = (instanceId: string) =>
	`effect-instance-${instanceId}`;
export const effectDuplicate = (instanceId: string) =>
	`effect-duplicate-${instanceId}`;
export const effectRemove = (instanceId: string) =>
	`effect-remove-${instanceId}`;
export const effectMoveUp = (instanceId: string) =>
	`effect-move-up-${instanceId}`;
export const effectMoveDown = (instanceId: string) =>
	`effect-move-down-${instanceId}`;
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

// Undo / redo
export const UNDO_BUTTON = "undo-button";
export const REDO_BUTTON = "redo-button";

// Presets
export const PRESETS_PANEL = "presets-panel";
export const PRESET_NAME_INPUT = "preset-name-input";
export const PRESET_SAVE_BUTTON = "preset-save-button";
export const presetItem = (id: string) => `preset-item-${id}`;
export const presetApply = (id: string) => `preset-apply-${id}`;
export const presetRename = (id: string) => `preset-rename-${id}`;
export const presetDelete = (id: string) => `preset-delete-${id}`;

// Export modal
export const EXPORT_OPEN_BUTTON = "export-open-button";
export const EXPORT_DIALOG = "export-dialog";
export const EXPORT_FORMAT_SELECT = "export-format-select";
export const EXPORT_QUALITY_SLIDER = "export-quality-slider";
export const EXPORT_QUALITY_VALUE = "export-quality-value";
export const EXPORT_CONFIRM_BUTTON = "export-confirm-button";
export const EXPORT_CANCEL_BUTTON = "export-cancel-button";
