import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { like, desc } from "drizzle-orm";

async function checkUsers() {
  console.log("\n=== Checking for testadmin123 email ===");
  const testAdminUsers = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      firstname: users.firstname,
      lastname: users.lastname,
    })
    .from(users)
    .where(like(users.email, "%testadmin%"));

  console.log('Users with "testadmin" in email:', testAdminUsers);

  console.log("\n=== Recent users (last 10) ===");
  const recentUsers = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
      firstname: users.firstname,
      lastname: users.lastname,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(10);

  console.log("Recent users:");
  recentUsers.forEach((user, index) => {
    console.log(
      `${index + 1}. [${user.id}] ${user.email} - ${user.username} (${user.firstname} ${user.lastname})`,
    );
  });

  console.log("\n=== All users ===");
  const allUsers = await db
    .select({
      id: users.id,
      email: users.email,
      username: users.username,
    })
    .from(users);

  console.log(`Total users in database: ${allUsers.length}`);
  allUsers.forEach((user) => {
    console.log(`- [${user.id}] ${user.email} (${user.username})`);
  });
}

checkUsers()
  .then(() => {
    console.log("\nDone");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
