import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { billingRouter } from "./routers/billing";
import { creditsRouter } from "./routers/credits";
import { dashboardRouter } from "./routers/dashboard";
import { productsRouter } from "./routers/products";
import { suiteRouter } from "./routers/suite";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  billing: billingRouter,
  credits: creditsRouter,
  dashboard: dashboardRouter,
  products: productsRouter,
  suite: suiteRouter,
});

export type AppRouter = typeof appRouter;
