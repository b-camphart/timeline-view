import fs from "fs";
import path from "path";

export default {
	id: "timeline-view",
	name: "Timeline View",
	version: process.env.npm_package_version ?? "1.0.0",
	minAppVersion: JSON.parse(
		fs.readFileSync(
			fs.realpathSync(
				path.resolve("node_modules", "obsidian", "package.json")
			),
			{
				encoding: "utf-8",
			}
		)
	).version,
	description:
		"Display your obsidian notes in a timeline, based on a given property.",
	author: "b-camphart",
	authorUrl: "https://github.com/b-camphart",
	fundingUrl: "https://buymeacoffee.com/b.camphart",
	isDesktopOnly: true,
} as const;
