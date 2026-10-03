import { createServerFn } from "@tanstack/react-start";

type Agent = "Oz" | "Brix" | "Lowkey";
const isAgent = (a: unknown): a is Agent => a === "Oz" || a === "Brix" || a === "Lowkey";
export const getCanonState = createServerFn({ method: "GET" }).handler(async () => {
  const { STORY_STAGE, UNLOCKED_ZONES, CODEX_PAGES } = await import("./ai/canon-state.server.ts");
  return { stage: STORY_STAGE.number, stageLabel: STORY_STAGE.label, stageSummary: STORY_STAGE.summary, unlockedZones: UNLOCKED_ZONES, codexPages: CODEX_PAGES };
});

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
  .inputValidator((input: { directive: string; agent: Agent; previous: { agent: Agent; result: string }[]; finalReview: boolean; group?: boolean; story?: string }) => {
    if (!isAgent(input?.agent)) throw new Error("Unknown crew member.");
    const previous = Array.isArray(input.previous) ? input.previous.slice(0, 4) : [];
    for (const p of previous) if (!isAgent(p?.agent) || typeof p.result !== "string") throw new Error("Invalid handoff.");
    return { directive: checkDirective(input.directive), agent: input.agent, previous: previous.map(p => ({ agent: p.agent, result: p.result.slice(0, 1500) })), finalReview: input.finalReview === true, group: input.group === true, story: typeof input.story === "string" ? input.story.slice(0, 400) : "" };
  })
  .handler(async ({ data }) => {
    const { runAgentStep } = await import("./job-planning.server.ts");
    return runAgentStep(data.story ? `${data.directive}\n\n(Scene right now: ${data.story} Weave this in briefly and naturally, in your own voice.)` : data.directive, data.agent, data.previous, data.finalReview, data.group);
  });
