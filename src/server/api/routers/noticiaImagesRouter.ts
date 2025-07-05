import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch, buildGithubApiUrl, buildCdnUrl, GITHUB_TOKEN, GITHUB_CONFIG } from "~/server/githubClient";
import { env } from "~/env";
import crypto from 'crypto';

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
    // If no specific image IDs provided, update ALL images with null blogId that are in "new" directory
    const whereCondition = imageIds.length > 0 
        ? {
            AND: [
                { blogId: null },
                { id: { in: imageIds } }
            ]
        }
        : {
            AND: [
                { blogId: null },
                { filePath: { startsWith: 'noticias/new/' } }
            ]
        };
    
    const updatedImages = await db.noticiaImage.updateMany({
        where: whereCondition,
        data: {
            blogId,
        },
    });
    
    // Move files in GitHub from "new" directory to the actual blog ID directory
    const imagesToMove = await db.noticiaImage.findMany({
        where: {
            blogId,
            filePath: { startsWith: 'noticias/new/' }
        },
    });
    
    for (const image of imagesToMove) {
        const maxRetries = 3;
        let success = false;
        
        for (let attempt = 1; attempt <= maxRetries && !success; attempt++) {
            try {
                // Get the file content from GitHub (always fetch fresh to get latest SHA)
                const oldGithubUrl = buildGithubApiUrl(image.filePath);
                const fileData = await fetchFileContent(oldGithubUrl);
                
                // Create new file path
                const filename = image.filePath.split('/').pop();
                const newFilePath = `noticias/${blogId}/images/${filename}`;
                const newGithubUrl = buildGithubApiUrl(newFilePath);
                const newUrl = buildCdnUrl(newFilePath);
                
                // Check if file already exists at new location and get SHA if it does
                let existingSha: string | undefined;
                try {
                    const existingFile = await fetchFileContent(newGithubUrl);
                    existingSha = existingFile.sha;
                } catch (error) {
                    // File doesn't exist, which is fine for new uploads
                }

                // Upload to new location
                const requestBody: any = {
                    message: `Move image to blog ${blogId}: ${image.originalName}`,
                    content: fileData.content,
                    committer: {
                        name: "Admin Panel",
                        email: "admin@ifmsabrazil.org",
                    },
                };

                // Add SHA if file exists (for updates)
                if (existingSha) {
                    requestBody.sha = existingSha;
                }

                const uploadResponse = await githubFetch(newGithubUrl, {
                    method: "PUT",
                    body: JSON.stringify(requestBody),
                });
                
                if (!uploadResponse.ok) {
                    if (uploadResponse.status === 409 && attempt < maxRetries) {
                        console.log(`Conflict uploading ${image.filePath}, retrying attempt ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        continue;
                    }
                    throw new Error(`Upload failed with status ${uploadResponse.status}`);
                }
                
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
                
                success = true;
            } catch (error) {
                if (attempt === maxRetries) {
                    console.error(`Error moving image ${image.id} after ${maxRetries} attempts:`, error);
                    // Continue with other images even if one fails
                } else {
                    console.log(`Error moving image ${image.id}, retrying attempt ${attempt + 1}...`);
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
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
    const response = await githubFetch(url, {
        method: "GET",
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }

    const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
    return data;
};

const deleteFileFromGitHub = async (filePath: string, maxRetries: number = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const githubApiUrl = buildGithubApiUrl(filePath);
            
            // First get the file's SHA
            const response = await githubFetch(githubApiUrl, {
                method: "GET",
            });

            if (!response.ok) {
                if (response.status === 404) {
                    // File already deleted, consider it successful
                    console.log(`File ${filePath} already deleted`);
                    return;
                }
                console.error("Failed to fetch file metadata for deletion");
                return;
            }

            const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
            
            // Delete the file
            const deleteResponse = await githubFetch(githubApiUrl, {
                method: "DELETE",
                body: JSON.stringify({
                    message: `Delete noticia image: ${filePath}`,
                    sha: data.sha,
                    committer: {
                        name: "Admin Panel",
                        email: "admin@ifmsabrazil.org",
                    },
                }),
            });

            if (deleteResponse.ok) {
                return; // Success
            }

            if (deleteResponse.status === 409 && attempt < maxRetries) {
                console.log(`Conflict deleting ${filePath}, retrying attempt ${attempt + 1}...`);
                // Wait a bit before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }

            console.error(`Failed to delete file from GitHub: ${deleteResponse.status}`);
            return;
        } catch (error) {
            if (attempt === maxRetries) {
                console.error(`Error deleting file ${filePath} after ${maxRetries} attempts:`, error);
            } else {
                console.log(`Error deleting file ${filePath}, retrying attempt ${attempt + 1}...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }
};

// Constants for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

// Helper function to validate uploaded image
const validateImageUpload = (base64String: string, originalFilename: string, fileSize?: number, mimeType?: string): void => {
    // Validate filename
    const extension = originalFilename.split('.').pop()?.toLowerCase();
    if (!extension || !ALLOWED_EXTENSIONS.includes(`.${extension}`)) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(', ')}`,
        });
    }
    
    // Validate mime type if provided
    if (mimeType && !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        });
    }
    
    // Validate base64
    let buffer: Buffer;
    try {
        // Check if it's a data URL or raw base64
        let base64Data: string;
        if (base64String.startsWith('data:')) {
            const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
            if (!matches || matches.length < 3) {
                throw new Error('Invalid data URL format');
            }
            // Additional mime type check from data URL
            const dataUrlMimeType = matches[1];
            if (!dataUrlMimeType || !ALLOWED_IMAGE_TYPES.includes(dataUrlMimeType)) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: `Invalid file type in data URL. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
                });
            }
            base64Data = matches[2] || '';
            if (!base64Data) {
                throw new Error('No base64 data found in data URL');
            }
        } else {
            base64Data = base64String;
        }
        
        buffer = Buffer.from(base64Data, 'base64');
    } catch (error) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Invalid base64 image data",
        });
    }
    
    // Validate file size
    const calculatedSize = buffer.length;
    if (calculatedSize > MAX_FILE_SIZE) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `File size (${(calculatedSize / 1024 / 1024).toFixed(2)}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        });
    }
    
    // If fileSize was provided, validate it matches
    if (fileSize && Math.abs(fileSize - calculatedSize) > 1000) { // Allow 1KB difference
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "Provided file size does not match actual file size",
        });
    }
    
    // Validate image magic numbers
    const isValidImage = 
        (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) || // JPEG
        (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) || // PNG
        (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) || // GIF
        (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && 
         buffer.toString('ascii', 8, 12) === 'WEBP'); // WebP
    
    if (!isValidImage) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: "File content does not match a valid image format",
        });
    }
};

export const noticiaImagesRouter = createTRPCRouter({
    // Upload a new image for a noticia
    uploadImage: protectedProcedure
        .input(
            z.object({
                noticiaId: z.string().min(1, "Noticia ID is required").max(100).regex(/^[a-zA-Z0-9-_]+$|^new$/, 'Invalid noticia ID format'), 
                image: z.string().min(1, "Image data is required"), // base64 image
                originalFilename: z.string().min(1, "Original filename is required").max(255),
                fileSize: z.number().optional(),
                mimeType: z.string().optional(),
            })
        )
        .mutation(async ({ ctx, input }) => {
            const { noticiaId, image, originalFilename, fileSize, mimeType } = input;
            
            // Validate the uploaded image
            validateImageUpload(image, originalFilename, fileSize, mimeType);
            
            // Generate unique random string for filename
            const randomString = await generateUniqueRandomString(ctx.db);
            
            // Get file extension from original filename
            const extension = originalFilename.split('.').pop()?.toLowerCase() || 'png';
            const finalFilename = `${randomString}.${extension}`;
            
            // Determine blogId (null for "new" noticias)
            const blogId = noticiaId === "new" ? null : parseInt(noticiaId, 10);
            
            const filePath = `noticias/${noticiaId}/images/${finalFilename}`;
            const githubApiUrl = buildGithubApiUrl(filePath);
            
            const imageContent = Buffer.from(image, "base64").toString("base64");
            
            try {
                // Upload the image file to GitHub with retry logic
                const maxRetries = 3;
                let lastError: string = "";
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    // Check if file already exists and get SHA if it does
                    let existingSha: string | undefined;
                    try {
                        const existingFile = await fetchFileContent(githubApiUrl);
                        existingSha = existingFile.sha;
                    } catch (error) {
                        // File doesn't exist, which is fine for new uploads
                    }

                    // Prepare request body
                    const requestBody: any = {
                        message: `Add noticia image: ${originalFilename}`,
                        content: imageContent,
                        committer: {
                            name: "Admin Panel",
                            email: "admin@ifmsabrazil.org",
                        },
                    };

                    // Add SHA if file exists (for updates)
                    if (existingSha) {
                        requestBody.sha = existingSha;
                    }

                    const imageResponse = await githubFetch(githubApiUrl, {
                        method: "PUT",
                        body: JSON.stringify(requestBody),
                    });

                    if (imageResponse.ok) {
                        break; // Success, exit the retry loop
                    }

                    if (imageResponse.status === 409 && attempt < maxRetries) {
                        console.log(`Conflict uploading image, retrying attempt ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        continue;
                    }

                    // If we get here, either it's not a 409 or we've exhausted retries
                    const imageResponseData = await imageResponse.text();
                    lastError = imageResponseData;
                    console.error("Image response error:", imageResponseData);
                    
                    if (attempt === maxRetries) {
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: `GitHub API responded with status ${imageResponse.status}`,
                        });
                    }
                }

                const imageUrl = buildCdnUrl(filePath);
                
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
                const githubApiUrl = buildGithubApiUrl(newFilePath);
                
                const imageContent = Buffer.from(newImage, "base64").toString("base64");
                
                // Upload with retry logic for conflicts
                const maxRetries = 3;
                let updateSuccess = false;
                
                for (let attempt = 1; attempt <= maxRetries; attempt++) {
                    const imageResponse = await githubFetch(githubApiUrl, {
                        method: "PUT",
                        body: JSON.stringify({
                            message: `Update noticia image: ${newOriginalFilename}`,
                            content: imageContent,
                            committer: {
                                name: "Admin Panel",
                                email: "admin@ifmsabrazil.org",
                            },
                        }),
                    });

                    if (imageResponse.ok) {
                        updateSuccess = true;
                        break;
                    }

                    if (imageResponse.status === 409 && attempt < maxRetries) {
                        console.log(`Conflict updating image, retrying attempt ${attempt + 1}...`);
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                        continue;
                    }

                    const imageResponseData = await imageResponse.text();
                    console.error("Image response error:", imageResponseData);
                    
                    if (attempt === maxRetries) {
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: `GitHub API responded with status ${imageResponse.status}`,
                        });
                    }
                }

                const imageUrl = buildCdnUrl(newFilePath);
                
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