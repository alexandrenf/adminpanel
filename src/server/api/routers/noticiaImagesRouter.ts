import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";
import crypto from 'crypto';

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

// Generate a random string for filename
const generateRandomString = (length: number = 16): string => {
    return crypto.randomBytes(length).toString('hex');
};

// Generate unique random string by checking database
const generateUniqueRandomString = async (db: any): Promise<string> => {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
        const randomString = generateRandomString();
        
        const existing = await db.noticiaImage.findUnique({
            where: { randomString },
        });
        
        if (!existing) {
            return randomString;
        }
        
        attempts++;
    }
    
    throw new Error('Failed to generate unique random string after maximum attempts');
};

// Helper function to assign blog ID to images and move files from "new" directory
const assignBlogIdAndMoveImages = async (
    db: any,
    blogId: number,
    imageIds: number[] = []
): Promise<{ updatedCount: number; movedImages: number }> => {
    // Update images that were uploaded for "new" noticia
    // Only update if we have specific image IDs to prevent race conditions
    const updatedImages = imageIds.length > 0 
        ? await db.noticiaImage.updateMany({
            where: {
                AND: [
                    { blogId: null },
                    { id: { in: imageIds } }
                ]
            },
            data: {
                blogId,
            },
        })
        : { count: 0 };
    
    // Move files in GitHub from "new" directory to the actual blog ID directory
    const imagesToMove = await db.noticiaImage.findMany({
        where: {
            blogId,
            filePath: { startsWith: 'noticias/new/' }
        },
    });
    
    for (const image of imagesToMove) {
        try {
            // Get the file content from GitHub
            const oldGithubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${image.filePath}`;
            const fileData = await fetchFileContent(oldGithubUrl);
            
            // Create new file path
            const filename = image.filePath.split('/').pop();
            const newFilePath = `noticias/${blogId}/images/${filename}`;
            const newGithubUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${newFilePath}`;
            const newUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/${newFilePath}`;
            
            // Upload to new location
            await fetch(newGithubUrl, {
                method: "PUT",
                headers: {
                    Authorization: `token ${GITHUB_TOKEN}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: `Move image to blog ${blogId}: ${image.originalName}`,
                    content: fileData.content,
                    committer: {
                        name: "Admin Panel",
                        email: "admin@ifmsabrazil.org",
                    },
                }),
            });
            
            // Delete old file
            await deleteFileFromGitHub(image.filePath);
            
            // Update database record
            await db.noticiaImage.update({
                where: { id: image.id },
                data: {
                    filePath: newFilePath,
                    url: newUrl,
                },
            });
        } catch (error) {
            console.error(`Error moving image ${image.id}:`, error);
            // Continue with other images even if one fails
        }
    }
    
    return {
        updatedCount: updatedImages.count,
        movedImages: imagesToMove.length
    };
};

// Define a type for the GitHub API response
interface GitHubFileResponse {
    sha: string;
    content?: string;
    [key: string]: unknown;
}

const fetchFileContent = async (url: string) => {
    const response = await fetch(url, {
        headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }

    const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
    return data;
};

const deleteFileFromGitHub = async (filePath: string) => {
    try {
        const githubApiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
        
        // First get the file's SHA
        const response = await fetch(githubApiUrl, {
            method: "GET",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
        });

        if (!response.ok) {
            console.error("Failed to fetch file metadata for deletion");
            return;
        }

        const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
        
        // Delete the file
        const deleteResponse = await fetch(githubApiUrl, {
            method: "DELETE",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: `Delete noticia image: ${filePath}`,
                sha: data.sha,
                committer: {
                    name: "Admin Panel",
                    email: "admin@ifmsabrazil.org",
                },
            }),
        });

        if (!deleteResponse.ok) {
            console.error("Failed to delete file from GitHub");
        }
    } catch (error) {
        console.error(`Error deleting file ${filePath}:`, error);
    }
};

