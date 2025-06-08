import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

export const authorsRouter = createTRPCRouter({
  // Get all authors
  getAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.author.findMany({
      orderBy: { name: "asc" },
    });
  }),

  // Search authors with pagination
  search: publicProcedure
    .input(
      z.object({
        query: z.string().min(3, "Search query must be at least 3 characters"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { query, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      const [authors, totalCount] = await Promise.all([
        ctx.db.author.findMany({
          where: {
            name: {
              contains: query,
            },
          },
          orderBy: { name: "asc" },
          skip,
          take: pageSize,
        }),
        ctx.db.author.count({
          where: {
            name: {
              contains: query,
            },
          },
        }),
      ]);

      return {
        authors,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNext: page * pageSize < totalCount,
          hasPrev: page > 1,
        },
      };
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

  // Upload author photo
  uploadPhoto: protectedProcedure
    .input(
      z.object({
        authorId: z.number(),
        image: z.string(), // base64 image
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { authorId, image } = input;
      
      const imageFilename = `photo_${new Date().getTime()}.png`;
      const GITHUB_API_URL_IMAGE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/authors/${authorId}/${imageFilename}`;
      
      const imageContent = Buffer.from(image, "base64").toString("base64");
      
      try {
        // Upload the image file to GitHub
        const imageResponse = await fetch(GITHUB_API_URL_IMAGE, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Add author photo for ${authorId}`,
            content: imageContent,
            committer: {
              name: "Admin Panel",
              email: "admin@ifmsabrazil.org",
            },
          }),
        });

        if (!imageResponse.ok) {
          const imageResponseData = await imageResponse.text();
          console.error("Image response error:", imageResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `GitHub API responded with status ${imageResponse.status}`,
          });
        }

        const photoUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/authors/${authorId}/${imageFilename}`;
        
        // Update the author's photoLink in the database
        await ctx.db.author.update({
          where: { id: authorId },
          data: { photoLink: photoUrl },
        });
        
        return { photoUrl };
      } catch (error) {
        console.error("Error uploading author photo:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Error uploading author photo",
        });
      }
    }),
}); 