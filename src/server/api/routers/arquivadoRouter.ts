import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from "node-fetch";
import { env } from "~/env";

const GITHUB_TOKEN = env.GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

const deleteFileFromGitHub = async (url: string | null) => {
    if (!url) return;

    const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
        const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/arquivado\/([^\/]+)\/([^\/]+)/;
        const match = jsDelivrUrl.match(regex);
        if (!match) return null;

        const [_, owner, repo, id, filename] = match;
        return `https://api.github.com/repos/${owner}/${repo}/contents/arquivado/${id}/${filename}`;
    };

    const githubUrl = convertJsDelivrToGitHubUrl(url);
    if (!githubUrl) {
        console.error("Invalid jsDelivr URL:", url);
        return;
    }

    // Get the SHA of the file
    const response = await fetch(githubUrl, {
        method: "GET",
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
        },
    });
    const data = response.ok ? await response.json() : null;
    const sha = data ? (data as { sha: string }).sha : null;

    if (sha) {
        // Delete the file
        await fetch(githubUrl, {
            method: "DELETE",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Delete file for Pessoa Arquivada`,
                sha,
                committer: {
                    name: "Your Name",
                    email: "your-email@example.com",
                },
            }),
        });
    }
};

export const arquivadoRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.arquivado.findMany({
            orderBy: {
                order: "asc",
            },
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input, ctx }) => {
            return ctx.db.arquivado.findUnique({ where: { id: input.id } });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;

            const arquivado = await ctx.db.arquivado.findUnique({ where: { id } });
            if (!arquivado) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: `Person with ID ${id} not found`,
                });
            }

            const { imageLink } = arquivado;

            try {
                // Attempt to delete the files from GitHub
                await deleteFileFromGitHub(imageLink);

                // Proceed to delete the database entry
                return ctx.db.arquivado.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting files from GitHub:", error);

                // If error, prompt user for confirmation to delete the database entry anyway
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Error deleting files. Note this ID (${id}) and ask the CM-D to delete manually. After that, click confirm to delete from the database anyway.`,
                });
            }
        }),

    create: ifmsaEmailProcedure
        .input(
            z.object({
                role: z.string(),
                type: z.string(),
                acronym: z.string(),
                name: z.string(),
                order: z.number(),
                gestaoId: z.number(),
                imageLink: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.arquivado.create({
                data: input,
            });
        }),

    update: ifmsaEmailProcedure
        .input(
            z.object({
                id: z.number(),
                role: z.string(),
                type: z.string(),
                acronym: z.string(),
                name: z.string(),
                order: z.number(),
                gestaoId: z.number(),
                imageLink: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            return ctx.db.arquivado.update({
                where: { id: input.id },
                data: input,
            });
        }),

    getMaxOrder: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const maxOrder = await ctx.db.arquivado.findFirst({
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
        .input(
            z.array(
                z.object({
                    id: z.number(),
                    order: z.number(),
                })
            )
        )
        .mutation(async ({ ctx, input }) => {
            const transaction = input.map(({ id, order }) =>
                ctx.db.arquivado.update({
                    where: { id },
                    data: { order },
                })
            );

            await ctx.db.$transaction(transaction);
        }),

    latestArquivadoId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latestArquivado = await ctx.db.arquivado.findFirst({
            orderBy: { id: "desc" },
        });
        return latestArquivado?.id || 0;
    }),
});
