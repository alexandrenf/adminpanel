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
      // Regex to capture fileId and optionally gid
      // Using new RegExp to avoid escaping issues with slashes in literals
      const regex = new RegExp("\\/d\\/([a-zA-Z0-9-_]+)(?:\\/edit.*?[#&]?gid=([0-9]+))?");
      const match = input.url.match(regex);

      if (!match || !match[1]) { // Ensure fileId is captured
        throw new Error("Invalid Google Drive URL. Could not extract File ID.");
      }
      const fileId = match[1];
      const gid = match[2]; // gid is optional, captured in group 2

      let csvUrl = `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
      if (gid) {
        csvUrl += `&gid=${gid}`;
      }
      
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