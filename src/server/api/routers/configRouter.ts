import { z } from "zod";
import { TRPCError } from "@trpc/server";
import fetch from 'node-fetch';
import { env } from "~/env";

import {
  createTRPCRouter,
  ifmsaEmailProcedure,
} from "~/server/api/trpc";

const GITHUB_TOKEN = env.NEXT_PUBLIC_GITHUB_TOKEN;
const REPO_OWNER = "ifmsabrazil";
const REPO_NAME = "dataifmsabrazil";

// Helper function to safely validate GitHub API response
const validateGitHubFileResponse = (data: unknown): { sha: string } | null => {
  if (
    typeof data === 'object' && 
    data !== null && 
    'sha' in data && 
    typeof (data as any).sha === 'string'
  ) {
    return { sha: (data as any).sha };
  }
  return null;
};



// Helper function to safely parse event sponsors JSON
const parseEventSponsors = (sponsorsJson: string | null | undefined): Array<any> => {
  if (!sponsorsJson) {
    return [];
  }
  
  try {
    const parsed = JSON.parse(sponsorsJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error parsing eventSponsors JSON:", error);
    return [];
  }
};

// Sponsor validation schema
const sponsorSchema = z.object({
  name: z.string().min(1),
  logo: z.string().url().optional(),
  tier: z.string().optional(),
  email: z.string().email().optional(),
  acronym: z.string().optional(),
  website: z.string().url().optional(),
});

// Event configuration validation schema
const eventConfigSchema = z.object({
  eventType: z.enum(["alert", "ag"]).optional(),
  eventActive: z.boolean().optional(),
  eventTitle: z.string().optional(),
  eventDescription: z.string().optional(),
  eventLogo: z.string().optional(),
  eventDateStart: z.date().optional(),
  eventDateEnd: z.date().optional(),
  eventCity: z.string().optional(),
  eventState: z.string().optional(),
  eventVenue: z.string().optional(),
  survivalKitUrl: z.string().optional(),
  registrationUrl: z.string().optional(),
  survivalKitStatus: z.enum(["available", "coming_soon", "disabled"]).optional(),
  registrationStatus: z.enum(["available", "coming_soon", "disabled"]).optional(),
  eventContent: z.string().optional(),
  eventSponsors: z.array(sponsorSchema).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  showSponsors: z.boolean().optional(),
  showDownloads: z.boolean().optional(),
  eventStatus: z.enum(["upcoming", "ongoing", "past"]).optional(),
  previewPassword: z.string().optional(),
});

export const configRouter = createTRPCRouter({

  get: ifmsaEmailProcedure
    .query(async ({ ctx }) => {
      return ctx.db.config.findMany();
    }),

  // Upload event logo to GitHub
  uploadEventLogo: ifmsaEmailProcedure
    .input(z.object({
      image: z.string().nullable(), // base64 string
      eventType: z.enum(["alert", "ag"]).default("ag"),
    }))
    .mutation(async ({ input }) => {
      const { image, eventType } = input;
      
      if (!image) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Image is required",
        });
      }

      const imageFilename = `logo-${eventType}-${new Date().getTime()}.webp`;
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/events/logos/${imageFilename}`;
      const imageContent = image; // Image is already base64 encoded

      try {
        const requestBody = {
          message: `Upload ${eventType} event logo`,
          content: imageContent,
          committer: {
            name: "Admin Panel",
            email: "admin@ifmsabrazil.org",
          },
        };

        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const responseData = await response.text();
          console.error("GitHub API error:", responseData);
          throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/events/logos/${imageFilename}`;
        
        return {
          imageUrl,
          success: true,
        };
      } catch (error) {
        console.error("Error uploading event logo:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Error uploading event logo",
        });
      }
    }),

  // Upload sponsor logo to GitHub
  uploadSponsorLogo: ifmsaEmailProcedure
    .input(z.object({
      image: z.string().nullable(), // base64 string
      sponsorName: z.string().min(1),
      eventType: z.enum(["alert", "ag"]).default("ag"),
    }))
    .mutation(async ({ input }) => {
      const { image, sponsorName, eventType } = input;
      
      if (!image) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Image is required",
        });
      }

      // Clean sponsor name for filename
      const cleanSponsorName = sponsorName.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/--+/g, '-')
        .replace(/^-|-$/g, '');

      const imageFilename = `sponsor-${cleanSponsorName}-${new Date().getTime()}.webp`;
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/events/sponsors/${imageFilename}`;
      const imageContent = image; // Image is already base64 encoded

      try {
        const requestBody = {
          message: `Upload sponsor logo: ${sponsorName}`,
          content: imageContent,
          committer: {
            name: "Admin Panel",
            email: "admin@ifmsabrazil.org",
          },
        };

        const response = await fetch(apiUrl, {
          method: "PUT",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const responseData = await response.text();
          console.error("GitHub API error:", responseData);
          throw new Error(`GitHub API responded with status ${response.status}`);
        }

        const imageUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/events/sponsors/${imageFilename}`;
        
        return {
          imageUrl,
          success: true,
        };
      } catch (error) {
        console.error("Error uploading sponsor logo:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Error uploading sponsor logo",
        });
      }
    }),

  // Delete file from GitHub
  deleteFileFromGitHub: ifmsaEmailProcedure
    .input(z.object({
      fileUrl: z.string().url(),
      fileType: z.enum(["event-logo", "sponsor-logo"]),
    }))
    .mutation(async ({ input }) => {
      const { fileUrl, fileType } = input;
      
      // Extract file path from CDN URL
      const cdnBaseUrl = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/`;
      if (!fileUrl.startsWith(cdnBaseUrl)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "Invalid file URL - not from our CDN",
        });
      }

      const filePath = fileUrl.replace(cdnBaseUrl, '');
      const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;

      try {
        // First, get the file to obtain its SHA
        const getResponse = await fetch(apiUrl, {
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
        });

        if (!getResponse.ok) {
          if (getResponse.status === 404) {
            // File doesn't exist, consider it already deleted
            return { success: true, message: "File already deleted or not found" };
          }
          throw new Error(`GitHub API responded with status ${getResponse.status}`);
        }

        const fileData = await getResponse.json();
        const validated = validateGitHubFileResponse(fileData);
        
        if (!validated?.sha) {
          throw new Error("Could not get file SHA for deletion");
        }

        // Delete the file
        const deleteResponse = await fetch(apiUrl, {
          method: "DELETE",
          headers: {
            Authorization: `token ${GITHUB_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `Delete ${fileType}: ${filePath}`,
            sha: validated.sha,
            committer: {
              name: "Admin Panel",
              email: "admin@ifmsabrazil.org",
            },
          }),
        });

        if (!deleteResponse.ok) {
          const responseData = await deleteResponse.text();
          console.error("GitHub API delete error:", responseData);
          throw new Error(`GitHub API responded with status ${deleteResponse.status}`);
        }

        return {
          success: true,
          message: "File deleted successfully",
        };
      } catch (error) {
        console.error("Error deleting file from GitHub:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Error deleting file from GitHub",
        });
      }
    }),

  // Legacy alert configuration update
  update: ifmsaEmailProcedure
    .input(z.object({
      id: z.number(),
      toggleDate: z.boolean().optional(),
      dateStart: z.string().optional(),
      dateEnd: z.string().optional(),
      toggleMessage: z.boolean().optional(),
      message: z.string().optional(),
      toggleButton: z.boolean().optional(),
      buttonText: z.string().optional(),
      buttonUrl: z.string().optional(),
      title: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.config.update({
        where: { id: input.id },
        data: {
          toggleDate: input.toggleDate,
          dateStart: input.dateStart ? new Date(input.dateStart) : undefined,
          dateEnd: input.dateEnd ? new Date(input.dateEnd) : undefined,
          toggleMessage: input.toggleMessage,
          message: input.message,
          toggleButton: input.toggleButton,
          buttonText: input.buttonText,
          buttonUrl: input.buttonUrl,
          title: input.title,
          updatedBy: ctx.session.user.id,
        },
      })
    }),

  // Get current event configuration
  getEvent: ifmsaEmailProcedure
    .query(async ({ ctx }) => {
      const configs = await ctx.db.config.findMany();
      if (!configs || configs.length === 0) {
        // Create default config if none exists
        try {
          const defaultConfig = await ctx.db.config.create({
            data: {
              eventType: "alert",
              eventActive: false,
              showSponsors: true,
              showDownloads: true,
              eventStatus: "upcoming",
              survivalKitStatus: "coming_soon",
              registrationStatus: "coming_soon",
              primaryColor: "#00508c",
              secondaryColor: "#fac800",
              previewPassword: "",
              updatedBy: ctx.session.user.id,
            },
          });
          return defaultConfig;
        } catch (error) {
          console.error("Error creating default configuration:", error);
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "Failed to create default configuration",
          });
        }
      }
      
      const config = configs[0];
      if (!config) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Configuration exists but is invalid",
        });
      }
      
      return config;
    }),

  // Update event configuration
  updateEvent: ifmsaEmailProcedure
    .input(z.object({
      id: z.number(),
      eventConfig: eventConfigSchema,
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, eventConfig } = input;

      try {
        const updatedConfig = await ctx.db.config.update({
          where: { id },
          data: {
            // Event configuration
            eventType: eventConfig.eventType,
            eventActive: eventConfig.eventActive,
            eventTitle: eventConfig.eventTitle,
            eventDescription: eventConfig.eventDescription,
            eventLogo: eventConfig.eventLogo,
            
            // Event dates and location
            eventDateStart: eventConfig.eventDateStart,
            eventDateEnd: eventConfig.eventDateEnd,
            eventCity: eventConfig.eventCity,
            eventState: eventConfig.eventState,
            eventVenue: eventConfig.eventVenue,
            
            // Event downloads and links
            survivalKitUrl: eventConfig.survivalKitUrl,
            registrationUrl: eventConfig.registrationUrl,
            survivalKitStatus: eventConfig.survivalKitStatus,
            registrationStatus: eventConfig.registrationStatus,
            
            // Event content
            eventContent: eventConfig.eventContent,
            
            // Event sponsors (JSON stringified)
            eventSponsors: eventConfig.eventSponsors ? JSON.stringify(eventConfig.eventSponsors) : undefined,
            
            // Event branding
            primaryColor: eventConfig.primaryColor,
            secondaryColor: eventConfig.secondaryColor,
            
            // Configuration flags
            showSponsors: eventConfig.showSponsors,
            showDownloads: eventConfig.showDownloads,
            eventStatus: eventConfig.eventStatus,
            previewPassword: eventConfig.previewPassword,
            
            // Tracking
            updatedBy: ctx.session.user.id,
          },
        });

        // Parse eventSponsors safely
        const parsedSponsors = parseEventSponsors(updatedConfig.eventSponsors);

        return {
          ...updatedConfig,
          eventSponsors: parsedSponsors,
        };
      } catch (error) {
        console.error("Error updating event configuration:", error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: "Error updating event configuration",
        });
      }
    }),

  // Get event configuration with parsed sponsors
  getEventWithDetails: ifmsaEmailProcedure
    .query(async ({ ctx }) => {
      const configs = await ctx.db.config.findMany();
      if (!configs || configs.length === 0) {
        return null;
      }
      
      const config = configs[0];
      if (!config) {
        return null;
      }
      
      // Parse eventSponsors safely
      const parsedSponsors = parseEventSponsors(config.eventSponsors);
      
      return {
        ...config,
        eventSponsors: parsedSponsors,
      };
    }),

  // Switch event type (alert vs ag)
  switchEventType: ifmsaEmailProcedure
    .input(z.object({
      eventType: z.enum(["alert", "ag"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const configs = await ctx.db.config.findMany();
      let config;
      
      if (!configs || configs.length === 0) {
        // Create new config
        config = await ctx.db.config.create({
          data: {
            eventType: input.eventType,
            eventActive: true,
            updatedBy: ctx.session.user.id,
          },
        });
      } else {
        const existingConfig = configs[0];
        if (!existingConfig) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: "Configuration exists but is invalid",
          });
        }
        
        // Update existing config
        config = await ctx.db.config.update({
          where: { id: existingConfig.id },
          data: {
            eventType: input.eventType,
            eventActive: input.eventType !== "alert", // Auto-activate for AG events
            updatedBy: ctx.session.user.id,
          },
        });
      }

      // Parse eventSponsors safely
      const parsedSponsors = parseEventSponsors(config.eventSponsors);

      return {
        ...config,
        eventSponsors: parsedSponsors,
      };
    }),
});

