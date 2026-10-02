import { createAgentStepCall, createRouteCall } from "./ai/responses.ts";

export type Agent = "Oz" | "Brix" | "Lowkey";
const isAgent = (a: string): a is Agent => a === "Oz" || a === "Brix" || a === "Lowkey";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Job planning is unavailable right now.");
  return key;
}

async function guarded<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof Error && "statusCode" in error) {
      const status = Number(error.statusCode);
      let message: string | undefined;
      if ("responseBody" in error && typeof error.responseBody === "string") {
        try {
          const body = JSON.parse(error.responseBody);
          message = body?.error?.message ?? body?.message;
        } catch { /* keep status */ }
      }
      if ([400, 402, 403, 404, 429].includes(status)) throw new Error(message || `The crew is unavailable (${status}).`);
    }
    throw error;
  }
}

const ZONE_IDS = ["sanctuary", "ruins", "caves", "cronk", "shelton"] as const;
type ZoneId = (typeof ZONE_IDS)[number];
const isZone = (z: string): z is ZoneId => (ZONE_IDS as readonly string[]).includes(z);

export function planRoute(directive: string) {
  return guarded(async () => {
    const result = await createRouteCall(apiKey(), directive);
    const route: Agent[] = [];
    for (const a of result.route) {
      if (!isAgent(a) || route.at(-1) === a) continue;
      route.push(a);
      if (route.length === 4) break;
    }
    if (!route.length) route.push("Oz");
    return {
      route,
      zone: isZone(result.zone) ? result.zone : "sanctuary",
      group: result.group === true,
      reason: result.reason.trim().slice(0, 160) || "Best suited to this directive.",
    };
  });
}

export function runAgentStep(directive: string, agent: Agent, previous: { agent: Agent; result: string }[], isFinalReview: boolean, group = false) {
  return guarded(async () => {
    const r = await createAgentStepCall(apiKey(), directive, agent, previous, isFinalReview, group);
    const verdict: "pass" | "conflict" | "n/a" = agent === "Lowkey" && !isFinalReview ? (r.verdict.toLowerCase().includes("conflict") ? "conflict" : "pass") : "n/a";
    return { activity: r.activity.trim().slice(0, 100) || "Working on the directive.", result: r.result.trim().slice(0, 1400), verdict };
  });
}
