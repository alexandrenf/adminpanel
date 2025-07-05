import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch, buildGithubApiUrl, buildCdnUrl } from "~/server/githubClient";

const PLACEHOLDER_IMAGE_URL = "https://placehold.co/400";

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

const deleteOldFile = async (url: string) => {
    try {
        const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
            const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/eb\/([^\/]+)\/([^\/]+)/;
            const match = jsDelivrUrl.match(regex);
            if (!match) return null;

            const [_, owner, repo, id, filename] = match;
            return `https://api.github.com/repos/${owner}/${repo}/contents/eb/${id}/${filename}`;
        };

        const githubUrl = convertJsDelivrToGitHubUrl(url);
        if (!githubUrl) {
            console.error("Invalid jsDelivr URL:", url);
            return;
        }

        const response = await githubFetch(githubUrl, {
            method: "GET",
        });

        if (!response.ok) {
            const responseData = await response.text();
            console.error("Failed to fetch file metadata:", responseData);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `GitHub API responded with status ${response.status}`,
            });
        }

        const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
        const deleteResponse = await githubFetch(githubUrl, {
            method: "DELETE",
            body: JSON.stringify({
                message: `Delete old file for ${url}`,
                sha: data.sha,
                committer: {
                    name: "Your Name",
                    email: "your-email@example.com",
                },
            }),
        });

        if (!deleteResponse.ok) {
            const deleteResponseData = await deleteResponse.text();
            console.error("Delete response error:", deleteResponseData);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `GitHub API responded with status ${deleteResponse.status}`,
            });
        }
    } catch (error) {
        console.error(`Error deleting old file ${url}:`, error);
    }
};

export const ebPhotoRouter = createTRPCRouter({
    uploadPhoto: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(), // Expecting base64 string or null
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, image } = input;

            const COMMIT_MESSAGE = `Add new EB photo: ${id}`;
            const imageFilename = `photo${new Date().getTime()}.png`;

            const GITHUB_API_URL_IMAGE = buildGithubApiUrl(`eb/${id}/${imageFilename}`);

            const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

            try {
                let imageUrl = PLACEHOLDER_IMAGE_URL;

                if (imageContent) {
                    // Check if file already exists and get SHA if it does
                    let existingSha: string | undefined;
                    try {
                        const existingFile = await fetchFileContent(GITHUB_API_URL_IMAGE);
                        existingSha = existingFile.sha;
                    } catch (error) {
                        // File doesn't exist, which is fine for new uploads
                    }

                    // Upload the image file
                    const requestBody: any = {
                        message: `Add image for ${id}`,
                        content: imageContent,
                        committer: {
                            name: "Your Name",
                            email: "your-email@example.com",
                        },
                    };

                    // Add SHA if file exists (for updates)
                    if (existingSha) {
                        requestBody.sha = existingSha;
                    }

                    const imageResponse = await githubFetch(GITHUB_API_URL_IMAGE, {
                        method: "PUT",
                        body: JSON.stringify(requestBody),
                    });

                    if (!imageResponse.ok) {
                        const imageResponseData = await imageResponse.text();
                        console.error("Image response error:", imageResponseData);
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: `GitHub API responded with status ${imageResponse.status}`,
                        });
                    }

                    imageUrl = buildCdnUrl(`eb/${id}/${imageFilename}`);
                }

                return {
                    imageUrl,
                };
            } catch (error) {
                console.error("Error uploading file:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error uploading file",
                });
            }
        }),

    updateFile: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(), // Expecting base64 string or null
            imageLink: z.string().url().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, image, imageLink } = input;

            const COMMIT_MESSAGE = `Update EB photo: ${id}`;
            const GITHUB_API_URL_IMAGE = (filename: string) => buildGithubApiUrl(`eb/${id}/${filename}`);
            const GITHUB_API_URL_EDIT = buildGithubApiUrl(`eb/${id}/edit.txt`);

            const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

            try {
                // Handle edit.txt to keep track of edit count
                let editCount = 1;
                let editSha: string | undefined;

                try {
                    const existingEditFile = await fetchFileContent(GITHUB_API_URL_EDIT);
                    editCount = parseInt(Buffer.from(existingEditFile.content ?? '', 'base64').toString('utf-8'), 10) + 1;
                    editSha = existingEditFile.sha;
                } catch (error) {
                    console.error("Edit file not found, creating a new one.");
                }

                const imageFilename = imageContent ? `photo_${editCount}.png` : null;

                let imageUrl = imageLink;

                if (imageContent) {
                    // Check if file already exists and get SHA if it does
                    let existingSha: string | undefined;
                    try {
                        const existingFile = await fetchFileContent(GITHUB_API_URL_IMAGE(imageFilename || ''));
                        existingSha = existingFile.sha;
                    } catch (error) {
                        // File doesn't exist, which is fine for new uploads
                    }

                    // Upload the new image file
                    const requestBody: any = {
                        message: `Update image for ${id}`,
                        content: imageContent,
                        committer: {
                            name: "Your Name",
                            email: "your-email@example.com",
                        },
                    };

                    // Add SHA if file exists (for updates)
                    if (existingSha) {
                        requestBody.sha = existingSha;
                    }

                    const imageResponse = await githubFetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
                        method: "PUT",
                        body: JSON.stringify(requestBody),
                    });

                    if (!imageResponse.ok) {
                        const imageResponseData = await imageResponse.text();
                        console.error("Image response error:", imageResponseData);
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: `GitHub API responded with status ${imageResponse.status}`,
                        });
                    }

                    imageUrl = buildCdnUrl(`eb/${id}/${imageFilename}`);

                    // Delete the old image file
                    await deleteOldFile(imageLink);
                }

                // Upload the edit.txt file with the updated edit count
                const editFileResponse = await githubFetch(GITHUB_API_URL_EDIT, {
                    method: "PUT",
                    body: JSON.stringify({
                        message: `Update edit count for ${id}`,
                        content: Buffer.from(editCount.toString()).toString("base64"),
                        sha: editSha,
                        committer: {
                            name: "Your Name",
                            email: "your-email@example.com",
                        },
                    }),
                });

                if (!editFileResponse.ok) {
                    const editFileResponseData = await editFileResponse.text();
                    console.error("Edit file response error:", editFileResponseData);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `GitHub API responded with status ${editFileResponse.status}`,
                    });
                }

                return {
                    imageUrl,
                    editCount
                };
            } catch (error) {
                console.error("Error uploading file:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error uploading file",
                });
            }
        }),
});

