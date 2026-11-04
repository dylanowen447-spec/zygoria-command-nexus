import { createFileRoute } from "@tanstack/react-router";

import { checkFreeTalkInput } from "@/lib/free-talk";

/** Free Talk: an optional off-script chat with one Zig. Read-only — it never writes story, quest or world state. */
export const Route = createFileRoute("/api/public/free-talk")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const { agent, said, scene } = checkFreeTalkInput(body ?? {});
          const key = process.env["LOVABLE_API_KEY"];
          if (!key) return Response.json({ error: "They can't hear you right now." }, { status: 503 });
          const { createFreeTalkCall } = await import("@/lib/ai/responses");
          const { reply } = await createFreeTalkCall(key, agent, said, scene);
          return Response.json({ reply: String(reply).slice(0, 300) });
        } catch (error) {
          return Response.json({ error: error instanceof Error ? error.message : "They didn't catch that." }, { status: 400 });
        }
      },
    },
  },
});
