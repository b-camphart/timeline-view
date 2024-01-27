import { exec } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

let testFilePath = process.argv[2];
console.log("received", process.argv);

if (!testFilePath) {
	console.error("Error: Please provide the path to the test file.");
	process.exit(1);
}

// Read the index.html template
const runnerScriptPath = path.join(
	process.cwd(),
	"component_tests",
	"runner.ts",
);
let runnerScript = "";

try {
	runnerScript = readFileSync(runnerScriptPath, "utf-8");
} catch (error) {
	console.error(`Error reading ${runnerScriptPath}: ${error.message}`);
	process.exit(1);
}

// Update index.html with the test file script tag
const updatedRunnerScript = runnerScript.replace(
	/import test from ".*?"/,
	`import test from "${testFilePath}"`,
);

// Write the updated index.html content back
try {
	writeFileSync(runnerScriptPath, updatedRunnerScript, "utf-8");
} catch (error) {
	console.error(`Error writing ${runnerScriptPath}: ${error.message}`);
	process.exit(1);
}

const vite = exec("npm run dev:component")
vite.stdout.pipe(process.stdout)
vite.stdin.pipe(process.stdin)