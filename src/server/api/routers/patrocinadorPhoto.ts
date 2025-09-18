import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch, buildGithubApiUrl, buildCdnUrl } from "~/server/githubClient";

const PLACEHOLDER_IMAGE_URL = "https://placehold.co/400";

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
            const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/patrocinadores\/([^\/]+)\/([^\/]+)/;
            const match = jsDelivrUrl.match(regex);
            if (!match) return null;

            const [_, owner, repo, id, filename] = match;
            return `https://api.github.com/repos/${owner}/${repo}/contents/patrocinadores/${id}/${filename}`;
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

export const patrocinadorPhotoRouter = createTRPCRouter({
    uploadPhoto: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(),
        }))
        .mutation(async ({ input }) => {
            const { id, image } = input;

            const imageFilename = `photo${new Date().getTime()}.png`;
            const githubApiUrl = buildGithubApiUrl(`patrocinadores/${id}/${imageFilename}`);

            const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

            try {
                let imageUrl = PLACEHOLDER_IMAGE_URL;

                if (imageContent) {
                    let existingSha: string | undefined;
                    try {
                        const existingFile = await fetchFileContent(githubApiUrl);
                        existingSha = existingFile.sha;
                    } catch (error) {
                        // File doesn't exist, continue
                    }

                    const requestBody: Record<string, unknown> = {
                        message: `Add image for patrocinador ${id}`,
                        content: imageContent,
                        committer: {
                            name: "Your Name",
                            email: "your-email@example.com",
                        },
                    };

                    if (existingSha) {
                        requestBody.sha = existingSha;
                    }

                    const imageResponse = await githubFetch(githubApiUrl, {
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

                    imageUrl = buildCdnUrl(`patrocinadores/${id}/${imageFilename}`);
                }

                return {
                    imageUrl,
                };
            } catch (error) {
                console.error("Error uploading patrocinador image:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error uploading file",
                });
            }
        }),

    updateFile: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(),
            imageLink: z.string().url().min(1),
        }))
        .mutation(async ({ input }) => {
            const { id, image, imageLink } = input;

            const githubApiImage = (filename: string) => buildGithubApiUrl(`patrocinadores/${id}/${filename}`);
            const githubApiEdit = buildGithubApiUrl(`patrocinadores/${id}/edit.txt`);

            const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

            try {
                let editCount = 1;
                let editSha: string | undefined;

                try {
                    const existingEditFile = await fetchFileContent(githubApiEdit);
                    editCount = parseInt(Buffer.from(existingEditFile.content ?? '', 'base64').toString('utf-8'), 10) + 1;
                    editSha = existingEditFile.sha;
                } catch (error) {
                    console.error("Patrocinador edit file not found, creating new one.");
                }

                const imageFilename = imageContent ? `photo_${editCount}.png` : null;

                let imageUrl = imageLink;

                if (imageContent) {
                    let existingSha: string | undefined;
                    try {
                        const existingFile = await fetchFileContent(githubApiImage(imageFilename || ''));
                        existingSha = existingFile.sha;
                    } catch (error) {
                        // File doesn't exist
                    }

                    const requestBody: Record<string, unknown> = {
                        message: `Update image for patrocinador ${id}`,
                        content: imageContent,
                        committer: {
                            name: "Your Name",
                            email: "your-email@example.com",
                        },
                    };

                    if (existingSha) {
                        requestBody.sha = existingSha;
                    }

                    const imageResponse = await githubFetch(githubApiImage(imageFilename || ''), {
                        method: "PUT",
                        body: JSON.stringify(requestBody),
                    });

                    if (!imageResponse.ok) {
                        const imageResponseData = await imageResponse.text();
                        console.error("Patrocinador image update error:", imageResponseData);
                        throw new TRPCError({
                            code: 'INTERNAL_SERVER_ERROR',
                            message: `GitHub API responded with status ${imageResponse.status}`,
                        });
                    }

                    imageUrl = buildCdnUrl(`patrocinadores/${id}/${imageFilename}`);

                    await deleteOldFile(imageLink);
                }

                const editFileResponse = await githubFetch(githubApiEdit, {
                    method: "PUT",
                    body: JSON.stringify({
                        message: `Update patrocinador edit count for ${id}`,
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
                    console.error("Patrocinador edit file response error:", editFileResponseData);
                    throw new TRPCError({
                        code: 'INTERNAL_SERVER_ERROR',
                        message: `GitHub API responded with status ${editFileResponse.status}`,
                    });
                }

                return {
                    imageUrl,
                    editCount,
                };
            } catch (error) {
                console.error("Error updating patrocinador file:", error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: "Error uploading file",
                });
            }
        }),
});

