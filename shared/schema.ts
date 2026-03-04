import { z } from "zod";

export const startProjectSchema = z.object({
  brain_dump: z.string().min(1, "Brain dump is required"),
  genre: z.string().min(1, "Genre is required"),
});

export type StartProjectInput = z.infer<typeof startProjectSchema>;
