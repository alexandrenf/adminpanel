import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";
import { algoliasearch } from 'algoliasearch';

// Algolia client setup
const client = algoliasearch(env.ALGOLIA_APPLICATION_ID, env.ALGOLIA_API_KEY);
const NOTICIAS_INDEX = 'noticias_index';

// Create an index wrapper to simulate v4 initIndex pattern while using v5 methods
const index = {
    saveObject: (object: any) => client.saveObject({
        indexName: NOTICIAS_INDEX,
        body: object
    }),
    partialUpdateObject: (object: any) => client.partialUpdateObject({
        indexName: NOTICIAS_INDEX,
        objectID: object.objectID || object.id?.toString(),
        attributesToUpdate: object
    }),
    deleteObject: (objectID: string) => client.deleteObject({
        indexName: NOTICIAS_INDEX,
        objectID
    }),
    saveObjects: (objects: any[]) => client.saveObjects({
        indexName: NOTICIAS_INDEX,
        objects
    })
};

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
        rascunho: blog.rascunho || false,
        url: `https://ifmsabrazil.org/arquivo/${blog.id}`,
    };

    // Initial record with full content
    const record = {
        ...baseFields,
        content: markdownContent,
        searchableText: `${blog.title} ${blog.summary} ${blog.author} ${markdownContent}`,
    };

    // Function to calculate record size with safety margin for JSON stringification
    const calculateRecordSize = (record: any) => {
        // Add 20% buffer for JSON stringification overhead
        return Math.ceil(JSON.stringify(record).length * 1.2);
    };

    // Binary search to find the optimal content length
    let left = 0;
    let right = markdownContent.length;
    let optimalLength = right;
    const targetSize = 9000; // Target size with buffer

    while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        const testRecord = {
            ...baseFields,
            content: markdownContent.substring(0, mid),
            searchableText: `${blog.title} ${blog.summary} ${blog.author} ${markdownContent.substring(0, mid)}`,
        };

        const currentSize = calculateRecordSize(testRecord);

        if (currentSize <= targetSize) {
            optimalLength = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }

    // Apply the optimal length
    record.content = markdownContent.substring(0, optimalLength);
    record.searchableText = `${blog.title} ${blog.summary} ${blog.author} ${record.content}`;

    // Final size check
    const finalSize = calculateRecordSize(record);
    if (finalSize > targetSize) {
        console.warn(`Record ${blog.id} is still too large (${finalSize} bytes) after optimization`);
    }

    return record;
};

// Helper function to index a single blog to Algolia
const indexBlogToAlgolia = async (blog: any) => {
    try {
        const formattedBlog = await formatBlogForAlgolia(blog);
        await index.saveObject(formattedBlog);
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
        await index.partialUpdateObject(formattedBlog);
        console.log(`Successfully updated blog ${blog.id} in Algolia with content`);
    } catch (error) {
        console.error(`Error updating blog ${blog.id} in Algolia:`, error);
        throw error;
    }
};

// Helper function to delete a blog from Algolia
const deleteBlogFromAlgolia = async (blogId: number) => {
    try {
        await index.deleteObject(blogId.toString());
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
        
        await index.saveObjects(formattedBlogs);
        
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
            include: {
                authors: {
                    include: {
                        author: true,
                    },
                },
                images: true,
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: [{ id: "desc" }],
        });
    }),

    getOne: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .query(({ ctx, input }) => {
            return ctx.db.blog.findUnique({
                where: { id: input.id },
                include: {
                    authors: {
                        include: {
                            author: true,
                        },
                    },
                    images: true,
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            // Use delete instead of deleteMany since we're querying by ID (primary key)
            try {
                const deletedBlog = await ctx.db.blog.delete({
                    where: { id: input.id },
                    include: {
                        authors: {
                            include: {
                                author: true,
                            },
                        },
                        images: true,
                        user: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
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
            rascunho: z.boolean().default(false),
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
                    rascunho: input.rascunho,
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
            rascunho: z.boolean().default(false),
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
                    rascunho: input.rascunho,
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
