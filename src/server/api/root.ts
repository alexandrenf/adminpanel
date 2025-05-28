import { postRouter } from "~/server/api/routers/post";
import { fileRouter } from "~/server/api/routers/fileRouter";
import { ebRouter } from "~/server/api/routers/ebRouter";
import { ebPhotoRouter } from "~/server/api/routers/ebPhoto";
import { arquivoRouter } from "~/server/api/routers/arquivoRouter";
import { photoRouter } from "~/server/api/routers/photoRouter";
import { gestaoRouter } from "./routers/gestaoRouter";
import { arquivadoRouter } from "./routers/arquivadoRouter";
import { timesRouter } from "./routers/timesRouter";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { crRouter } from "./routers/crRouter";
import { regionalRouter } from "./routers/regionalRouter";
import { configRouter } from "./routers/configRouter";
import { registrosRouter } from "~/server/api/routers/registrosRouter";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  file: fileRouter,
  eb: ebRouter,
  ebPhoto: ebPhotoRouter,
  arquivo: arquivoRouter,
  photo: photoRouter,
  gestao: gestaoRouter,
  arquivado: arquivadoRouter,
  cr: crRouter,
  regional: regionalRouter,
  times: timesRouter,
  config: configRouter,
  registros: registrosRouter,
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
