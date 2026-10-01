import { createServerFn } from "@tanstack/react-start";

type Agent = "Oz" | "Brix" | "Lowkey";
const isAgent = (a: unknown): a is Agent => a === "Oz" || a === "Brix" || a === "Lowkey";
const checkDirective = (d: unknown) => {
  if (typeof d !== "string" || !d.trim() || d.length > 180) throw new Error("Enter a job description of up to 180 characters.");
  return d.trim();
};

export const chooseJobRoute = createServerFn({ method: "POST" })
  .inputValidator((input: { directive: string }) => ({ directive: checkDirective(input?.directive) }))
  .handler(async ({ data }) => {
    const { planRoute } = await import("./job-planning.server.ts");
    return planRoute(data.directive);
  });

export const runCrewStep = createServerFn({ method: "POST" })
  .inputValidator((input: { directive: string; agent: Agent; previous: { agent: Agent; result: string }[]; finalReview: boolean }) => {
    if (!isAgent(input?.agent)) throw new Error("Unknown crew member.");
    const previous = Array.isArray(input.previous) ? input.previous.slice(0, 4) : [];
    for (const p of previous) if (!isAgent(p?.agent) || typeof p.result !== "string") throw new Error("Invalid handoff.");
    return { directive: checkDirective(input.directive), agent: input.agent, previous: previous.map(p => ({ agent: p.agent, result: p.result.slice(0, 1500) })), finalReview: input.finalReview === true };
  })
  .handler(async ({ data }) => {
    const { runAgentStep } = await import("./job-planning.server.ts");
    return runAgentStep(data.directive, data.agent, data.previous, data.finalReview);
  });
