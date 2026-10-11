import { OTLPHttpProtoTraceExporter } from "@vercel/otel";
import { disableInstrumentation } from "eve/instrumentation";
import { otelIntegration } from "eve/instrumentation/otel";

const apiKey = process.env.NEATLOGS_API_KEY;

export default apiKey
  ? otelIntegration({
      traceExporter: new OTLPHttpProtoTraceExporter({
        url: "https://ingest.neatlogs.com/v1/traces",
        headers: { "x-api-key": apiKey },
      }),
    })
  : disableInstrumentation();
