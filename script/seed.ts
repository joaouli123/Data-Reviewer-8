
import { db } from "../server/db";
import { users } from "@shared/schema";

async function main() {
  console.log("Seeding database...");
  try {
    // Try to insert a demo user. 
    // We assume 'users' table exists and has username/password based on typical template.
    // If the schema differs, this might fail, but we catch the error.
    await db.insert(users).values({
      username: "demo",
      password: "password123" 
    }).onConflictDoNothing();
    console.log("Seeding completed successfully.");
  } catch (e) {
    console.error("Seeding failed (schema might mismatch):", e);
  }
}

main().catch(console.error);
