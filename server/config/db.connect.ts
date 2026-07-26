import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { envServer } from "../utils/envServer";

const pool = new Pool({ connectionString: envServer.DATABASE_URL });
const db = drizzle({ client: pool });

export { db };
