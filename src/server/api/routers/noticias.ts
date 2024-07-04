import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

export const noticiasRouter = createTRPCRouter({
    getAll: protectedProcedure.query(({ ctx }) => {
        return ctx.db.blog.findMany();
    }),

    getOne: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(({ input, ctx }) => {
            return ctx.db.blog.findUnique({ where: { id: input.id } });
        }),

    delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const { id } = input;

            // Retrieve the noticia details
            const noticia = await ctx.db.blog.findUnique({ where: { id } });
            if (!noticia) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Noticia with ID ${id} not found`,
                });
            }

            const { link, imageLink } = noticia;

            // Convert jsDelivr URLs back to GitHub API URLs
            const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string, type: "markdown" | "image") => {
                const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/noticias\/([^\/]+)\/([^\/]+)/;
                const match = jsDelivrUrl.match(regex);
                if (!match) return null;

                const [_, owner, repo, id, filename] = match;
                const fileType = type === "markdown" ? "content.md" : "cover.png";
                return `https://api.github.com/repos/${owner}/${repo}/contents/noticias/${id}/${fileType}`;
            };

            const githubMarkdownUrl = convertJsDelivrToGitHubUrl(link, "markdown");
            const githubImageUrl = imageLink ? convertJsDelivrToGitHubUrl(imageLink, "image") : null;

            const deleteFileFromGitHub = async (url: string | null, type: "markdown" | "image") => {
                if (!url) return;

                // Get the SHA of the file
                const response = await fetch(url, {
                    method: "GET",
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                });
                const data: { sha?: string } | null = response.ok ? await response.json() as { sha?: string } | null : null;
                const sha = data ? data.sha : null;

                if (sha) {
                    // Delete the file
                    await fetch(url, {
                        method: "DELETE",
                        headers: {
                            Authorization: `token ${GITHUB_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: `Delete ${type} for noticia ${id}`,
                            sha,
                            committer: {
                                name: "Your Name",
                                email: "your-email@example.com",
                            },
                        }),
                    });
                }
            };

            try {
                // Attempt to delete the files from GitHub
                await deleteFileFromGitHub(githubMarkdownUrl, "markdown");
                await deleteFileFromGitHub(githubImageUrl, "image");

                // Proceed to delete the database entry
                return ctx.db.blog.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting files from GitHub:", error);

                // If error, prompt user for confirmation to delete the database entry anyway
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Erro apagando arquivos. Anote essa ID (${id}) e peça que o CM-D delete manualmente. Após isso, clique confirmar para deletar do banco de dados mesmo assim.`,
                });
            }
        }),

    deleteAnyway: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.blog.delete({ where: { id: input.id } });
        }),

    create: protectedProcedure
        .input(z.object({
            date: z.date(),
            author: z.string().min(1),
            title: z.string(),
            summary: z.string(),
            link: z.string(),
            imageLink: z.string().optional(),
            forceHomePage: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            // Validate userId
            const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
            if (!user) {
                throw new Error(`User with ID ${ctx.session.user.id} not found`);
            }

            return ctx.db.blog.create({
                data: {
                    date: input.date,
                    author: input.author,
                    title: input.title,
                    summary: input.summary,
                    link: input.link,
                    imageLink: input.imageLink,
                    forceHomePage: input.forceHomePage,
                    user: { connect: { id: user.id } },
                },
            });
        }),

    latestBlogId: protectedProcedure.query(async ({ ctx }) => {
        const latestBlog = await ctx.db.blog.findFirst({ orderBy: { id: "desc" } });
        return latestBlog?.id || 0;
    }),

    update: protectedProcedure
        .input(z.object({
            id: z.number(),
            date: z.date(),
            author: z.string().min(1),
            title: z.string(),
            summary: z.string(),
            link: z.string(),
            imageLink: z.string().optional(),
            forceHomePage: z.boolean(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.blog.update({
                where: { id: input.id },
                data: {
                    date: input.date,
                    author: input.author,
                    title: input.title,
                    summary: input.summary,
                    link: input.link,
                    imageLink: input.imageLink,
                    forceHomePage: input.forceHomePage,
                },
            });
        }),
});
