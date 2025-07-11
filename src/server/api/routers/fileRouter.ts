import { z } from "zod";
import { createTRPCRouter, ifmsaEmailProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { githubFetch, buildGithubApiUrl, buildCdnUrl, GITHUB_TOKEN, GITHUB_CONFIG } from "~/server/githubClient";
import { env } from "~/env";

const PLACEHOLDER_IMAGE_URL = "https://placehold.co/400";

// Define a type for the GitHub API response
interface GitHubFileResponse {
  sha: string;
  content?: string;
  [key: string]: unknown;
}

const fetchFileContent = async (url: string) => {
  const response = await githubFetch(url);

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
    /https:\/\/cdn\.jsdelivr\.net\/gh\/([^\/]+)\/([^\/]+)\/noticias\/([^\/]+)\/([^\/]+)/
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
    const response = await githubFetch(githubUrl);

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
    const deleteResponse = await githubFetch(githubUrl, {
      method: "DELETE",
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

// Constants for file validation
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB max file size
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

// Helper function to validate base64 image
const validateBase64Image = (base64String: string): { isValid: boolean; error?: string; mimeType?: string; size?: number } => {
  try {
    // Check if it's a data URL or raw base64
    let base64Data: string;
    let mimeType: string | undefined;
    
    if (base64String.startsWith('data:')) {
      const matches = base64String.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches || !matches[1] || !matches[2]) {
        return { isValid: false, error: 'Invalid base64 format' };
      }
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = base64String;
    }
    
    // Normalize base64 string by removing whitespace and line breaks
    const normalizedBase64 = base64Data.replace(/\s/g, '');
    
    // Decode base64 to check size
    const buffer = Buffer.from(normalizedBase64, 'base64');
    const size = buffer.length;
    
    // Check file size
    if (size > MAX_FILE_SIZE) {
      return { isValid: false, error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB` };
    }
    
    // If we couldn't determine mime type from data URL, try to detect from buffer
    if (!mimeType) {
      // Check magic numbers for common image formats
      if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
        mimeType = 'image/jpeg';
      } else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
        mimeType = 'image/png';
      } else if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
        // Could be WebP
        const webpCheck = buffer.toString('ascii', 8, 12);
        if (webpCheck === 'WEBP') {
          mimeType = 'image/webp';
        }
      }
    }
    
    // Validate mime type
    if (!mimeType || !ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return { isValid: false, error: `Invalid file type. Allowed types: ${ALLOWED_IMAGE_TYPES.join(', ')}` };
    }
    
    // Additional security check: ensure it's valid base64
    // We validate by attempting to decode and checking if we get a reasonable buffer size
    // This is more reliable than string comparison since base64 can have different padding/formatting
    if (buffer.length === 0) {
      return { isValid: false, error: 'Invalid base64 encoding - empty result' };
    }
    
    // Additional check: verify the base64 string contains valid characters
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(normalizedBase64)) {
      return { isValid: false, error: 'Invalid base64 encoding - contains invalid characters' };
    }
    
    return { isValid: true, mimeType, size };
  } catch (error) {
    return { isValid: false, error: 'Failed to validate image' };
  }
};

export const fileRouter = createTRPCRouter({
  uploadFile: ifmsaEmailProcedure
    .input(z.object({
      id: z.string().min(1).max(100).regex(/^[a-zA-Z0-9-_]+$/, 'ID must be alphanumeric with hyphens or underscores only'),
      markdown: z.string().min(1).max(100000), // Max 100KB for markdown content
      image: z.string().nullable(), // Expecting base64 string or null
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, markdown, image } = input;
      
      // Validate image if provided
      if (image) {
        const validation = validateBase64Image(image);
        if (!validation.isValid) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: validation.error || 'Invalid image file',
          });
        }
      }

      const COMMIT_MESSAGE = `Add new notícia: ${id}`;
      const markdownFilename = `content.md`;
      const imageFilename = `cover.png`;

      const GITHUB_API_URL_MARKDOWN = (filename: string) => `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/noticias/${id}/${filename}`;

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

        const markdownResponse = await githubFetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "PUT",
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

          const imageResponse = await githubFetch(GITHUB_API_URL_IMAGE(imageFilename || ''), {
            method: "PUT",
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

          imageUrl = `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/noticias/${id}/${imageFilename}`;
        }

        return {
          markdownUrl: `https://cdn.jsdelivr.net/gh/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/noticias/${id}/${markdownFilename}`,
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
      const GITHUB_API_URL_MARKDOWN = (filename: string) => `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_IMAGE = (filename: string) => `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/noticias/${id}/${filename}`;
      const GITHUB_API_URL_EDIT = `https://api.github.com/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/noticias/${id}/edit.txt`;

      const fileContent = Buffer.from(markdown).toString("base64");
      const imageContent = image ? Buffer.from(image, "base64").toString("base64") : null;

      let editCount = 1;
      const editSha = await getFileShaIfExists(GITHUB_API_URL_EDIT);

      if (editSha) {
        try {
          const existingEditFile = await fetchFileContent(GITHUB_API_URL_EDIT);
          editCount = parseInt(Buffer.from(existingEditFile.content ?? '', 'base64').toString('utf-8'), 10) + 1;
        } catch (error) {
          console.log("Edit file exists but couldn't parse content, using count 1.");
        }
      } else {
        console.log("Edit file not found, creating a new one with count 1.");
      }

      const markdownFilename = `content_${editCount}.md`;
      const imageFilename = imageContent ? `cover_${editCount}.png` : null;

      let uploadedMarkdownPath: string | null = null;
      let uploadedImagePath: string | null = null;
      let editCountUpdated = false;

      try {
        // Update edit count first to ensure version tracking consistency
        console.log(`Updating edit count to ${editCount} for ${id}`);
        try {
          const editCountResponse = await githubFetch(GITHUB_API_URL_EDIT, {
            method: "PUT",
            body: JSON.stringify(createUploadRequestBody(`Update edit count for ${id}`, Buffer.from(editCount.toString()).toString("base64"), editSha))
          });

          if (!editCountResponse.ok) {
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to update edit count: ${editCountResponse.status}` });
          }
          editCountUpdated = true;
        } catch (editCountError) {
          console.error("Failed to update edit count:", editCountError);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to update edit count: ${editCountError instanceof Error ? editCountError.message : 'Unknown error'}` });
        }

        console.log(`Uploading new versioned files: ${markdownFilename}${imageFilename ? `, ${imageFilename}` : ''}`);

        const markdownResponse = await githubFetch(GITHUB_API_URL_MARKDOWN(markdownFilename), {
          method: "PUT",
          body: JSON.stringify(createUploadRequestBody(COMMIT_MESSAGE, fileContent))
        });

        if (!markdownResponse.ok) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to upload new markdown file: ${markdownFilename}` });
        }
        uploadedMarkdownPath = GITHUB_API_URL_MARKDOWN(markdownFilename);

        let imageUrl = imageLink;
        if (imageContent && imageFilename) {
          const imageResponse = await githubFetch(GITHUB_API_URL_IMAGE(imageFilename), {
            method: "PUT",
            body: JSON.stringify(createUploadRequestBody(`Update image for ${id}`, imageContent))
          });

          if (!imageResponse.ok) {
            // If image upload fails, roll back the markdown upload.
            throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to upload new image file: ${imageFilename}` });
          }
          uploadedImagePath = GITHUB_API_URL_IMAGE(imageFilename);
          imageUrl = buildCdnUrl(`noticias/${id}/${imageFilename}`);
        }

        // Asynchronously delete old files. Failure here is logged but doesn't fail the operation.
        deleteOldFile(contentLink).catch(e => console.error("Failed to delete old markdown file in background", e));
        if (imageContent && imageLink !== PLACEHOLDER_IMAGE_URL) {
          deleteOldFile(imageLink).catch(e => console.error("Failed to delete old image file in background", e));
        }

        return {
          markdownUrl: buildCdnUrl(`noticias/${id}/${markdownFilename}`),
          imageUrl,
          editCount
        };

      } catch (error) {
        console.error("An error occurred during the update process, attempting rollback...", error);

        // Rollback uploaded files in reverse order (image first, then markdown)
        if (uploadedImagePath) {
          console.log(`Rolling back image upload: ${uploadedImagePath}`);
          const imageSha = await getFileShaIfExists(uploadedImagePath);
          if (imageSha) {
            try {
              await githubFetch(uploadedImagePath, { 
                  method: 'DELETE', 
                  body: JSON.stringify({ message: 'Rollback: delete failed update', sha: imageSha, committer: { name: 'Admin Panel', email: 'admin@ifmsabrazil.org' } })
              });
            } catch (cleanupError) {
              console.error(`Failed to cleanup rollback file: ${uploadedImagePath}`, cleanupError);
            }
          }
        }

        if (uploadedMarkdownPath) {
          console.log(`Rolling back markdown upload: ${uploadedMarkdownPath}`);
          const markdownSha = await getFileShaIfExists(uploadedMarkdownPath);
          if (markdownSha) {
            try {
              await githubFetch(uploadedMarkdownPath, { 
                  method: 'DELETE', 
                  body: JSON.stringify({ message: 'Rollback: delete failed update', sha: markdownSha, committer: { name: 'Admin Panel', email: 'admin@ifmsabrazil.org' } })
              });
            } catch (cleanupError) {
              console.error(`Failed to cleanup rollback file: ${uploadedMarkdownPath}`, cleanupError);
            }
          }
        }

        // Rollback edit count if it was updated
        if (editCountUpdated) {
          console.log(`Rolling back edit count for ${id}`);
          try {
            const rollbackEditCount = editCount - 1;
            const currentEditSha = await getFileShaIfExists(GITHUB_API_URL_EDIT);
            if (currentEditSha) {
              await githubFetch(GITHUB_API_URL_EDIT, {
                method: "PUT",
                body: JSON.stringify(createUploadRequestBody(`Rollback edit count for ${id}`, Buffer.from(rollbackEditCount.toString()).toString("base64"), currentEditSha))
              });
            }
          } catch (editCountRollbackError) {
            console.error(`Failed to rollback edit count for ${id}:`, editCountRollbackError);
          }
        }

        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Error updating file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    })
});
