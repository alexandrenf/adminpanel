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

// Improved URL conversion with better error handling
const convertJsDelivrToGitHubUrl = (jsDelivrUrl: string) => {
  // Try different patterns for noticias
  const patterns = [
    // Standard pattern: noticias/ID/filename
    /https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)\/noticias\/([^\/]+)\/([^\/]+)/,
    // Versioned pattern with branch/tag
    /https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)@[^\/]+\/noticias\/([^\/]+)\/([^\/]+)/,
    // Alternative CDN patterns
    /https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)\/noticias\/([^\/]+)\/(.+)/
  ];

  for (const pattern of patterns) {
    const match = jsDelivrUrl.match(pattern);
    if (match) {
      const [_, owner, repo, id, filename] = match;
      return `https://api.github.com/repos/${owner}/${repo}/contents/noticias/${id}/${filename}`;
    }
  }

  // Log the URL that failed to match for debugging
  console.error("Failed to convert jsDelivr URL to GitHub API URL:", jsDelivrUrl);
  return null;
};

// Improved delete function with better error handling and verification
const deleteOldFile = async (url: string): Promise<boolean> => {
  try {
    console.log(`Attempting to delete old file: ${url}`);
    
    const githubUrl = convertJsDelivrToGitHubUrl(url);
    if (!githubUrl) {
      console.error("Invalid jsDelivr URL - cannot convert to GitHub API URL:", url);
      return false;
    }

    console.log(`Converted to GitHub API URL: ${githubUrl}`);

    // First, check if the file exists and get its SHA
    const response = await fetch(githubUrl, {
      method: "GET",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log("File not found - may have already been deleted:", url);
        return true; // Consider this success since the file doesn't exist
      }
      const responseData = await response.text();
      console.error("Failed to fetch file metadata:", responseData);
      throw new Error(`GitHub API responded with status ${response.status}: ${responseData}`);
    }

    const data: GitHubFileResponse = await response.json() as GitHubFileResponse;
    console.log(`Found file with SHA: ${data.sha}`);

    // Now delete the file
    const deleteResponse = await fetch(githubUrl, {
      method: "DELETE",
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete old file: ${url}`,
        sha: data.sha,
        committer: {
          name: "Admin Panel",
          email: "admin@ifmsabrazil.org",
        },
      }),
    });

    if (!deleteResponse.ok) {
      const deleteResponseData = await deleteResponse.text();
      console.error("Delete response error:", deleteResponseData);
      throw new Error(`Failed to delete file: ${deleteResponse.status} - ${deleteResponseData}`);
    }

    console.log(`Successfully deleted file: ${url}`);
    return true;
  } catch (error) {
    console.error(`Error deleting old file ${url}:`, error);
    // Return false to indicate failure
    return false;
  }
};

// Generic helper to get file SHA if it exists, with proper error handling and type safety
const getFileShaIfExists = async (githubApiUrl: string): Promise<string | undefined> => {
  try {
    const existingFile = await fetchFileContent(githubApiUrl);
    return existingFile.sha;
  } catch (error) {
    // File doesn't exist or other error occurred - return undefined for graceful handling
    return undefined;
  }
};

// Helper to create upload request body with proper typing
interface UploadRequestBody {
  message: string;
  content: string;
  sha?: string;
  committer: {
    name: string;
    email: string;
  };
}

const createUploadRequestBody = (
  message: string, 
  content: string, 
  sha?: string
): UploadRequestBody => {
  const body: UploadRequestBody = {
    message,
    content,
    committer: {
      name: "Admin Panel",
      email: "admin@ifmsabrazil.org",
    },
  };

  if (sha) {
    body.sha = sha;
  }

  return body;
};

// Verify file exists by checking if we can fetch it
const verifyFileExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.error(`Error verifying file existence: ${url}`, error);
    return false;
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
        const markdownSha = await getFileShaIfExists(GITHUB_API_URL_MARKDOWN(markdownFilename));

        // Upload the markdown file
        const markdownRequestBody = createUploadRequestBody(
          COMMIT_MESSAGE,
          fileContent,
          markdownSha
        );

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
          const imageSha = await getFileShaIfExists(GITHUB_API_URL_IMAGE(imageFilename));

          // Upload the image file
          const imageRequestBody = createUploadRequestBody(
            `Add image for ${id}`,
            imageContent,
            imageSha
          );

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

      try {
        console.log(`Starting update for noticia ${id}`);
        
        // Handle edit.txt to keep track of edit count
        let editCount = 1;
        const editSha = await getFileShaIfExists(GITHUB_API_URL_EDIT);

        if (editSha) {
          try {
            const existingEditFile = await fetchFileContent(GITHUB_API_URL_EDIT);
            editCount = parseInt(Buffer.from(existingEditFile.content ?? '', 'base64').toString('utf-8'), 10) + 1;
            console.log(`Current edit count: ${editCount - 1}, new count will be: ${editCount}`);
          } catch (error) {
            console.log("Edit file exists but couldn't parse content, using count 1.");
          }
        } else {
          console.log("Edit file not found, creating a new one with count 1.");
        }

        const markdownFilename = `content_${editCount}.md`;
        const imageFilename = imageContent ? `cover_${editCount}.png` : null;

        console.log(`Creating new files: ${markdownFilename}${imageFilename ? `, ${imageFilename}` : ''}`);

                 // Upload the new markdown file first
         const newMarkdownRequestBody = createUploadRequestBody(
           COMMIT_MESSAGE,
           fileContent
         );

         const markdownResponse = await fetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
           method: "PUT",
           headers: {
             Authorization: `token ${GITHUB_TOKEN}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify(newMarkdownRequestBody),
         });

        if (!markdownResponse.ok) {
          const markdownResponseData = await markdownResponse.text();
          console.error("Markdown response error:", markdownResponseData);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: `Failed to upload new markdown file: ${markdownResponse.status}`,
          });
        }

        console.log(`Successfully uploaded new markdown file: ${markdownFilename}`);

        let imageUrl = imageLink;
        let newImageUploaded = false;

        if (imageContent) {
                     // Upload the new image file
           const newImageRequestBody = createUploadRequestBody(
             `Update image for ${id}`,
             imageContent
           );

           const imageResponse = await fetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
             method: "PUT",
             headers: {
               Authorization: `token ${GITHUB_TOKEN}`,
               "Content-Type": "application/json",
             },
             body: JSON.stringify(newImageRequestBody),
           });

          if (!imageResponse.ok) {
            const imageResponseData = await imageResponse.text();
            console.error("Image response error:", imageResponseData);
                         // Try to clean up the markdown file we just created
             try {
               const newMarkdownUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/noticias/${id}/${markdownFilename}`;
               const markdownShaToDelete = await getFileShaIfExists(newMarkdownUrl);
               
               if (markdownShaToDelete) {
                 const cleanupRequestBody = createUploadRequestBody(
                   `Cleanup: Delete failed markdown upload for ${id}`,
                   "", // Empty content for delete operation (though content isn't used for DELETE)
                   markdownShaToDelete
                 );
                 
                 await fetch(newMarkdownUrl, {
                   method: "DELETE",
                   headers: {
                     Authorization: `token ${GITHUB_TOKEN}`,
                     "Content-Type": "application/json",
                   },
                   body: JSON.stringify({
                     message: cleanupRequestBody.message,
                     sha: cleanupRequestBody.sha,
                     committer: cleanupRequestBody.committer,
                   }),
                 });
               }
             } catch (cleanupError) {
               console.error("Failed to cleanup markdown file after image upload failure:", cleanupError);
             }
            
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: `Failed to upload new image file: ${imageResponse.status}`,
            });
          }

          imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${imageFilename}`;
          newImageUploaded = true;
          console.log(`Successfully uploaded new image file: ${imageFilename}`);
        }

                 // Update the edit.txt file with the new edit count
         const editRequestBody = createUploadRequestBody(
           `Update edit count for ${id}`,
           Buffer.from(editCount.toString()).toString("base64"),
           editSha
         );

         const editFileResponse = await fetch(GITHUB_API_URL_EDIT, {
           method: "PUT",
           headers: {
             Authorization: `token ${GITHUB_TOKEN}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify(editRequestBody),
         });

        if (!editFileResponse.ok) {
          const editFileResponseData = await editFileResponse.text();
          console.error("Edit file response error:", editFileResponseData);
          // This is not critical enough to fail the whole operation
          console.warn("Failed to update edit count, but continuing with file operations");
        } else {
          console.log(`Successfully updated edit count to: ${editCount}`);
        }

        // Verify new files exist before deleting old ones
        const newMarkdownUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/noticias/${id}/${markdownFilename}`;
        console.log("Verifying new markdown file exists...");
        
        // Wait a bit for CDN to update
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const markdownExists = await verifyFileExists(newMarkdownUrl);
        if (!markdownExists) {
          console.error("New markdown file not accessible via CDN, but continuing...");
        } else {
          console.log("New markdown file verified via CDN");
        }

        if (newImageUploaded) {
          console.log("Verifying new image file exists...");
          const imageExists = await verifyFileExists(imageUrl);
          if (!imageExists) {
            console.error("New image file not accessible via CDN, but continuing...");
          } else {
            console.log("New image file verified via CDN");
          }
        }

        // Now try to delete old files
        console.log("Attempting to delete old files...");
        
        // Delete the old image file first (if we uploaded a new one)
        if (newImageUploaded && imageLink !== PLACEHOLDER_IMAGE_URL) {
          const imageDeleted = await deleteOldFile(imageLink);
          if (!imageDeleted) {
            console.error("Failed to delete old image file, but continuing...");
          }
        }

        // Delete the old markdown file
        const markdownDeleted = await deleteOldFile(contentLink);
        if (!markdownDeleted) {
          console.error("Failed to delete old markdown file, but continuing...");
        }

        console.log(`Update completed for noticia ${id}`);

        return {
          markdownUrl: newMarkdownUrl,
          imageUrl,
          editCount
        };
      } catch (error) {
        console.error("Error updating file:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }),
});
