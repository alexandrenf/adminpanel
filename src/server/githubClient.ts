import { env } from "~/env";

export const GITHUB_TOKEN = env.GITHUB_TOKEN;

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

/**
 * Enhanced fetch function for GitHub API calls.
 * Automatically includes the Authorization header with the GitHub token.
 * Implements retry logic with exponential backoff for transient server errors.
 *
 * @param url - The GitHub API URL to fetch.
 * @param options - Additional fetch options (method, body, etc.).
 * @returns A Promise that resolves to the Response object.
 * @throws An error if the request fails after all retry attempts.
 */
export const githubFetch = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    "Authorization": `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  let lastError: Error | null = null;

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Client errors (4xx) are not retried as they indicate a problem with the request itself.
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Server errors (5xx) or other network issues are retried.
      if (!response.ok) {
        throw new Error(`GitHub API responded with an error: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      if (i < MAX_RETRIES - 1) {
        const delay = INITIAL_DELAY_MS * Math.pow(2, i); // Exponential backoff
        console.warn(
          `GitHub fetch to ${url} failed on attempt ${i + 1}/${MAX_RETRIES}. Retrying in ${delay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If all retries fail, throw a comprehensive error.
  const finalError = new Error(
    `Failed to complete GitHub API request to ${url} after ${MAX_RETRIES} attempts. Last error: ${lastError?.message}`
  );
  console.error(finalError.message, lastError);
  throw finalError;
};

/**
 * GitHub API configuration constants
 */
export const GITHUB_CONFIG = {
  REPO_OWNER: 'ifmsabrazil',
  REPO_NAME: 'dataifmsabrazil',
  BASE_API_URL: 'https://api.github.com',
  CDN_BASE_URL: 'https://cdn.jsdelivr.net/gh',
} as const;

/**
 * Helper function to build GitHub API URLs
 */
export const buildGithubApiUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${GITHUB_CONFIG.BASE_API_URL}/repos/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/contents/${cleanPath}`;
};

/**
 * Helper function to build jsDelivr CDN URLs
 */
export const buildCdnUrl = (path: string): string => {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${GITHUB_CONFIG.CDN_BASE_URL}/${GITHUB_CONFIG.REPO_OWNER}/${GITHUB_CONFIG.REPO_NAME}/${cleanPath}`;
}; 