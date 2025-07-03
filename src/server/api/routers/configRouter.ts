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

// Helper function to upload event content to GitHub (following fileRouter patterns)
const uploadEventContent = async (eventType: string, content: string) => {
  const filename = `${eventType}-config.md`;
  const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/events/${filename}`;
  const fileContent = Buffer.from(content).toString("base64");

  try {
    // Check if file exists
    let sha: string | undefined;
    try {
      const existingFile = await fetch(apiUrl, {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      
      if (existingFile.ok) {
        const rawData = await existingFile.json();
        const validatedData = validateGitHubFileResponse(rawData);
        
        if (validatedData) {
          sha = validatedData.sha;
        } else {
          console.warn("GitHub API response does not contain valid sha field:", rawData);
          // Continue without SHA - GitHub will treat this as a new file
        }
      }
    } catch (error) {
      // File doesn't exist, proceed without SHA
    }

    const requestBody = {
      message: `Update ${eventType} event configuration`,
      content: fileContent,
      committer: {
        name: "Admin Panel",
        email: "admin@ifmsabrazil.org",
      },
      ...(sha && { sha })
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

    return `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}/events/${filename}`;
  } catch (error) {
    console.error("Error uploading event content:", error);
    throw error;
  }
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
  eventNumber: z.number().optional(),
  eventTitle: z.string().optional(),
  eventDescription: z.string().optional(),
  eventLogo: z.string().optional(),
  eventDateStart: z.date().optional(),
  eventDateEnd: z.date().optional(),
  eventCity: z.string().optional(),
  eventState: z.string().optional(),
  eventVenue: z.string().optional(),
  eventAddress: z.string().optional(),
  survivalKitUrl: z.string().optional(),
  registrationUrl: z.string().optional(),
  survivalKitStatus: z.enum(["available", "coming_soon", "disabled"]).optional(),
  registrationStatus: z.enum(["available", "coming_soon", "disabled"]).optional(),
  eventContent: z.string().optional(),
  eventSponsors: z.array(sponsorSchema).optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
  showSponsors: z.boolean().optional(),
  showDownloads: z.boolean().optional(),
  eventStatus: z.enum(["upcoming", "ongoing", "past"]).optional(),
  registrationOpen: z.boolean().optional(),
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
              registrationOpen: false,
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
      uploadContent: z.boolean().default(false), // Whether to upload content to GitHub
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, eventConfig, uploadContent } = input;

      try {
        let eventContentUrl: string | undefined = undefined;

        // Upload content to GitHub if requested and content exists
        if (uploadContent && eventConfig.eventContent && eventConfig.eventType) {
          try {
            eventContentUrl = await uploadEventContent(eventConfig.eventType, eventConfig.eventContent);
            console.log(`Content uploaded to GitHub: ${eventContentUrl}`);
          } catch (error) {
            console.error("Failed to upload content to GitHub:", error);
            // Continue with update even if GitHub upload fails
          }
        }

        const updatedConfig = await ctx.db.config.update({
          where: { id },
          data: {
            // Event configuration
            eventType: eventConfig.eventType,
            eventActive: eventConfig.eventActive,
            eventNumber: eventConfig.eventNumber,
            eventTitle: eventConfig.eventTitle,
            eventDescription: eventConfig.eventDescription,
            eventLogo: eventConfig.eventLogo,
            
            // Event dates and location
            eventDateStart: eventConfig.eventDateStart,
            eventDateEnd: eventConfig.eventDateEnd,
            eventCity: eventConfig.eventCity,
            eventState: eventConfig.eventState,
            eventVenue: eventConfig.eventVenue,
            eventAddress: eventConfig.eventAddress,
            
            // Event downloads and links
            survivalKitUrl: eventConfig.survivalKitUrl,
            registrationUrl: eventConfig.registrationUrl,
            survivalKitStatus: eventConfig.survivalKitStatus,
            registrationStatus: eventConfig.registrationStatus,
            
            // Event content
            eventContent: eventConfig.eventContent,
            eventContentUrl: eventContentUrl || undefined,
            
            // Event sponsors (JSON stringified)
            eventSponsors: eventConfig.eventSponsors ? JSON.stringify(eventConfig.eventSponsors) : undefined,
            
            // Event branding
            primaryColor: eventConfig.primaryColor,
            secondaryColor: eventConfig.secondaryColor,
            
            // SEO and metadata
            metaTitle: eventConfig.metaTitle,
            metaDescription: eventConfig.metaDescription,
            metaKeywords: eventConfig.metaKeywords,
            
            // Configuration flags
            showSponsors: eventConfig.showSponsors,
            showDownloads: eventConfig.showDownloads,
            eventStatus: eventConfig.eventStatus,
            registrationOpen: eventConfig.registrationOpen,
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
          contentUploadedToGitHub: !!eventContentUrl,
          githubContentUrl: eventContentUrl,
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

