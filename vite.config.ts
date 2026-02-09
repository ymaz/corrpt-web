import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

// https://vite.dev/config/
export default defineConfig({
	base: process.env.GITHUB_ACTIONS ? "/corrpt-web/" : "/",
	plugins: [
		react(),
		tailwindcss(),
		glsl({
			include: ["**/*.glsl", "**/*.vert", "**/*.frag"],
			compress: true,
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes("node_modules/three/")) {
						return "vendor-three";
					}
					if (
						id.includes("node_modules/react/") ||
						id.includes("node_modules/react-dom/") ||
						id.includes("node_modules/@react-three/")
					) {
						return "vendor-react";
					}
				},
			},
		},
	},
});
