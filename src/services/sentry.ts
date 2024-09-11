import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

const env = process.env.NODE_ENV;

const version = 1;

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: "https://f1e877cef9573b474a55a4e73889f39d@o4507935073107968.ingest.de.sentry.io/4507935077498960",
  environment: env,
  release: `${env}_${version}`,
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
  ],

  ...(env === "development"
    ? { tracesSampleRate: 1.0, profilesSampleRate: 1.0, debug: true }
    : { tracesSampleRate: 0.1, profilesSampleRate: 0.1, debug: false }),
});

export const logError = Sentry.captureException;

export default Sentry;
