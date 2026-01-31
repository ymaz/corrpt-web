import { create } from "zustand";

import type { UIStore } from "@/store/types";

export const useUIStore = create<UIStore>((set) => ({
	sidebarOpen: true,
	activeModal: null,
	theme: "dark",

	toggleSidebar: () => {
		set((state) => ({ sidebarOpen: !state.sidebarOpen }));
	},

	openModal: (modal) => {
		set({ activeModal: modal });
	},

	closeModal: () => {
		set({ activeModal: null });
	},

	setTheme: (theme) => {
		set({ theme });
	},
}));
