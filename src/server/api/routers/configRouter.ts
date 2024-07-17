import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

export const configRouter = createTRPCRouter({

  get: protectedProcedure
    .query(async ({ ctx }) => {
      return ctx.db.config.findMany();
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      toggleDate: z.boolean().optional(),
      dateStart: z.string().optional(),
      dateEnd: z.string().optional(),
      toggleMessage: z.boolean().optional(),
      message: z.string().optional(),
      toggleButton: z.boolean().optional(),
      buttonText: z.string().optional(),
      buttonUrl: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.config.update({
        where: { id: input.id },
        data: {
          toggleDate: input.toggleDate,
          dateStart: input.dateStart ? new Date(input.dateStart) : undefined,
          dateEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
          toggleMessage: input.toggleMessage,
          message: input.message,
          toggleButton: input.toggleButton,
          buttonText: input.buttonText,
          buttonUrl: input.buttonUrl,
          title: input.title,
        },
      })
    }),
});

