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
      const regex = /https:\/\/cdn.jsdelivr.net\/gh\/([^\/]+)\/([^\/]+)\/noticias\/([^\/]+)\/([^\/]+)/;
      const match = jsDelivrUrl.match(regex);
      if (!match) return null;

      const [_, owner, repo, id, filename] = match;
      return `https://api.github.com/repos/${owner}/${repo}/contents/noticias/${id}/${filename}`;
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

export const fileRouter = createTRPCRouter({
  uploadFile: ifmsaEmailProcedure
    .input(z.object({
      id: z.string().min(1),
      markdown: z.string().min(1),
      image: z.string().nullable(), // Expecting base64 string or null
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, markdown, image } = input;

      const COMMIT_MESSAGE = `Add new notícia: ${id}`;
      const markdownFilename = `content.md`;
      const imageFilename = `cover.png`;

      const GITHUB_API_URL_MARKDOWN = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;

      const fileContent = Buffer.from(markdown).toString("base64");
      const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

        try {
        // Check if markdown file already exists and get SHA if it does
        let markdownSha: string | undefined;
        try {
          const existingMarkdownFile = await fetchFileContent(GITHUB_API_URL_MARKDOWN(markdownFilename));
          markdownSha = existingMarkdownFile.sha;
        } catch (error) {
          // File doesn't exist, which is fine for new uploads
        }

        // Upload the markdown file
        const markdownRequestBody: any = {
          message: COMMIT_MESSAGE,
          content: fileContent,
          committer: {
            name: "Your Name",
            email: "your-email@example.com",
          },
        };

        // Add SHA if file exists (for updates)
        if (markdownSha) {
          markdownRequestBody.sha = markdownSha;
        }

        const markdownResponse = await fetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(markdownRequestBody),
        });

        if (!markdownResponse.ok) {
          const markdownResponseData = await markdownResponse.text();
          console.error("Markdown response error:", markdownResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `GitHub API responded with status ${markdownResponse.status}`,
          });
        }

        let imageUrl = PLACEHOLDER_IMAGE_URL;

        if (imageContent) {
          // Check if image file already exists and get SHA if it does
          let imageSha: string | undefined;
          try {
            const existingImageFile = await fetchFileContent(GITHUB_API_URL_IMAGE(imageFilename || ''));
            imageSha = existingImageFile.sha;
          } catch (error) {
            // File doesn't exist, which is fine for new uploads
          }

          // Upload the image file
          const imageRequestBody: any = {
            message: `Add image for ${id}`,
            content: imageContent,
            committer: {
              name: "Your Name",
              email: "your-email@example.com",
            },
          };

          // Add SHA if file exists (for updates)
          if (imageSha) {
            imageRequestBody.sha = imageSha;
          }

          const imageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
            method: "PUT",
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(imageRequestBody),
          });

          if (!imageResponse.ok) {
            const imageResponseData = await imageResponse.text();
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

  updateFile: ifmsaEmailProcedure
    .input(z.object({
      id: z.string().min(1),
      markdown: z.string().min(1),
      image: z.string().nullable(), // Expecting base64 string or null
      contentLink: z.string().url().min(1),
      imageLink: z.string().url().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, markdown, image, contentLink, imageLink } = input;

      const COMMIT_MESSAGE = `Update notícia: ${id}`;
      const GITHUB_API_URL_MARKDOWN = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_EDIT = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/edit.txt`;

      const fileContent = Buffer.from(markdown).toString("base64");
      const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

      const randomSuffix = () => Math.floor(100 + Math.random() * 900).toString();

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

        const markdownFilename = `content_${editCount}.md`;
        const imageFilename = imageContent ? `cover_${editCount}.png` : null;

        // Check if markdown file already exists and get SHA if it does
        let markdownSha: string | undefined;
        try {
          const existingMarkdownFile = await fetchFileContent(GITHUB_API_URL_MARKDOWN(markdownFilename));
          markdownSha = existingMarkdownFile.sha;
        } catch (error) {
          // File doesn't exist, which is fine for new uploads
        }

        // Upload the new markdown file
        const markdownRequestBody: any = {
          message: COMMIT_MESSAGE,
          content: fileContent,
          committer: {
            name: "Your Name",
            email: "your-email@example.com",
          },
        };

        // Add SHA if file exists (for updates)
        if (markdownSha) {
          markdownRequestBody.sha = markdownSha;
        }

        const markdownResponse = await fetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(markdownRequestBody),
        });

        if (!markdownResponse.ok) {
          const markdownResponseData = await markdownResponse.text();
          console.error("Markdown response error:", markdownResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `GitHub API responded with status ${markdownResponse.status}`,
          });
        }

        let imageUrl = imageLink;

        if (imageContent) {
          // Check if image file already exists and get SHA if it does
          let imageSha: string | undefined;
          try {
            const existingImageFile = await fetchFileContent(GITHUB_API_URL_IMAGE(imageFilename || ''));
            imageSha = existingImageFile.sha;
          } catch (error) {
            // File doesn't exist, which is fine for new uploads
          }

          // Upload the new image file
          const imageRequestBody: any = {
            message: `Update image for ${id}`,
            content: imageContent,
            committer: {
              name: "Your Name",
              email: "your-email@example.com",
            },
          };

          // Add SHA if file exists (for updates)
          if (imageSha) {
            imageRequestBody.sha = imageSha;
          }

          const imageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
            method: "PUT",
            headers: {
              Authorization: `token ${GITHUB_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(imageRequestBody),
          });

          if (!imageResponse.ok) {
            const imageResponseData = await imageResponse.text();
            console.error("Image response error:", imageResponseData);
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `GitHub API responded with status ${imageResponse.status}`,
            });
          }

          imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${imageFilename}`;

          // Delete the old image file
          await deleteOldFile(imageLink);
        }

        // Delete the old markdown file
        await deleteOldFile(contentLink);

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
          markdownUrl: `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${markdownFilename}`,
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
