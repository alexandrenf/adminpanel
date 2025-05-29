import { z } from "zod";

import {
    createTRPCRouter,
    ifmsaEmailProcedure,
} from "~/server/api/trpc";

export const gestaoRouter = createTRPCRouter({

    create: ifmsaEmailProcedure
        .input(z.object({
            yearStart: z.number().min(3),
            yearEnd: z.number().min(3),
        }))
        .mutation(async ({ ctx, input }) => {

            return ctx.db.gestao.create({
                data: {
                    yearStart: input.yearStart,
                    yearEnd: input.yearEnd,
                },
            });
        }),

    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.gestao.findMany();
    }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.gestao.delete({ where: { id: input.id } });
        }),

    getAllArquivados: ifmsaEmailProcedure
        .input(z.object({ id: z.number(), tipoCargo: z.string() }))
        .query(async ({ input, ctx }) => {
            return ctx.db.arquivado.findMany({
                where: {
                    gestaoId: input.id,
                    type: input.tipoCargo,
                },
                orderBy: {
                    order: "asc",
                },
            });
        }),
});
