export type HealthProbes = {
  database: () => Promise<boolean>;
  email: () => Promise<boolean>;
  avatarStorage: () => Promise<boolean>;
};

export type HealthStatus = {
  status: "ok" | "degraded" | "unhealthy";
  database: "ok" | "unhealthy";
  email: "ok" | "degraded";
  avatarStorage: "ok" | "unhealthy";
};

async function runProbe(probe: () => Promise<boolean>): Promise<boolean> {
  try {
    return await probe();
  } catch {
    return false;
  }
}

export async function evaluateHealth(probes: HealthProbes): Promise<HealthStatus> {
  const [databaseHealthy, emailHealthy, avatarStorageHealthy] = await Promise.all([
    runProbe(probes.database),
    runProbe(probes.email),
    runProbe(probes.avatarStorage),
  ]);
  return {
    status: !databaseHealthy || !avatarStorageHealthy ? "unhealthy" : emailHealthy ? "ok" : "degraded",
    database: databaseHealthy ? "ok" : "unhealthy",
    email: emailHealthy ? "ok" : "degraded",
    avatarStorage: avatarStorageHealthy ? "ok" : "unhealthy",
  };
}