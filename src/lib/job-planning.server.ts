import { createJobDecisionCall } from "./ai/responses.ts";

export async function planJob(directive: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("Job planning is unavailable right now.");
  try {
    const result = await createJobDecisionCall(apiKey, directive);
    type Agent = "Oz" | "Brix" | "Lowkey";
    const steps: { agent: Agent; activity: string; result: string }[] = [];
    for (const step of result.steps) {
      if (step.agent !== "Oz" && step.agent !== "Brix" && step.agent !== "Lowkey") continue;
      const agent: Agent = step.agent;
      if (steps.at(-1)?.agent === agent) continue;
      steps.push({ agent, activity: step.activity.trim().slice(0, 100) || "Working on the directive.", result: step.result.trim().slice(0, 900) });
      if (steps.length === 3) break;
    }
    if (!steps.length) throw new Error("The job could not be assigned. Please try again.");
    return { agent: steps[0]!.agent, steps, reason: result.reason.trim().slice(0, 160) || "Best suited to this directive." };
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