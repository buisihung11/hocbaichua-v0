import dotenv from "@dotenvx/dotenvx";
import { defineConfig } from "@trigger.dev/sdk";

// Load environment variables
dotenv.config({ path: "../../apps/server/.env" });

export default defineConfig({
  project: "proj_lsvsetmpvfcnewfnyzeu",
  dirs: ["./src/trigger"],
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10_000,
      factor: 2,
      randomize: true,
    },
  },
  maxDuration: 3600,
});
