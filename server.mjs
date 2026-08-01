import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { extname, join, resolve } from "node:path";
import { mergeStoreValue } from "./store-merge.mjs";

const root = resolve(process.cwd());
const dataDir = join(root, ".coursesync-data");
const storeFile = join(dataDir, "shared-store.json");
const port = Number(process.env.PORT || 4173);
let storeQueue = Promise.resolve();

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

async function readStore() {
  try {
    return JSON.parse(await readFile(storeFile, "utf8"));
  } catch {
    return {};
  }
}

async function writeStore(store) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(storeFile, JSON.stringify(store, null, 2));
}

function updateStore(mutator) {
  storeQueue = storeQueue.then(async () => {
    const store = await readStore();
    mutator(store);
    await writeStore(store);
    return store;
  });
  return storeQueue;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

function lanUrls(port) {
  const urls = [`http://localhost:${port}`];
  try {
    Object.values(networkInterfaces() || {})
      .flat()
      .filter((iface) => iface && !iface.internal && iface.family === "IPv4")
      .forEach((iface) => urls.push(`http://${iface.address}:${port}`));
  } catch {
    /* sandbox or restricted environments may block interface enumeration */
  }
  return [...new Set(urls)];
}

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}

createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/info" && req.method === "GET") {
      send(
        res,
        200,
        JSON.stringify({
          ok: true,
          port,
          urls: lanUrls(port),
          liveCommunity: true,
        })
      );
      return;
    }

    if (url.pathname === "/api/store" && req.method === "GET") {
      send(res, 200, JSON.stringify(await readStore()));
      return;
    }

    if (url.pathname === "/api/store" && req.method === "POST") {
      const payload = JSON.parse(await readBody(req) || "{}");
      if (!payload.key || !/^coursesync_/.test(payload.key)) {
        send(res, 400, JSON.stringify({ error: "Invalid store key" }));
        return;
      }
      await updateStore((store) => {
        if (payload.value === null) {
          delete store[payload.key];
          return;
        }
        const merged = mergeStoreValue(payload.key, store[payload.key], String(payload.value));
        if (merged === null) delete store[payload.key];
        else store[payload.key] = merged;
      });
      send(res, 200, JSON.stringify({ ok: true }));
      return;
    }

    let path = decodeURIComponent(url.pathname);
    if (path === "/") path = "/index.html";
    const file = resolve(join(root, path));
    if (!file.startsWith(root)) {
      send(res, 403, "Forbidden", "text/plain; charset=utf-8");
      return;
    }
    const info = await stat(file);
    if (!info.isFile()) {
      send(res, 404, "Not found", "text/plain; charset=utf-8");
      return;
    }
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": types[extname(file).toLowerCase()] || "application/octet-stream",
    });
    res.end(body);
  } catch (err) {
    const status = err?.code === "ENOENT" ? 404 : 500;
    send(res, status, status === 404 ? "Not found" : "Server error", "text/plain; charset=utf-8");
  }
}).listen(port, "0.0.0.0", () => {
  console.log("CourseSync is running — open in your browser:");
  lanUrls(port).forEach((url) => console.log(`  ${url}`));
  console.log("Students on the same Wi‑Fi can use a LAN URL above for live friends, messages, and directory sync.");
});
