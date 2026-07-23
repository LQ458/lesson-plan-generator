import { fileURLToPath } from "node:url";
import { config as loadEnvironment } from "dotenv";
import { createApp } from "./app.js";
import { readRuntimeConfig } from "./config.js";
import { consoleLogger } from "./logger.js";

loadEnvironment({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true
});

const runtimeConfig = readRuntimeConfig();
const app = createApp(runtimeConfig);

app.listen(runtimeConfig.port, "127.0.0.1", () => {
  consoleLogger.info("server.started", {
    port: runtimeConfig.port,
    retrievalMode: runtimeConfig.ragMode,
    generationMode: runtimeConfig.generationMode
  });
});
