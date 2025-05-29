import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";
import { image } from "@uiw/react-md-editor";

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

export const timesRouter = createTRPCRouter({
    getByType: ifmsaEmailProcedure
        .input(z.object({
            type: z.string().min(1),
        }))
        .query(({ ctx, input }) => {
            return ctx.db.timeRegional.findMany({
                where: {
                    type: input.type,
                },
            });
        }),

    getMembros: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
        }))
        .query(({ ctx, input }) => {
            return ctx.db.membroTime.findMany({
                where: {
                    timeID: input.id,
                },
            });
        }),
    latestTimeMembroId: ifmsaEmailProcedure.query(async ({ ctx }) => {
        const latestTimeMembro = await ctx.db.membroTime.findFirst({ orderBy: { id: "desc" } });
        return latestTimeMembro?.id || 0;
    }),

    getOneTimeMembro: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
        }))
        .query(async ({ ctx, input }) => {
            return ctx.db.membroTime.findUnique({
                where: {
                    id: input.id,
                },
            });
        }),
    createTimeMembro: ifmsaEmailProcedure
        .input(z.object({
            name: z.string().min(1),
            role: z.string().min(1),
            timeID: z.number().min(1),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membroTime.create({
                data: {
                    name: input.name,
                    role: input.role,
                    timeID: input.timeID,
                    imageLink: input.imageLink,
                }
            });
        }),
    updateTimeMembro: ifmsaEmailProcedure
        .input(z.object({
            id: z.number().min(1),
            name: z.string().min(1),
            role: z.string().min(1),
            timeID: z.number().min(1).optional(),
            imageLink: z.string().optional(),
        }))
        .mutation(async ({ ctx, input }) => {
            return ctx.db.membroTime.update({
                where: {
                    id: input.id,
                },
                data: {
                    name: input.name,
                    role: input.role,
                    timeID: input.timeID,
                    imageLink: input.imageLink,
                }
            });
        }),

    delete: ifmsaEmailProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ ctx, input }) => {
            const { id } = input;

            // Retrieve the EB details
            const membroTime = await ctx.db.membroTime.findUnique({ where: { id } });
            if (!membroTime) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: `Membro com ID ${id} não encontrado`,
                });
            }

            const { imageLink } = membroTime;

            try {
                // Attempt to delete the files from GitHub
                if (imageLink) {
                    await deleteOldFile(imageLink);
                }

                // Proceed to delete the database entry
                return ctx.db.membroTime.delete({ where: { id } });
            } catch (error) {
                console.error("Error deleting files from GitHub:", error);

                // If error, prompt user for confirmation to delete the database entry anyway
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: `Error deleting MembroTime. Note this ID (${id}) and ask the CM-D to delete manually. After that, click confirm to delete from the database anyway.`,
                });
            }
        }),
});