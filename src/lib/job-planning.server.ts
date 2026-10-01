import { createJobDecisionCall } from "./ai/responses.ts";

export async function planJob(directive: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Job planning is unavailable right now.");
  try {
    const result = await createJobDecisionCall(apiKey, directive);
    if (result.agent !== "Oz" && result.agent !== "Brix" && result.agent !== "Lowkey") {
      throw new Error("The job could not be assigned. Please try again.");
    }
    return { agent: result.agent, reason: result.reason.trim().slice(0, 160) || "Best suited to this directive." };
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const status = Number(error.statusCode);
      let message: string | undefined;
      if ("responseBody" in error && typeof error.responseBody === "string") {
        try {
          const body = JSON.parse(error.responseBody);
          message = body?.error?.message ?? body?.message;
        } catch { /* Preserve the status even if the response is not JSON. */ }
      }
      if (status === 402 || status === 403 || status === 400 || status === 404 || status === 429) {
        throw new Error(message || `Job planning is unavailable (${status}).`);
      }
    }
    throw error;
  }
}