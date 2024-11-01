import { BuildOptions, PluginOption, UserConfig, defineConfig } from "vite";
import builtins from "builtin-modules";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import manifest from "./src/obsidian/build/manifest";
import versions from "./src/obsidian/build/versions";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "fs";
import { initializeTestVault } from "./e2e/obsidian/runner";
import { exec } from "child_process";
import { resolve } from "path";

function config(
	buildOverrides: Partial<BuildOptions> & { outDir: string },
	additionalPlugins: PluginOption[] = [],
): UserConfig {
	return {
		plugins: [
			svelte({
				onwarn(warning, defaultHandler) {
					console.warn(warning);
				},
			}),
			{
				name: "obsidianNamingConventions",
				closeBundle() {
					const stylePath = `${buildOverrides.outDir}/style.css`;
					if (existsSync(stylePath)) {
						renameSync(stylePath, `${buildOverrides.outDir}/styles.css`);
					}
				},
			},
			...additionalPlugins,
		],
		build: {
			lib: {
				entry: "src/main.ts",
				formats: ["cjs"],
				name: "Timeline-View",
				fileName(format, entryName) {
					return `main.js`;
				},
			},
			target: "es2018",
			minify: false,
			cssMinify: false,
			rollupOptions: {
				external: [
					"obsidian",
					"electron",
					"@codemirror/autocomplete",
					"@codemirror/collab",
					"@codemirror/commands",
					"@codemirror/language",
					"@codemirror/lint",
					"@codemirror/search",
					"@codemirror/state",
					"@codemirror/view",
					"@lezer/common",
					"@lezer/highlight",
					"@lezer/lr",
					...builtins,
				],
				output: {
					globals: {
						obsidian: "obsidian",
					},
				},
			},

			...buildOverrides,
		},
		resolve: {
			alias: {
				src: resolve("./src"),
			},
		},
	};
}

function generatePluginJson(directory: string) {
	if (!existsSync(directory)) {
		mkdirSync(directory, { recursive: true });
	}
	writeFileSync(`${directory}/manifest.json`, JSON.stringify(manifest, undefined, "\n  "));
	writeFileSync(`${directory}/versions.json`, JSON.stringify(versions, undefined, "\n  "));
}

function productionBuild() {
	const outDir = ".";
	generatePluginJson(outDir);

	return config({
		outDir,
		emptyOutDir: false,
	});
}

function developmentBuild() {
	const testVaultDir = "./testVault";
	const testVaultObsidianDir = `${testVaultDir}/.obsidian`;
	const outDir = `${testVaultObsidianDir}/plugins/${manifest.id}`;
	initializeTestVault(testVaultObsidianDir);
	generatePluginJson(outDir);

	let firstBuild = true;

	return config(
		{
			sourcemap: "inline",
			outDir,
		},
		[
			{
				name: "obsidianTestVault",
				closeBundle() {
					initializeTestVault(testVaultObsidianDir);
					generatePluginJson(outDir);

					const vaultDir = testVaultDir.slice(2);
					// TODO: OS selection
					exec(`start "" "obsidian://open?path=${process.cwd()}/${vaultDir}"`);

					if (!firstBuild) {
						writeFileSync(`${process.cwd()}/${vaultDir}/___reload.md`, "");

						// TODO: OS selection
						exec(`start "" "obsidian://open?vault=testVault&file=___reload"`);
					}

					firstBuild = false;
				},
			},
		],
	);
}

// https://vitejs.dev/config/
export default defineConfig((env) => {
	if (env.mode === "production") {
		return productionBuild();
	}
	return developmentBuild();
});
