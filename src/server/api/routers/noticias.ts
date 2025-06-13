import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";
import { algoliasearch } from 'algoliasearch';

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

// Algolia client setup
const client = algoliasearch(env.ALGOLIA_APPLICATION_ID, env.ALGOLIA_API_KEY);
const NOTICIAS_INDEX = 'noticias_index';

// Helper function to fetch markdown content from a URL
const fetchMarkdownContent = async (url: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.warn(`Failed to fetch content from ${url}: ${response.status}`);
            return '';
        }
        const content = await response.text();
        
        // Remove markdown syntax for better search indexing
        const cleanContent = content
            .replace(/#{1,6}\s+/g, '') // Remove headers
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
            .replace(/\*(.*?)\*/g, '$1') // Remove italic
            .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links, keep text
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`(.*?)`/g, '$1') // Remove inline code
            .replace(/^\s*[-\*\+]\s+/gm, '') // Remove list markers
            .replace(/^\s*\d+\.\s+/gm, '') // Remove numbered list markers
            .replace(/\n{2,}/g, ' ') // Replace multiple newlines with space
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .trim();
            
        return cleanContent;
    } catch (error) {
        console.error(`Error fetching content from ${url}:`, error);
        return '';
    }
};

// Helper function to format blog data for Algolia
const formatBlogForAlgolia = async (blog: any) => {
    // Fetch the actual markdown content
    const markdownContent = await fetchMarkdownContent(blog.link);
    
    // Calculate base size of non-content fields
    const baseFields = {
        objectID: blog.id.toString(),
        id: blog.id,
        title: blog.title,
        summary: blog.summary,
        author: blog.author,
        date: blog.date.toISOString(),
        link: blog.link,
        imageLink: blog.imageLink,
        forceHomePage: blog.forceHomePage,
        url: `https://ifmsabrazil.org/arquivo/${blog.id}`,
    };

    // Estimate base size (rough approximation)
    const baseSize = JSON.stringify(baseFields).length;
    const maxContentSize = 5000; // Conservative limit to ensure we stay under 10KB total

    // Truncate content to fit within size limit
    const truncatedContent = markdownContent.substring(0, maxContentSize);
    const searchableText = `${blog.title} ${blog.summary} ${blog.author} ${truncatedContent}`.substring(0, maxContentSize);

    const record = {
        ...baseFields,
        content: truncatedContent,
        searchableText,
    };

    // Validate total size before returning
    const totalSize = JSON.stringify(record).length;
    if (totalSize > 9000) { // Leave 1KB buffer
        console.warn(`Record ${blog.id} is still too large (${totalSize} bytes). Further truncating...`);
        // Further truncate content if needed
        const excess = totalSize - 9000;
        record.content = record.content.substring(0, record.content.length - excess);
        record.searchableText = record.searchableText.substring(0, record.searchableText.length - excess);
    }

    return record;
};

// Helper function to index a single blog to Algolia
const indexBlogToAlgolia = async (blog: any) => {
    try {
        const formattedBlog = await formatBlogForAlgolia(blog);
        await client.saveObject({
            indexName: NOTICIAS_INDEX,
            body: formattedBlog
        });
        console.log(`Successfully indexed blog ${blog.id} to Algolia with content`);
    } catch (error) {
        console.error(`Error indexing blog ${blog.id} to Algolia:`, error);
        throw error;
    }
};

// Helper function to update a blog in Algolia
const updateBlogInAlgolia = async (blog: any) => {
    try {
        const formattedBlog = await formatBlogForAlgolia(blog);
        await client.partialUpdateObject({
            indexName: NOTICIAS_INDEX,
            objectID: blog.id.toString(),
            attributesToUpdate: formattedBlog
        });
        console.log(`Successfully updated blog ${blog.id} in Algolia with content`);
    } catch (error) {
        console.error(`Error updating blog ${blog.id} in Algolia:`, error);
        throw error;
    }
};

// Helper function to delete a blog from Algolia
const deleteBlogFromAlgolia = async (blogId: number) => {
    try {
        await client.deleteObject({
            indexName: NOTICIAS_INDEX,
            objectID: blogId.toString()
        });
        console.log(`Successfully deleted blog ${blogId} from Algolia`);
    } catch (error) {
        console.error(`Error deleting blog ${blogId} from Algolia:`, error);
        throw error;
    }
};

