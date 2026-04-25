import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

const currentFile = fileURLToPath(import.meta.url);
const serverDir = path.dirname(currentFile);
const repoRoot = path.resolve(serverDir, "..");

for (const envPath of [path.join(repoRoot, ".env"), path.join(serverDir, ".env")]) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}
