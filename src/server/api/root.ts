import { postRouter } from "~/server/api/routers/post";
import { noticiasRouter } from "~/server/api/routers/noticias"
import { fileRouter } from "~/server/api/routers/fileRouter";
import { ebRouter } from "~/server/api/routers/ebRouter";
import { ebPhotoRouter } from "~/server/api/routers/ebPhoto";
import { arquivoRouter } from "~/server/api/routers/arquivoRouter";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  noticias: noticiasRouter,
  file: fileRouter,
  eb: ebRouter,
  ebPhoto: ebPhotoRouter,
  arquivo: arquivoRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
