import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const registrosRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    const registros = await ctx.db.registros.findFirst({
      include: {
        updatedBy: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    return registros;
  }),

  update: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Format Google Drive URL to CSV format
      const match = input.url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error("Invalid Google Drive URL");
      }
      const fileId = match[1];
      const csvUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;

      // Update or create the record
      const registros = await ctx.db.registros.upsert({
        where: { id: 1 }, // We'll only have one record
        create: {
          url: csvUrl,
          updatedById: userId,
        },
        update: {
          url: csvUrl,
          updatedById: userId,
        },
        include: {
          updatedBy: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      return registros;
    }),
}); 