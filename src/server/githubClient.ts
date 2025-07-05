import { env } from "~/env";

export const GITHUB_TOKEN = env.GITHUB_TOKEN;

/**
 * Enhanced fetch function for GitHub API calls
 * Automatically includes the Authorization header with the GitHub token
 * 
 * @param url - The GitHub API URL to fetch
 * @param options - Additional fetch options (method, body, etc.)
 * @returns Promise<Response>
 */
export const githubFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const headers = {
    'Authorization': `token ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
  });
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