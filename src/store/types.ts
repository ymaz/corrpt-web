import type { EffectInstance, EffectParameterValue } from "@/effects/types";

// Shared type aliases
type PreviewMode = "split" | "full" | "compare";
type ModalType = "export" | "camera" | "source";
type Theme = "dark" | "light";

interface ImageDimensions {
	width: number;
	height: number;
}

// Image store
interface ImageState {
	bitmap: ImageBitmap | null;
	dimensions: ImageDimensions | null;
	originalUrl: string | null;
	fileName: string | null;
	mimeType: string | null;
	isLoading: boolean;
	error: string | null;
	warning: string | null;
}

interface ImageActions {
	loadImage: (file: File) => void;
	clearImage: () => void;
}

export type ImageStore = ImageState & ImageActions;

// Effect store
interface EffectState {
	effects: EffectInstance[];
	previewMode: PreviewMode;
	canUndo: boolean;
	canRedo: boolean;
}

interface EffectActions {
	addEffect: (effectId: string) => void;
	removeEffect: (instanceId: string) => void;
	removeEffectsByEffectId: (effectId: string) => void;
	setEffectParam: (
		instanceId: string,
		paramName: string,
		value: EffectParameterValue,
	) => void;
	reorderEffects: (instanceIds: string[]) => void;
	duplicateEffect: (instanceId: string) => void;
	setPreviewMode: (mode: PreviewMode) => void;
	// Replaces the whole stack with fresh instanceIds — used by preset application.
	applyEffects: (effects: EffectInstance[]) => void;
	undo: () => void;
	redo: () => void;
}

export type EffectStore = EffectState & EffectActions;

// Preset store
export interface Preset {
	id: string;
	name: string;
	createdAt: number;
	effects: EffectInstance[];
}

interface PresetState {
	presets: Preset[];
}

interface PresetActions {
	savePreset: (name: string) => void;
	applyPreset: (id: string) => void;
	renamePreset: (id: string, name: string) => void;
	deletePreset: (id: string) => void;
}

export type PresetStore = PresetState & PresetActions;

// UI store
interface UIState {
	sidebarOpen: boolean;
	activeModal: ModalType | null;
	theme: Theme;
}

interface UIActions {
	toggleSidebar: () => void;
	openModal: (modal: ModalType) => void;
	closeModal: () => void;
	setTheme: (theme: Theme) => void;
}

export type UIStore = UIState & UIActions;
