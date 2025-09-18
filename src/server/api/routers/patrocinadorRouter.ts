import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch } from "~/server/githubClient";

const patrocinadorTypeSchema = z.enum(["marca", "colaborador"]);

const normalizeOptionalString = (value?: string | null) => {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
};

const deleteFileFromGitHub = async (url: string | null) => {
    if (!url) return;

    const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
        const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/patrocinadores\/([^\/]+)\/([^\/]+)/;
        const match = jsDelivrUrl.match(regex);
        if (!match) return null;

        const [_, owner, repo, id, filename] = match;
        return `https://api.github.com/repos/${owner}/${repo}/contents/patrocinadores/${id}/${filename}`;
    };

    const githubUrl = convertJsDelivrToGitHubUrl(url);
    if (!githubUrl) {
        console.error("Invalid jsDelivr URL:", url);
        return;
    }

    const response = await githubFetch(githubUrl, {
        method: "GET",
    });
    const data = response.ok ? await response.json() : null;
    const sha = data ? (data as { sha: string }).sha : null;

    if (sha) {
        await githubFetch(githubUrl, {
            method: "DELETE",
            body: JSON.stringify({
                message: `Delete file for Patrocinador`,
                sha,
                committer: {
                    name: "Your Name",
                    email: "your-email@example.com",
                },
            }),
        });
    }
};

export const patrocinadorRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.patrocinador.findMany({
            orderBy: [{ type: "asc" }, { order: "asc" }],
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input, ctx }) => {
            return ctx.db.patrocinador.findUnique({
                where: { id: input.id },
            });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;

            const patrocinador = await ctx.db.patrocinador.findUnique({ where: { id } });
            if (!patrocinador) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Patrocinador with ID ${id} not found`,
                });
            }

            const { imageLink } = patrocinador;

            try {
                await deleteFileFromGitHub(imageLink ?? null);
                return ctx.db.patrocinador.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting patrocinador files from GitHub:", error);

                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Error deleting files. Note this ID (${id}) and ask the administrator to delete manually. After that, click confirm to delete from the database anyway.`,
                });
            }
        }),

    deleteAnyway: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.patrocinador.delete({ where: { id: input.id } });
        }),

    create: ifmsaEmailProcedure
        .input(z.object({
            name: z.string(),
            description: z.string().optional(),
            website: z.string().optional(),
            order: z.number(),
            imageLink: z.string().optional(),
            type: patrocinadorTypeSchema,
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.patrocinador.create({
                data: {
                    name: input.name,
                    description: normalizeOptionalString(input.description),
                    website: normalizeOptionalString(input.website),
                    order: input.order,
                    imageLink: input.imageLink,
                    type: input.type,
                },
            });
        }),

    update: ifmsaEmailProcedure
        .input(z.object({
            id: z.number(),
            name: z.string(),
            description: z.string().optional(),
            website: z.string().optional(),
            order: z.number(),
            imageLink: z.string().optional(),
            type: patrocinadorTypeSchema,
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.patrocinador.update({
                where: { id: input.id },
                data: {
                    name: input.name,
                    description: normalizeOptionalString(input.description),
                    website: normalizeOptionalString(input.website),
                    order: input.order,
                    imageLink: input.imageLink,
                    type: input.type,
                },
            });
        }),

    getMaxOrder: ifmsaEmailProcedure
        .input(z.object({ type: patrocinadorTypeSchema }))
        .query(async ({ ctx, input }) => {
            const maxOrder = await ctx.db.patrocinador.findFirst({
                where: { type: input.type },
                orderBy: {
                    order: 'desc',
                },
                select: {
                    order: true,
                },
            });
            return maxOrder?.order ?? 0;
        }),

    updateOrder: ifmsaEmailProcedure
        .input(z.object({
            type: patrocinadorTypeSchema,
            items: z.array(z.object({
                id: z.number(),
                order: z.number(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            if (input.items.length === 0) return;

            const ids = input.items.map(({ id }) => id);
            const patrocinadores = await ctx.db.patrocinador.findMany({
                where: { id: { in: ids } },
                select: { id: true, type: true },
            });

            const mismatched = patrocinadores.find(({ type }) => type !== input.type);
            if (mismatched) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Todos os patrocinadores devem ser do mesmo tipo para reordenar.',
                });
            }

            const transaction = input.items.map(({ id, order }) =>
                ctx.db.patrocinador.update({
                    where: { id },
                    data: { order },
                })
            );

            await ctx.db.$transaction(transaction);
        }),

    latestPatrocinadorId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latest = await ctx.db.patrocinador.findFirst({ orderBy: { id: "desc" } });
        return latest?.id || 0;
    }),
});