// Helper function to reindex all blogs to Algolia
const reindexAllBlogsToAlgolia = async (blogs: any[]) => {
    try {
        console.log(`Starting to reindex ${blogs.length} blogs to Algolia with content...`);
        
        // Process blogs in batches to avoid overwhelming the system
        const batchSize = 10;
        const formattedBlogs = [];
        
        for (let i = 0; i < blogs.length; i += batchSize) {
            const batch = blogs.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(blogs.length / batchSize)}`);
            
            const batchPromises = batch.map(blog => formatBlogForAlgolia(blog));
            const batchResults = await Promise.all(batchPromises);
            formattedBlogs.push(...batchResults);
        }
        
        await client.saveObjects({
            indexName: NOTICIAS_INDEX,
            objects: formattedBlogs
        });
        
        console.log(`Successfully reindexed ${blogs.length} blogs to Algolia with content`);
        return { success: true, count: blogs.length };
    } catch (error) {
        console.error('Error reindexing blogs to Algolia:', error);
        throw error;
    }
};

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
                const deletedBlog = await ctx.db.blog.delete({
                    where: { id: input.id }
                });

                // Delete from Algolia
                try {
                    await deleteBlogFromAlgolia(input.id);
                } catch (algoliaError) {
                    console.error("Failed to delete from Algolia, but blog was deleted from database:", algoliaError);
                    // Don't throw here - database operation succeeded
                }

                return deletedBlog;
            } catch (error) {
                console.error("Error deleting blog:", error);
                throw new Error("Failed to delete blog from database");
            }
        }),

    deleteAnyway: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const deletedBlog = await ctx.db.blog.delete({ where: { id: input.id } });
            
            // Delete from Algolia
            try {
                await deleteBlogFromAlgolia(input.id);
            } catch (algoliaError) {
                console.error("Failed to delete from Algolia, but blog was deleted from database:", algoliaError);
            }

            return deletedBlog;
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

            const createdBlog = await ctx.db.blog.create({
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

            // Index to Algolia (async, don't wait for completion)
            indexBlogToAlgolia(createdBlog).catch(algoliaError => {
                console.error("Failed to index to Algolia, but blog was created in database:", algoliaError);
            });

            return createdBlog;
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
            const updatedBlog = await ctx.db.blog.update({
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

            // Update in Algolia (async, don't wait for completion)
            updateBlogInAlgolia(updatedBlog).catch(algoliaError => {
                console.error("Failed to update in Algolia, but blog was updated in database:", algoliaError);
            });

            return updatedBlog;
        }),

    // New endpoint to manually sync all data to Algolia
    syncToAlgolia: ifmsaEmailProcedure
        .mutation(async ({ ctx }) => {
            try {
                // Get all blogs from database
                const allBlogs = await ctx.db.blog.findMany({
                    orderBy: [{ id: "desc" }],
                });

                // Reindex all to Algolia
                const result = await reindexAllBlogsToAlgolia(allBlogs);
                
                return {
                    success: true,
                    message: `Successfully synced ${result.count} noticias to Algolia search with full content`,
                    count: result.count
                };
            } catch (error) {
                console.error("Error syncing to Algolia:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Failed to sync noticias to Algolia search"
                });
            }
        }),

    // New endpoint to get Algolia index stats
    getAlgoliaStats: ifmsaEmailProcedure
        .query(async () => {
            try {
                const indices = await client.listIndices();
                const indexExists = indices.items.some(index => index.name === NOTICIAS_INDEX);
                
                return {
                    indexName: NOTICIAS_INDEX,
                    indexExists,
                    urlPattern: "https://ifmsabrazil.org/arquivo/[id]",
                    featuresEnabled: ["Full Content Search", "Markdown Content Parsing", "Batch Processing"]
                };
            } catch (error: any) {
                console.error("Error checking Algolia index:", error);
                return {
                    indexName: NOTICIAS_INDEX,
                    indexExists: false,
                    urlPattern: "https://ifmsabrazil.org/arquivo/[id]",
                    message: "Error checking index existence. Run sync to ensure it exists.",
                    featuresEnabled: ["Full Content Search", "Markdown Content Parsing", "Batch Processing"]
                };
            }
        }),
});
