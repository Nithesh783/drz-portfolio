import { watch } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import postcssImport from "postcss-import";
import postcssNested from "postcss-nested";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "src/styles/postcss");
const generatedDirectory = path.join(root, "src/styles/generated");

async function buildStylesheet(fileName) {
  const sourcePath = path.join(sourceDirectory, fileName);
  const destinationPath = path.join(generatedDirectory, fileName);
  const source = await readFile(sourcePath, "utf8");
  const result = await postcss([
    postcssImport(),
    postcssNested(),
    autoprefixer(),
  ]).process(source, { from: sourcePath });

  result.root.walkDecls((declaration) => {
    if (declaration.raws.before?.trimEnd().endsWith("*")) {
      declaration.remove();
    }
  });

  await mkdir(generatedDirectory, { recursive: true });
  await writeFile(destinationPath, result.root.toString());
}

async function buildStyles() {
  await buildStylesheet("styles.css");
}

await buildStyles();

if (process.argv.includes("--watch")) {
  let rebuildTimer;
  let rebuilding = false;
  let rebuildQueued = false;

  const rebuild = async () => {
    if (rebuilding) {
      rebuildQueued = true;
      return;
    }

    rebuilding = true;
    do {
      rebuildQueued = false;
      try {
        await buildStyles();
        console.log("Stylesheets rebuilt.");
      } catch (error) {
        console.error("Stylesheet rebuild failed:", error);
      }
    } while (rebuildQueued);
    rebuilding = false;
  };

  watch(sourceDirectory, (_eventType, fileName) => {
    if (fileName && !fileName.toString().endsWith(".css")) {
      return;
    }

    clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(() => void rebuild(), 100);
  });

  console.log(`Watching ${sourceDirectory} for stylesheet changes.`);
}
