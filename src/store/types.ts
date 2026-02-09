import type * as THREE from "three";

import type { EffectParameterValue } from "@/effects/types";

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
	originalUrl: string | null;
	fileName: string | null;
	mimeType: string | null;
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
	parameters: Record<string, Record<string, EffectParameterValue>>;
	previewMode: PreviewMode;
}

export interface EffectActions {
	addEffect: (id: string) => void;
	removeEffect: (id: string) => void;
	setEffectParam: (
		effectId: string,
		paramName: string,
		value: EffectParameterValue,
	) => void;
	reorderEffects: (effectIds: string[]) => void;
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
