import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

export const noticiasRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.blog.findMany({
            orderBy: [{ id: "desc" }],
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ ctx, input }) => {
            return ctx.db.blog.findUnique({ where: { id: input.id } });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // First get the blog to find photo name if it exists
            const blog = await ctx.db.blog.findUnique({
                where: { id: input.id }
            });

            if (!blog) {
                throw new Error("Blog not found");
            }

            // Use delete instead of deleteMany since we're querying by ID (primary key)
            try {
                return await ctx.db.blog.delete({
                    where: { id: input.id }
                });
            } catch (error) {
                console.error("Error deleting blog:", error);
                throw new Error("Failed to delete blog from database");
            }
        }),

    deleteAnyway: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            return ctx.db.blog.delete({ where: { id: input.id } });
        }),

    create: ifmsaEmailProcedure
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

    latestBlogId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latestBlog = await ctx.db.blog.findFirst({ orderBy: { id: "desc" } });
        return latestBlog?.id || 0;
    }),

    update: ifmsaEmailProcedure
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
