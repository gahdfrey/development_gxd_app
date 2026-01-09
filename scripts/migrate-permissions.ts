import "dotenv/config";
import { db } from "../lib/db";
import { roles } from "../lib/db/schema";
import { eq } from "drizzle-orm";

// Default permissions with all View permissions enabled
const DEFAULT_PERMISSIONS = {
  dashboard: {
    view: true,
    add: false,
    edit: false,
    delete: false,
    print: false,
  },
  appointments: {
    view: true,
    add: false,
    edit: false,
    delete: false,
    print: false,
  },
  "my-appointments": {
    view: true,
    add: false,
    edit: false,
    delete: false,
    print: false,
  },
  users: { view: true, add: false, edit: false, delete: false, print: false },
};

async function migratePermissions() {
  console.log("🔄 Starting permission migration...");

  try {
    // Fetch all roles
    const allRoles = await db.select().from(roles);
    console.log(`Found ${allRoles.length} roles to migrate`);

    for (const role of allRoles) {
      console.log(`\nMigrating role: ${role.name} (ID: ${role.id})`);

      const oldPermissions = role.permissions as any;
      const newPermissions = { ...DEFAULT_PERMISSIONS };

      // Convert old array-based permissions to new object format
      if (oldPermissions && typeof oldPermissions === "object") {
        // Check if it's already in new format
        const isNewFormat = Object.values(oldPermissions).some(
          (val) => typeof val === "object" && !Array.isArray(val)
        );

        if (isNewFormat) {
          console.log(`  ✓ Already using new format`);
          continue;
        }

        // Migrate from old format
        console.log(
          `  📋 Old permissions:`,
          JSON.stringify(oldPermissions, null, 2)
        );

        // Map old module names to new ones
        const moduleMapping: Record<string, string> = {
          dashboard: "dashboard",
          patients: "appointments", // Map patients to appointments
          users: "users",
          appointments: "appointments",
        };

        // Convert old permissions to new format
        for (const [oldModule, permissions] of Object.entries(oldPermissions)) {
          const newModule = moduleMapping[oldModule];

          if (newModule && Array.isArray(permissions)) {
            // Type-safe access to newPermissions
            type PermissionKey = keyof typeof DEFAULT_PERMISSIONS;
            const moduleKey = newModule as PermissionKey;

            // Initialize module permissions if not exists
            if (!newPermissions[moduleKey]) {
              newPermissions[moduleKey] = {
                view: false,
                add: false,
                edit: false,
                delete: false,
                print: false,
              };
            }

            // Set permissions based on old array
            for (const perm of permissions) {
              const permName =
                perm.toLowerCase() as keyof (typeof newPermissions)[typeof moduleKey];
              if (permName in newPermissions[moduleKey]) {
                newPermissions[moduleKey][permName] = true;
              }
            }
          }
        }

        // Ensure all modules have at least View permission
        Object.keys(newPermissions).forEach((module) => {
          const moduleKey = module as keyof typeof DEFAULT_PERMISSIONS;
          newPermissions[moduleKey].view = true;
        });

        console.log(
          `  ✓ New permissions:`,
          JSON.stringify(newPermissions, null, 2)
        );

        // Update the role
        await db
          .update(roles)
          .set({
            permissions: newPermissions,
            updatedAt: new Date(),
          })
          .where(eq(roles.id, role.id));

        console.log(`  ✅ Migration complete for ${role.name}`);
      } else {
        // No existing permissions, set defaults
        console.log(`  📋 No existing permissions, setting defaults`);
        await db
          .update(roles)
          .set({
            permissions: DEFAULT_PERMISSIONS,
            updatedAt: new Date(),
          })
          .where(eq(roles.id, role.id));

        console.log(`  ✅ Default permissions set for ${role.name}`);
      }
    }

    console.log("\n✅ Permission migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }
}

// Run the migration
migratePermissions()
  .then(() => {
    console.log("\n🎉 All done! You can now use the new permission format.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration error:", error);
    process.exit(1);
  });
