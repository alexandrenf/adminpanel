import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

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
        .mutation(({ input, ctx }) => {
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
            userId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            // Validate userId
            const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
            if (!user) {
                throw new Error(`User with ID ${input.userId} not found`);
            }

            // simulate a slow db call
            await new Promise((resolve) => setTimeout(resolve, 1000));

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
});
