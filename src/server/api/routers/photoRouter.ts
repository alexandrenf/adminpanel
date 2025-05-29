import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";
const PLACEHOLDER_IMAGE_URL = "https://placehold.co/400";

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

const deleteOldFile = async (url: string) => {
    try {
        const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
            const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)\/([^\/]+)/;
            const match = jsDelivrUrl.match(regex);
            if (!match) return null;

            const [_, owner, repo, tipo, id, filename] = match;
            return `https://api.github.com/repos/${owner}/${repo}/contents/${tipo}/${id}/${filename}`;
        };

        const githubUrl = convertJsDelivrToGitHubUrl(url);
        if (!githubUrl) {
            console.error("Invalid jsDelivr URL:", url);
            return;
        }

        const response = await fetch(githubUrl, {
            method: "GET",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
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
        const deleteResponse = await fetch(githubUrl, {
            method: "DELETE",
            headers: {
                Authorization: `token ${GITHUB_TOKEN}`,
                "Content-Type": "application/json",
            },
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

export const photoRouter = createTRPCRouter({

    uploadPhoto: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(), // Expecting base64 string or null
            tipo: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, image, tipo } = input;

            const COMMIT_MESSAGE = `Add new photo for ${tipo}: ${id}`;
            const imageFilename = `photo${new Date().getTime()}.png`;

            const GITHUB_API_URL_IMAGE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${tipo}/${id}/${imageFilename}`;

            const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

            try {
                let imageUrl = PLACEHOLDER_IMAGE_URL;

                if (imageContent) {
                    // Upload the image file
                    const imageResponse = await fetch(GITHUB_API_URL_IMAGE, {
                        method: "PUT",
                        headers: {
                            Authorization: `token ${GITHUB_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: `Add image for ${id}`,
                            content: imageContent,
                            committer: {
                                name: "Your Name",
                                email: "your-email@example.com",
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

                    imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/${tipo}/${id}/${imageFilename}`;
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

    updatePhoto: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            image: z.string().nullable(), // Expecting base64 string or null
            imageLink: z.string().url().min(1),
            tipo: z.string().min(1),
        }))
        .mutation(async ({ ctx, input }) => {
            const { id, image, imageLink, tipo } = input;

            const COMMIT_MESSAGE = `Update photo for ${tipo}: ${id}`;
            const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${tipo}/${id}/${filename}`;
            const GITHUB_API_URL_EDIT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${tipo}/${id}/edit.txt`;

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
                    // Upload the new image file
                    const imageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
                        method: "PUT",
                        headers: {
                            Authorization: `token ${GITHUB_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            message: `Update image for ${id}`,
                            content: imageContent,
                            committer: {
                                name: "Your Name",
                                email: "your-email@example.com",
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

                    imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/${tipo}/${id}/${imageFilename}`;

                    // Delete the old image file
                    await deleteOldFile(imageLink);
                }

                // Upload the edit.txt file with the updated edit count
                const editFileResponse = await fetch(GITHUB_API_URL_EDIT, {
                    method: "PUT",
                    headers: {
                        Authorization: `token ${GITHUB_TOKEN}`,
                        "Content-Type": "application/json",
                    },
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