import path from "path";
import tsconfig from "./tsconfig.json";
import fs from "fs";
import fsAsync from "fs/promises";
import http from "https";
import { exec } from "child_process";

import { build } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

import manifest from "./src/obsidian/plugin/manifest";
import versions from "./src/obsidian/plugin/versions";

const dev = process.argv[2] === "dev";

const manifestJSON = JSON.stringify(manifest, null, "\t");

process.env.NODE_ENV = dev ? "development" : "production";

const fullOutput = await build({
	mode: process.env.NODE_ENV,
	plugins: [
		svelte({
			compilerOptions: {
				dev,
			},
		}),
	],
	build: {
		write: false,
		lib: {
			entry: "src/obsidian/plugin/main.ts",
			formats: ["cjs"],
		},
		minify: !dev,
		target: tsconfig.compilerOptions.target,
		rollupOptions: {
			external: ["obsidian"],
			output: {
				globals: {
					obsidian: "obsidian",
				},
			},
		},
	},
	resolve: {
		alias: {
			src: path.resolve("./src"),
		},
	},
});

async function write(path: string, content: string) {
	console.log("writing", path);
	await fsAsync.writeFile(path, content, {
		encoding: "utf-8",
	});
}

function download(url: string, path: string, redirectCount = 0) {
	if (redirectCount > 5) {
		throw new Error(`Too many redirects for ${url}`);
	}
	return new Promise<void>((resolve, reject) => {
		if (redirectCount === 0) {
			console.log("downloading", url, "to", path);
		}
		http.get(
			url,
			{
				headers: {},
			},
			(res) => {
				if (res.statusCode === 302 || res.statusCode === 301) {
					// Follow the redirect
					const newUrl = res.headers.location;
					if (!newUrl) {
						return reject(
							new Error(
								`Redirect response received but no location header: ${url}`
							)
						);
					}
					download(newUrl, path, redirectCount + 1).then(
						resolve,
						reject
					);
					return;
				}

				if (res.statusCode !== 200) {
					reject(`Failed to download ${url}: ${res.statusCode}`);
					return;
				}
				const file = fs.createWriteStream(path);
				res.pipe(file);
				file.on("finish", resolve);
				file.on("error", reject);
			}
		);
	});
}

if (Array.isArray(fullOutput)) {
	const testVaultPath = "testVault";
	let dirPath = ".";
	const writes: Promise<void>[] = [];
	if (dev) {
		dirPath = testVaultPath + "/.obsidian/plugins/timeline-view";
		if (fs.mkdirSync(dirPath, { recursive: true })) {
			console.log("created test vault directory at ", dirPath);
		}

		// hot-reload includes main.js and manifest.json in the root dir, so we can just copy it
		if (!fs.existsSync(`${testVaultPath}/.obsidian/plugins/hot-reload`)) {
			console.log("retrieving hot-reload plugin");
			fs.cpSync(
				"node_modules/hot-reload",
				`${testVaultPath}/.obsidian/plugins/hot-reload`,
				{ recursive: true }
			);
		}

		// style settings doesn't include main.js or styles.css in the root dir, so we have to get it from the release
		// page
		if (
			!fs.existsSync(
				`${testVaultPath}/.obsidian/plugins/obsidian-style-settings`
			)
		) {
			console.log("retrieving style-settings plugin");
			fs.mkdirSync(
				`${testVaultPath}/.obsidian/plugins/obsidian-style-settings`,
				{ recursive: true }
			);

			const styleSettingsJSON = JSON.parse(
				fs.readFileSync(
					`node_modules/obsidian-style-settings/manifest.json`,
					{ encoding: "utf-8" }
				)
			);
			const githubLink = styleSettingsJSON.authorUrl;
			writes.push(
				download(
					`${githubLink}/releases/download/${styleSettingsJSON.version}/main.js`,
					`${testVaultPath}/.obsidian/plugins/obsidian-style-settings/main.js`
				)
			);
			writes.push(
				download(
					`${githubLink}/releases/download/${styleSettingsJSON.version}/styles.css`,
					`${testVaultPath}/.obsidian/plugins/obsidian-style-settings/styles.css`
				)
			);
			writes.push(
				write(
					`${testVaultPath}/.obsidian/plugins/obsidian-style-settings/manifest.json`,
					JSON.stringify(styleSettingsJSON)
				)
			);
		}

		writes.push(
			write(`${dirPath}/manifest.json`, manifestJSON),
			write(`${dirPath}/.hotreload`, ""),
			write(
				`${testVaultPath}/.obsidian/community-plugins.json`,
				JSON.stringify([
					process.env.npm_package_name,
					"hot-reload",
					"obsidian-style-settings",
				])
			)
		);
	} else {
		writes.push(
			write(`${dirPath}/manifest.json`, manifestJSON),
			write(
				`${dirPath}/versions.json`,
				JSON.stringify(versions, null, "\t")
			)
		);
	}

	for (let i = 0; i < fullOutput.length; i++) {
		for (const chunk of fullOutput[i].output) {
			if (chunk.type === "chunk") {
				let code = chunk.code;
				if (dev) {
					// fix svelte bug
					code = code.replace(
						`typeof value === "object" && STATE_SYMBOL in value`,
						`typeof value === "object" && value !== null && STATE_SYMBOL in value`
					);
				}
				writes.push(write(`${dirPath}/main.js`, code));
			} else if (
				chunk.type === "asset" &&
				typeof chunk.source === "string"
			) {
				writes.push(write(`${dirPath}/styles.css`, chunk.source));
			}
		}
	}

	await Promise.all(writes);

	if (!dev) {
		exec("git add manifest.json versions.json");
	} else {
		exec(
			`start "" "obsidian://open?path=${process.cwd()}/${testVaultPath}"`
		);
	}
}
