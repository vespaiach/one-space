export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const [{ ensureInitialAdmin }, { runMigrations }, { db }] = await Promise.all([
    import("@/lib/bootstrap/initial-admin"),
    import("@/lib/db/migrate"),
    import("@/lib/db"),
  ]);
  const values = [
    process.env.INITIAL_ADMIN_EMAIL,
    process.env.INITIAL_ADMIN_PASSWORD,
    process.env.INITIAL_ADMIN_FIRST_NAME,
    process.env.INITIAL_ADMIN_LAST_NAME,
  ];
  const config = values.every((value) => value?.trim())
    ? {
        email: values[0] as string,
        password: values[1] as string,
        firstName: values[2] as string,
        lastName: values[3] as string,
      }
    : null;
  await runMigrations(db);
  await ensureInitialAdmin(db, config);
}
