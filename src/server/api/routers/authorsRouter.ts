import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";

export const authorsRouter = createTRPCRouter({
  // Get all authors
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.author.findMany({
      orderBy: { name: "asc" },
    });
  }),

  // Get a single author by ID
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const author = await ctx.db.author.findUnique({
        where: { id: input.id },
      });

      if (!author) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Author not found",
        });
      }

      return author;
    }),

  // Get authors for a specific blog post
  getByBlogId: publicProcedure
    .input(z.object({ blogId: z.number() }))
    .query(async ({ ctx, input }) => {
      const blogAuthors = await ctx.db.blogAuthor.findMany({
        where: { blogId: input.blogId },
        include: {
          author: true,
        },
      });

      if (blogAuthors.length === 0) {
        return {
          hasExtendedInfo: false,
          message: "This post uses legacy author format",
        };
      }

      return {
        hasExtendedInfo: true,
        authors: blogAuthors.map(ba => ({
          id: ba.author.id,
          name: ba.author.name,
          bio: ba.author.bio,
          photo: ba.author.photoLink,
        })),
      };
    }),

  // Create a new author
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        bio: z.string().optional(),
        photoLink: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.author.create({
        data: {
          name: input.name,
          bio: input.bio,
          photoLink: input.photoLink,
        },
      });
    }),

  // Update an author
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        bio: z.string().optional(),
        photoLink: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;
      
      return ctx.db.author.update({
        where: { id },
        data: updateData,
      });
    }),

  // Delete an author
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // First check if author is used in any blog posts
      const blogAuthors = await ctx.db.blogAuthor.findMany({
        where: { authorId: input.id },
      });

      if (blogAuthors.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Cannot delete author that is used in blog posts",
        });
      }

      return ctx.db.author.delete({
        where: { id: input.id },
      });
    }),

  // Associate authors with a blog post
  associateWithBlog: protectedProcedure
    .input(
      z.object({
        blogId: z.number(),
        authorIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // First, remove existing associations
      await ctx.db.blogAuthor.deleteMany({
        where: { blogId: input.blogId },
      });

      // Then create new associations
      if (input.authorIds.length > 0) {
        await ctx.db.blogAuthor.createMany({
          data: input.authorIds.map(authorId => ({
            blogId: input.blogId,
            authorId,
          })),
        });
      }

      return { success: true };
    }),

  // Upload author photo (similar to existing photo upload patterns)
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        authorId: z.number(),
        image: z.string(), // base64 image
      })
    )
    .mutation(async ({ ctx, input }) => {
      // This would integrate with the existing GitHub file upload system
      // For now, we'll just update the photoLink field
      // The actual GitHub integration would be similar to the existing file upload logic
      
      const photoUrl = `https://example.com/authors/${input.authorId}/photo.jpg`; // Placeholder
      
      return ctx.db.author.update({
        where: { id: input.authorId },
        data: { photoLink: photoUrl },
      });
    }),
}); 