export const noticiaImagesRouter = createTRPCRouter({
    // Upload a new image for a noticia
    uploadImage: protectedProcedure
        .input(
            z.object({
                noticiaId: z.string().min(1, "Noticia ID is required"), 
                image: z.string().min(1, "Image data is required"), // base64 image
                originalFilename: z.string().min(1, "Original filename is required"),
                fileSize: z.number().optional(),
                mimeType: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { noticiaId, image, originalFilename, fileSize, mimeType } = input;
            
            // Validate base64 image data
            try {
                Buffer.from(image, "base64");
            } catch (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: "Invalid base64 image data",
                });
            }
            
            // Generate unique random string for filename
            const randomString = await generateUniqueRandomString(ctx.db);
            
            // Get file extension from original filename
            const extension = originalFilename.split('.').pop()?.toLowerCase() || 'png';
            const finalFilename = `${randomString}.${extension}`;
            
            // Determine blogId (null for "new" noticias)
            const blogId = noticiaId === "new" ? null : parseInt(noticiaId, 10);
            
            const filePath = `noticias/${noticiaId}/images/${finalFilename}`;
            const githubApiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
            
            const imageContent = Buffer.from(image, "base64").toString("base64");
            
            try {
                // Upload the image file to GitHub
                const imageResponse = await fetch(githubApiUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: `Add noticia image: ${originalFilename}`,
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

                const imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/${filePath}`;
                
                // Save image metadata to database
                const savedImage = await ctx.db.noticiaImage.create({
                    data: {
                        originalName: originalFilename,
                        randomString,
                        url: imageUrl,
                        filePath,
                        blogId,
                        fileSize,
                        mimeType,
                    },
                });
                
                return { 
                    id: savedImage.id,
                    originalName: savedImage.originalName,
                    randomString: savedImage.randomString,
                    url: savedImage.url,
                    filePath: savedImage.filePath,
                };
            } catch (error) {
                console.error("Error uploading noticia image:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error uploading noticia image",
                });
            }
        }),

    // Get all images for a noticia
    getImages: publicProcedure
        .input(z.object({ noticiaId: z.string() }))
        .query(async ({ ctx, input }) => {
            try {
                // Determine blogId (null for "new" noticias)
                const blogId = input.noticiaId === "new" ? null : parseInt(input.noticiaId, 10);
                
                const images = await ctx.db.noticiaImage.findMany({
                    where: { blogId },
                    orderBy: { createdAt: 'desc' },
                });
                
                return images.map(image => ({
                    id: image.id,
                    originalName: image.originalName,
                    randomString: image.randomString,
                    url: image.url,
                    filePath: image.filePath,
                    fileSize: image.fileSize,
                    mimeType: image.mimeType,
                    createdAt: image.createdAt,
                }));
            } catch (error) {
                console.error("Error fetching noticia images:", error);
                return [];
            }
        }),

    // Delete an image
    deleteImage: protectedProcedure
        .input(
            z.object({
                imageId: z.number().min(1, "Image ID is required"),
            })
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Get image from database
                const image = await ctx.db.noticiaImage.findUnique({
                    where: { id: input.imageId },
                });
                
                if (!image) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: "Image not found",
                    });
                }
                
                // Delete from GitHub
                await deleteFileFromGitHub(image.filePath);
                
                // Delete from database
                await ctx.db.noticiaImage.delete({
                    where: { id: input.imageId },
                });
                
                return { success: true };
            } catch (error) {
                console.error("Error deleting noticia image:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error deleting noticia image",
                });
            }
        }),

    // Update/replace an image
    updateImage: protectedProcedure
        .input(
            z.object({
                imageId: z.number().min(1, "Image ID is required"),
                newImage: z.string().min(1, "New image data is required"), // base64 image
                newOriginalFilename: z.string().min(1, "New original filename is required"),
                fileSize: z.number().optional(),
                mimeType: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { imageId, newImage, newOriginalFilename, fileSize, mimeType } = input;
            
            // Validate base64 image data
            try {
                Buffer.from(newImage, "base64");
            } catch (error) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: "Invalid base64 image data",
                });
            }
            
            try {
                // Get existing image from database
                const existingImage = await ctx.db.noticiaImage.findUnique({
                    where: { id: imageId },
                });
                
                if (!existingImage) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: "Image not found",
                    });
                }
                
                // Delete the old image from GitHub
                await deleteFileFromGitHub(existingImage.filePath);
                
                // Generate new unique random string for filename
                const randomString = await generateUniqueRandomString(ctx.db);
                
                // Get file extension from new original filename
                const extension = newOriginalFilename.split('.').pop()?.toLowerCase() || 'png';
                const finalFilename = `${randomString}.${extension}`;
                
                // Determine the directory based on existing blogId
                const directoryId = existingImage.blogId?.toString() || "new";
                const newFilePath = `noticias/${directoryId}/images/${finalFilename}`;
                const githubApiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${newFilePath}`;
                
                const imageContent = Buffer.from(newImage, "base64").toString("base64");
                
                const imageResponse = await fetch(githubApiUrl, {
                    method: "PUT",
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        message: `Update noticia image: ${newOriginalFilename}`,
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

                const imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/${newFilePath}`;
                
                // Update image metadata in database
                const updatedImage = await ctx.db.noticiaImage.update({
                    where: { id: imageId },
                    data: {
                        originalName: newOriginalFilename,
                        randomString,
                        url: imageUrl,
                        filePath: newFilePath,
                        fileSize,
                        mimeType,
                    },
                });
                
                return { 
                    id: updatedImage.id,
                    originalName: updatedImage.originalName,
                    randomString: updatedImage.randomString,
                    url: updatedImage.url,
                    filePath: updatedImage.filePath,
                };
            } catch (error) {
                console.error("Error updating noticia image:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error updating noticia image",
                });
            }
        }),

    // Assign blog ID to images (called when noticia is created)
    assignBlogIdToImages: protectedProcedure
        .input(
            z.object({
                blogId: z.number().min(1, "Blog ID is required"),
                imageIds: z.array(z.number()).optional().default([]),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { blogId, imageIds } = input;
            
            try {
                const result = await assignBlogIdAndMoveImages(ctx.db, blogId, imageIds);
                
                return { 
                    success: true, 
                    updatedCount: result.updatedCount,
                    movedImages: result.movedImages
                };
            } catch (error) {
                console.error("Error assigning blog ID to images:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error assigning blog ID to images",
                });
            }
        }),
}); 