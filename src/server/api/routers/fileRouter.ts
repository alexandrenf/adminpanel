import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

const GITHUB_TOKEN = env.GITHUB_TOKEN;
const REPO_OWNER = "ifmsabtazil";
const REPO_NAME = "dataifmsabrazil";
const PLACEHOLDER_IMAGE_URL = "https://placehold.co/400";

export const fileRouter = createTRPCRouter({
  uploadFile: protectedProcedure
    .input(z.object({
      id: z.string().min(1),
      markdown: z.string().min(1),
      image: z.instanceof(File).nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, markdown, image } = input;

      const COMMIT_MESSAGE = `Add new notícia: ${id}`;
      const GITHUB_API_URL_MARKDOWN = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/content.md`;
      const GITHUB_API_URL_IMAGE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/cover.png`;

      const fileContent = Buffer.from(markdown).toString("base64");
      const imageContent = image ? Buffer.from(await image.arrayBuffer()).toString("base64") : null;

      try {
        // Upload the markdown file
        const markdownResponse = await fetch(GITHUB_API_URL_MARKDOWN, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: COMMIT_MESSAGE,
            content: fileContent,
            committer: {
              name: "Your Name",
              email: "your-email@example.com",
            },
          }),
        });

        const markdownResponseData = await markdownResponse.json();
        if (!markdownResponse.ok) {
          console.error("Markdown response error:", markdownResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `GitHub API responded with status ${markdownResponse.status}`,
          });
        }

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

          const imageResponseData = await imageResponse.json();
          if (!imageResponse.ok) {
            console.error("Image response error:", imageResponseData);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `GitHub API responded with status ${imageResponse.status}`,
            });
          }

          imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/cover.png`;
        }

        return {
          markdownUrl: `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/content.md`,
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
