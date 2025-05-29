import { z } from "zod";

import {
    createTRPCRouter,
    ifmsaEmailProcedure,
} from "~/server/api/trpc";

export const regionalRouter = createTRPCRouter({
    getAll: ifmsaEmailProcedure.query(({ ctx }) => {
        return ctx.db.regional.findMany();
    }),

});
