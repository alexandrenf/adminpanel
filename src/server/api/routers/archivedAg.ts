import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { isIfmsaEmail } from "~/server/lib/authcheck";

export const archivedAgRouter = createTRPCRouter({
  // Get all archived assemblies
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const user = ctx.session.user;
      
      // Check if user has IFMSA email
      if (!isIfmsaEmail(user.email)) {
        throw new Error("Access denied. IFMSA email required.");
      }

      return await ctx.db.archivedAssembly.findMany({
        include: {
          archivedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              participants: true,
              registrations: true,
              modalities: true,
            },
          },
        },
        orderBy: {
          archivedAt: 'desc',
        },
      });
    }),

  // Get archived assembly by ID with all related data
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      
      // Check if user has IFMSA email
      if (!isIfmsaEmail(user.email)) {
        throw new Error("Access denied. IFMSA email required.");
      }

      return await ctx.db.archivedAssembly.findUnique({
        where: { id: input.id },
        include: {
          archivedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          participants: {
            orderBy: [
              { type: 'asc' },
              { name: 'asc' },
            ],
          },
          registrations: {
            include: {
              modality: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
            orderBy: {
              registeredAt: 'desc',
            },
          },
          modalities: {
            orderBy: {
              displayOrder: 'asc',
            },
          },
          configSnapshot: true,
        },
      });
    }),

  // Get archived assembly statistics
  getStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      
      // Check if user has IFMSA email
      if (!isIfmsaEmail(user.email)) {
        throw new Error("Access denied. IFMSA email required.");
      }

      const counts = await ctx.db.archivedAssembly.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: {
              participants: true,
              registrations: true,
              modalities: true,
            },
          },
        },
      });

      if (!counts) {
        throw new Error("Archived assembly not found");
      }

      // Get registration status breakdown
      const registrationStats = await ctx.db.archivedAGRegistration.groupBy({
        by: ['status'],
        where: { assemblyId: input.id },
        _count: true,
      });

      // Get participant type breakdown
      const participantStats = await ctx.db.archivedAGParticipant.groupBy({
        by: ['type'],
        where: { assemblyId: input.id },
        _count: true,
      });

      return {
        totalParticipants: counts._count.participants,
        totalRegistrations: counts._count.registrations,
        totalModalities: counts._count.modalities,
        registrationsByStatus: Object.fromEntries(
          registrationStats.map(stat => [stat.status, stat._count])
        ),
        participantsByType: Object.fromEntries(
          participantStats.map(stat => [stat.type, stat._count])
        ),
      };
    }),

  // Delete archived assembly permanently
  delete: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      confirmationText: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.session.user;
      
      // Check if user has IFMSA email
      if (!isIfmsaEmail(user.email)) {
        throw new Error("Access denied. IFMSA email required.");
      }

      // Get the archived assembly to verify confirmation text
      const archivedAssembly = await ctx.db.archivedAssembly.findUnique({
        where: { id: input.id },
        select: { name: true },
      });

      if (!archivedAssembly) {
        throw new Error("Archived assembly not found");
      }

      if (input.confirmationText !== archivedAssembly.name) {
        throw new Error("Confirmation text does not match assembly name");
      }

      // Delete the archived assembly (cascading deletes will handle related data)
      await ctx.db.archivedAssembly.delete({
        where: { id: input.id },
      });

      return {
        message: `Archived assembly "${archivedAssembly.name}" has been permanently deleted`,
        deletedAssemblyName: archivedAssembly.name,
      };
    }),

  // Search archived assemblies
  search: protectedProcedure
    .input(z.object({
      query: z.string().optional(),
      type: z.enum(["AG", "AGE"]).optional(),
      year: z.number().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const user = ctx.session.user;
      
      // Check if user has IFMSA email
      if (!isIfmsaEmail(user.email)) {
        throw new Error("Access denied. IFMSA email required.");
      }

      const whereConditions: any = {};

      if (input.query) {
        whereConditions.OR = [
          { name: { contains: input.query } },
          { location: { contains: input.query } },
          { description: { contains: input.query } },
        ];
      }

      if (input.type) {
        whereConditions.type = input.type;
      }

      if (input.year) {
        const startOfYear = new Date(input.year, 0, 1);
        const endOfYear = new Date(input.year + 1, 0, 1);
        whereConditions.startDate = {
          gte: startOfYear,
          lt: endOfYear,
        };
      }

      return await ctx.db.archivedAssembly.findMany({
        where: whereConditions,
        include: {
          archivedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              participants: true,
              registrations: true,
              modalities: true,
            },
          },
        },
        orderBy: {
          archivedAt: 'desc',
        },
      });
    }),
}); 