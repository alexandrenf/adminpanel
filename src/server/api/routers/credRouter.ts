import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { githubFetch } from "~/server/githubClient";

const deleteFileFromGitHub = async (url: string | null) => {
    if (!url) return;

    const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
        const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/cred\/([^\/]+)\/([^\/]+)/;
        const match = jsDelivrUrl.match(regex);
        if (!match) return null;

        const [_, owner, repo, id, filename] = match;
        return `https://api.github.com/repos/${owner}/${repo}/contents/cred/${id}/${filename}`;
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
                message: `Delete file for CRED`,
                sha,
                committer: {
                    name: "Your Name",
                    email: "your-email@example.com",
                },
            }),
        });
    }
};

export const credRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.cRED.findMany({
            orderBy: [{ order: "asc" }],
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input, ctx }) => {
            return ctx.db.cRED.findUnique({
                where: { id: input.id },
            });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;

            const cred = await ctx.db.cRED.findUnique({ where: { id } });
            if (!cred) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `CRED with ID ${id} not found`,
                });
            }

            const { imageLink } = cred;

            try {
                await deleteFileFromGitHub(imageLink);
                return ctx.db.cRED.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting files from GitHub:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error deleting files. Note this ID (${id}) and ask the CM-D to delete manually. After that, click confirm to delete from the database anyway.`,
                });
            }
        }),

    deleteAnyway: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.cRED.delete({ where: { id: input.id } });
        }),

    create: ifmsaEmailProcedure
        .input(z.object({
            role: z.string(),
            acronym: z.string(),
            name: z.string(),
            email: z.string(),
            order: z.number(),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.cRED.create({
                data: input,
            });
        }),

    update: ifmsaEmailProcedure
        .input(z.object({
            id: z.number(),
            role: z.string(),
            acronym: z.string(),
            name: z.string(),
            email: z.string(),
            order: z.number(),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, ...data } = input;
            return ctx.db.cRED.update({
                where: { id },
                data,
            });
        }),

    getMaxOrder: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const maxOrder = await ctx.db.cRED.findFirst({
            orderBy: {
                order: "desc",
            },
            select: {
                order: true,
            },
        });
        return maxOrder?.order ?? 0;
    }),

    updateOrder: ifmsaEmailProcedure
        .input(z.array(z.object({
            id: z.number(),
            order: z.number(),
        })))
        .mutation(async ({ ctx, input }) => {
            const transaction = input.map(({ id, order }) =>
                ctx.db.cRED.update({
                    where: { id },
                    data: { order },
                }),
            );

            await ctx.db.$transaction(transaction);
        }),

    latestCredId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latestCred = await ctx.db.cRED.findFirst({ orderBy: { id: "desc" } });
        return latestCred?.id || 0;
    }),
});
