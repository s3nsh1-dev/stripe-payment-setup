import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import { clientTable } from "@/server/schema/db.schema";
import { config } from "dotenv";

const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
config({ path: envFile });

const db = drizzle(process.env.DATABASE_URL!);

async function main() {
  const user: typeof clientTable.$inferInsert = {
    name: "John",
    age: 30,
    email: "john@example.com",
  };

  await db.insert(clientTable).values(user);
  console.log("New user created!");

  const users = await db.select().from(clientTable);
  console.log("Getting all users from the database: ", users);
  /*
  const users: {
    id: number;
    name: string;
    age: number;
    email: string;
  }[]
  */

  await db
    .update(clientTable)
    .set({
      age: 31,
    })
    .where(eq(clientTable.email, user.email));
  console.log("User info updated!");

  await db.delete(clientTable).where(eq(clientTable.email, user.email));
  console.log("User deleted!");
}

main();
