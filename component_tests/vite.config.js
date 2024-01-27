import { svelte } from "@sveltejs/vite-plugin-svelte";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		svelte({
			configFile: "../svelte.config.js",
		}),
	],
	publicDir: "component_tests/public",
	root: "component_tests",
	build: {
		target: "es2018",
		outDir: "component_tests/dist",
		minify: false,
		entry: "component_tests/index.html",
	},
	server: {
		fs: {
			strict: false,
		},
		strictPort: true,
	},
	resolve: {
		alias: {
			src: resolve("./src"),
		},
	},
});
