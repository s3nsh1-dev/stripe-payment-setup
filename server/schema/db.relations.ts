import { defineRelations } from "drizzle-orm";
import * as schema from "./auth-schema";

export const relations = defineRelations(schema, (r) => ({
  user: {
    sessions: r.many.session(),
    accounts: r.many.account(),
    // subscription: r.one.subscription({
    //   from: r.user.id,
    //   to: r.subscription.userId,
    // }),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id }),
  },
  account: {
    user: r.one.user({ from: r.account.userId, to: r.user.id }),
  },
  // subscription: {
  //   user: r.one.user({ from: r.subscription.userId, to: r.user.id }),
  // },
}));
