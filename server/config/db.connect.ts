import { drizzle } from "drizzle-orm/neon-http";
import { envServer } from "../utils/envServer";

const db = drizzle(envServer.DATABASE_URL);

export { db };
