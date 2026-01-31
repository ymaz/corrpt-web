import type * as THREE from "three";

// Shared type aliases
export type PreviewMode = "split" | "full" | "compare";
export type ModalType = "export" | "camera" | "source";
export type Theme = "dark" | "light";

export interface ImageDimensions {
	width: number;
	height: number;
}

// Image store
export interface ImageState {
	texture: THREE.Texture | null;
	dimensions: ImageDimensions | null;
	originalDataUrl: string | null;
	isLoading: boolean;
	error: string | null;
}

export interface ImageActions {
	loadImage: (file: File) => void;
	clearImage: () => void;
}

export type ImageStore = ImageState & ImageActions;

// Effect store
export interface EffectState {
	activeEffects: string[];
	parameters: Record<string, Record<string, number | boolean | string>>;
	previewMode: PreviewMode;
}

export interface EffectActions {
	addEffect: (id: string) => void;
	removeEffect: (id: string) => void;
	setEffectParam: (
		effectId: string,
		paramName: string,
		value: number | boolean | string,
	) => void;
	setPreviewMode: (mode: PreviewMode) => void;
}

export type EffectStore = EffectState & EffectActions;

// UI store
export interface UIState {
	sidebarOpen: boolean;
	activeModal: ModalType | null;
	theme: Theme;
}

export interface UIActions {
	toggleSidebar: () => void;
	openModal: (modal: ModalType) => void;
	closeModal: () => void;
	setTheme: (theme: Theme) => void;
}

export type UIStore = UIState & UIActions;
