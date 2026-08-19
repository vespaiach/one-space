import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = new URL(process.env.PERF_BASE_URL ?? "");
const profileUrls = (process.env.PERF_PROFILE_URLS ?? "").split(",").filter(Boolean);
const sessionTokens = (process.env.PERF_SESSION_TOKENS ?? "").split(",").filter(Boolean);
const chromePath = process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
if (profileUrls.length !== 20 || new Set(profileUrls).size !== 20) throw new Error("PERF_PROFILE_URLS must contain 20 unique profile paths");
if (sessionTokens.length !== 10) throw new Error("PERF_SESSION_TOKENS must contain 10 authenticated session tokens");

class Cdp {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
    });
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    this.socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function connect(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return new Cdp(socket);
}

async function waitUntilReady(cdp, sessionId, expectedUrl) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const result = await cdp.send("Runtime.evaluate", {
      expression: `(() => {
        const profile = document.querySelector('[data-profile-ready="true"]');
        const avatar = document.querySelector('[data-profile-avatar]');
        return location.href === ${JSON.stringify(expectedUrl)} && Boolean(profile && avatar && (avatar.tagName !== 'IMG' || (avatar.complete && avatar.naturalWidth > 0)));
      })()`,
      returnByValue: true,
    }, sessionId);
    if (result.result.value === true) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("Profile did not become visibly complete within 10 seconds");
}

async function main() {
  const userDataDirectory = await mkdtemp(join(tmpdir(), "one-space-perf-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDirectory}`,
    "about:blank",
  ], { stdio: ["ignore", "ignore", "pipe"] });
  try {
    const browserSocketUrl = await new Promise((resolve, reject) => {
      let output = "";
      chrome.stderr.setEncoding("utf8");
      chrome.stderr.on("data", (chunk) => {
        output += chunk;
        const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (match) resolve(match[1]);
      });
      chrome.once("exit", (code) => reject(new Error(`Chrome exited before CDP startup: ${code}`)));
    });
    const cdp = await connect(browserSocketUrl);
    const sessions = [];
    for (let index = 0; index < 10; index += 1) {
      const { browserContextId } = await cdp.send("Target.createBrowserContext");
      const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank", browserContextId });
      const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
      await Promise.all([
        cdp.send("Page.enable", {}, sessionId),
        cdp.send("Runtime.enable", {}, sessionId),
        cdp.send("Network.enable", {}, sessionId),
      ]);
      await cdp.send("Network.setCookie", {
        name: "session",
        value: sessionTokens[index],
        domain: baseUrl.hostname,
        path: "/",
        secure: baseUrl.protocol === "https:",
        httpOnly: true,
        sameSite: "Lax",
      }, sessionId);
      sessions.push(sessionId);
    }
    const coldUrl = new URL(profileUrls[0], baseUrl).toString();
    const coldStartedAt = performance.now();
    await cdp.send("Page.navigate", { url: coldUrl }, sessions[0]);
    await waitUntilReady(cdp, sessions[0], coldUrl);
    const coldMilliseconds = performance.now() - coldStartedAt;
    const durations = [];
    await Promise.all(sessions.map(async (sessionId, worker) => {
      for (let iteration = 0; iteration < 10; iteration += 1) {
        const profilePath = profileUrls[(worker * 10 + iteration) % profileUrls.length];
        const startedAt = performance.now();
        const navigationUrl = new URL(profilePath, baseUrl).toString();
        await cdp.send("Page.navigate", { url: navigationUrl }, sessionId);
        await waitUntilReady(cdp, sessionId, navigationUrl);
        durations.push(performance.now() - startedAt);
      }
    }));
    durations.sort((a, b) => a - b);
    const p95 = durations[Math.ceil(durations.length * 0.95) - 1];
    const result = { samples: durations.length, concurrency: 10, users: 20, coldMilliseconds: Math.round(coldMilliseconds), p95Milliseconds: Math.round(p95), underTwoSeconds: durations.filter((value) => value < 2000).length };
    process.stdout.write(`${JSON.stringify(result)}\n`);
    if (result.underTwoSeconds < 95) process.exitCode = 1;
    cdp.socket.close();
  } finally {
    chrome.kill("SIGTERM");
    await rm(userDataDirectory, { recursive: true, force: true });
  }
}

await main();
