import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
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
  [key: string]: unknown;
}

export const fileRouter = createTRPCRouter({
  uploadFile: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      markdown: z.string().min(1),
      image: z.string().nullable(), // Expecting base64 string or null
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, markdown, image } = input;

      const COMMIT_MESSAGE = `Add new notícia: ${id}`;
      let markdownFilename = `content.md`;
      let imageFilename = `cover.png`;

      const GITHUB_API_URL_MARKDOWN = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;

      const fileContent = Buffer.from(markdown).toString("base64");
      const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

      const randomSuffix = () => Math.floor(100 + Math.random() * 900).toString();

      try {
        // Check if markdown file exists and generate new name if it does
        const existingMarkdownResponse = await fetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "GET",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
        });
        const existingMarkdownData: GitHubFileResponse | null = existingMarkdownResponse.ok ? await existingMarkdownResponse.json() as GitHubFileResponse : null;
        const markdownSha = existingMarkdownData ? existingMarkdownData.sha : undefined;
        if (existingMarkdownData) {
          markdownFilename = `content_${randomSuffix()}.md`;
        }

        // Upload the markdown file
        const markdownResponse = await fetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: COMMIT_MESSAGE,
            content: fileContent,
            sha: markdownSha,
            committer: {
              name: "Your Name",
              email: "your-email@example.com",
            },
          }),
        });

        const markdownResponseData: GitHubFileResponse = await markdownResponse.json() as GitHubFileResponse;
        if (!markdownResponse.ok) {
          console.error("Markdown response error:", markdownResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `GitHub API responded with status ${markdownResponse.status}`,
          });
        }

        let imageUrl = PLACEHOLDER_IMAGE_URL;

        if (imageContent) {
          // Check if image file exists and generate new name if it does
          const existingImageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename), {
            method: "GET",
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
            },
          });
          const existingImageData: GitHubFileResponse | null = existingImageResponse.ok ? await existingImageResponse.json() as GitHubFileResponse : null;
          const imageSha = existingImageData ? existingImageData.sha : undefined;
          if (existingImageData) {
            imageFilename = `cover_${randomSuffix()}.png`;
          }

          // Upload the image file
          const imageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename), {
            method: "PUT",
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: `Add image for ${id}`,
              content: imageContent,
              sha: imageSha,
              committer: {
                name: "Your Name",
                email: "your-email@example.com",
              },
            }),
          });

          const imageResponseData: GitHubFileResponse = await imageResponse.json() as GitHubFileResponse;
          if (!imageResponse.ok) {
            console.error("Image response error:", imageResponseData);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `GitHub API responded with status ${imageResponse.status}`,
            });
          }

          imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${imageFilename}`;
        }

        return {
          markdownUrl: `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${markdownFilename}`,
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
});
