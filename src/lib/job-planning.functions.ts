import { createServerFn } from "@tanstack/react-start";

export const chooseJobAgent = createServerFn({ method: "POST" })
  .inputValidator((input: { directive: string }) => {
    if (typeof input?.directive !== "string" || !input.directive.trim() || input.directive.length > 180) {
      throw new Error("Enter a job description of up to 180 characters.");
    }
    return { directive: input.directive.trim() };
  })
  .handler(async ({ data }) => {
    const { planJob } = await import("./job-planning.server.ts");
    return planJob(data.directive);
  });