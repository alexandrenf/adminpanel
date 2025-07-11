import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch } from "~/server/githubClient";

const fetchFileContent = async (url: string) => {
    const response = await githubFetch(url, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
};

const deleteFileFromGitHub = async (url: string | null) => {
    if (!url) return;

    const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
        const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/eb\/([^\/]+)\/([^\/]+)/;
        const match = jsDelivrUrl.match(regex);
        if (!match) return null;

        const [_, owner, repo, id, filename] = match;
        return `https://api.github.com/repos/${owner}/${repo}/contents/eb/${id}/${filename}`;
    };

    const githubUrl = convertJsDelivrToGitHubUrl(url);
    if (!githubUrl) {
        console.error("Invalid jsDelivr URL:", url);
        return;
    }

    // Get the SHA of the file
    const response = await githubFetch(githubUrl, {
        method: "GET",
    });
    const data = response.ok ? await response.json() : null;
    const sha = data ? (data as { sha: string }).sha : null;

    if (sha) {
        // Delete the file
        await githubFetch(githubUrl, {
            method: "DELETE",
            body: JSON.stringify({
                message: `Delete file for EB`,
                sha,
                committer: {
                    name: "Your Name",
                    email: "your-email@example.com",
                },
            }),
        });
    }
};

export const ebRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.eB.findMany({
            include: {
                time: true,
            },
            orderBy: [{ order: "asc" }],
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input, ctx }) => {
            return ctx.db.eB.findUnique({
                where: { id: input.id },
                include: {
                    time: true,
                },
            });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;

            // Retrieve the EB details
            const eb = await ctx.db.eB.findUnique({ where: { id } });
            if (!eb) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `EB with ID ${id} not found`,
                });
            }

            const { imageLink } = eb;

            try {
                // Attempt to delete the files from GitHub
                await deleteFileFromGitHub(imageLink);

                // Proceed to delete the database entry
                return ctx.db.eB.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting files from GitHub:", error);

                // If error, prompt user for confirmation to delete the database entry anyway
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Error deleting files. Note this ID (${id}) and ask the CM-D to delete manually. After that, click confirm to delete from the database anyway.`,
                });
            }
        }),

    deleteAnyway: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.eB.delete({ where: { id: input.id } });
        }),

    create: ifmsaEmailProcedure
        .input(z.object({
            role: z.string(),
            acronym: z.string().optional(),
            name: z.string(),
            email: z.string(),
            order: z.number(),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.eB.create({
                data: input,
            });
        }),

    update: ifmsaEmailProcedure
        .input(z.object({
            id: z.number(),
            role: z.string(),
            acronym: z.string().optional(),
            name: z.string(),
            email: z.string(),
            order: z.number(),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.eB.update({
                where: { id: input.id },
                data: input,
            });
        }),

    getMaxOrder: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const maxOrder = await ctx.db.eB.findFirst({
            orderBy: {
                order: 'desc',
            },
            select: {
                order: true,
            },
        });
        return maxOrder?.order ?? 0;
    }),
    updateOrder: ifmsaEmailProcedure.input(z.array(z.object({
        id: z.number(),
        order: z.number()
    }))).mutation(async ({ ctx, input }) => {
        const transaction = input.map(({ id, order }) =>
            ctx.db.eB.update({
                where: { id },
                data: { order }
            })
        );

        await ctx.db.$transaction(transaction);
    }),
    latestEbId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latestEB = await ctx.db.eB.findFirst({ orderBy: { id: "desc" } });
        return latestEB?.id || 0;
    }),


});
