/**
 * CourseSync shared store — syncs community data across browsers via server.mjs
 */
(function () {
  const REGISTRY_KEY = "coursesync_registry_v1";
  const NETWORK_KEY = "coursesync_network_v1";
  const DM_KEY = "coursesync_dm_v1";
  const DISCUSSION_KEY = "coursesync_discussions_v1";
  const FEED_KEY = "coursesync_feed_v1";
  const REACTIONS_KEY = "coursesync_reactions_v2";
  const RECOMMENDATIONS_KEY = "coursesync_recommendations_v1";
  const INVITES_KEY = "coursesync_invites_v1";
  const ENROLL_KEY = "coursesync_enroll_v1";
  const RATING_AGG_KEY = "coursesync_rating_agg_v1";
  const ACCOUNTS_KEY = "coursesync_accounts_v1";
  const DELETED_ACCOUNTS_KEY = "coursesync_deleted_accounts_v1";

  const SHARED_STORE_KEYS = [
    ACCOUNTS_KEY,
    REGISTRY_KEY,
    NETWORK_KEY,
    DM_KEY,
    DISCUSSION_KEY,
    FEED_KEY,
    REACTIONS_KEY,
    RECOMMENDATIONS_KEY,
    INVITES_KEY,
    ENROLL_KEY,
    RATING_AGG_KEY,
    DELETED_ACCOUNTS_KEY,
  ];

  const POLL_MS = 1500;

  function friendPair(a, b) {
    return [a, b].sort().join("|||");
  }

  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw || "");
    } catch {
      return fallback;
    }
  }

  function deletedSet() {
    return new Set(parseJson(localStorage.getItem(DELETED_ACCOUNTS_KEY), []).map((id) => normId(id)).filter(Boolean));
  }

  function mergeRegistry(local, remote) {
    const deletedMeta = { ...(remote?.__deletedAccounts || {}), ...(local?.__deletedAccounts || {}) };
    const out = { ...local, __deletedAccounts: deletedMeta };
    const deleted = new Set([...deletedSet(), ...Object.keys(deletedMeta).map(normId)]);
    Object.entries(remote || {}).forEach(([id, remoteUser]) => {
      if (id === "__deletedAccounts") return;
      if (deleted.has(normId(id))) return;
      const localUser = out[id];
      if (!localUser || (remoteUser.updatedAt || 0) >= (localUser.updatedAt || 0)) {
        out[id] = remoteUser;
      }
    });
    deleted.forEach((id) => delete out[id]);
    if (!Object.keys(out.__deletedAccounts || {}).length) delete out.__deletedAccounts;
    return out;
  }

  function normId(id) {
    return String(id || "").trim().toLowerCase();
  }

  function directedKey(r) {
    return `${normId(r.from)}|${normId(r.to)}`;
  }

  function mergeEdgeList(localList, remoteList, pairFn) {
    const byKey = new Map();
    [...(localList || []), ...(remoteList || [])].forEach((item) => {
      const key = pairFn(item);
      const prev = byKey.get(key);
      if (!prev || (item.at || item.since || 0) >= (prev.at || prev.since || 0)) {
        byKey.set(key, item);
      }
    });
    return [...byKey.values()];
  }

  function mergeNetwork(local, remote) {
    const normalizeRequest = (r) => ({
      ...r,
      from: normId(r.from),
      to: normId(r.to),
      at: r.at || 0,
    });
    const normalizeFriend = (f) => ({
      ...f,
      a: normId(f.a),
      b: normId(f.b),
      since: f.since || 0,
    });

    const friends = mergeEdgeList(
      (local.friends || []).map(normalizeFriend),
      (remote.friends || []).map(normalizeFriend),
      (f) => friendPair(f.a, f.b)
    );
    const closeFriends = mergeEdgeList(
      (local.closeFriends || []).map(normalizeFriend),
      (remote.closeFriends || []).map(normalizeFriend),
      (f) => friendPair(f.a, f.b)
    );
    const declined = mergeEdgeList(
      (local.declined || []).map(normalizeRequest),
      (remote.declined || []).map(normalizeRequest),
      directedKey
    );
    const declinedClose = mergeEdgeList(
      (local.declinedClose || []).map(normalizeRequest),
      (remote.declinedClose || []).map(normalizeRequest),
      directedKey
    );

    const friendPairs = new Set(friends.map((f) => friendPair(f.a, f.b)));
    const closePairs = new Set(closeFriends.map((f) => friendPair(f.a, f.b)));
    const declinedKeys = new Set(declined.map(directedKey));
    const declinedCloseKeys = new Set(declinedClose.map(directedKey));

    const requests = mergeEdgeList(
      (local.requests || []).map(normalizeRequest),
      (remote.requests || []).map(normalizeRequest),
      directedKey
    ).filter((r) => {
      if (friendPairs.has(friendPair(r.from, r.to))) return false;
      if (declinedKeys.has(directedKey(r))) return false;
      return true;
    });

    const closeRequests = mergeEdgeList(
      (local.closeRequests || []).map(normalizeRequest),
      (remote.closeRequests || []).map(normalizeRequest),
      directedKey
    ).filter((r) => {
      if (!friendPairs.has(friendPair(r.from, r.to))) return false;
      if (closePairs.has(friendPair(r.from, r.to))) return false;
      if (declinedCloseKeys.has(directedKey(r))) return false;
      return true;
    });

    return {
      requests,
      friends,
      closeRequests,
      closeFriends,
      declined,
      declinedClose,
      updatedAt: Math.max(local.updatedAt || 0, remote.updatedAt || 0, Date.now()),
    };
  }

  function mergeDM(local, remote) {
    const out = { ...local };
    Object.entries(remote || {}).forEach(([k, remoteMsgs]) => {
      const localMsgs = [...(out[k] || [])];
      const ids = new Set(localMsgs.map((m) => m.id));
      (remoteMsgs || []).forEach((m) => {
        if (m?.id && !ids.has(m.id)) {
          localMsgs.push(m);
          ids.add(m.id);
        }
      });
      out[k] = localMsgs.sort((a, b) => (a.t || 0) - (b.t || 0));
    });
    return out;
  }

  function mergeDiscussions(local, remote) {
    const byId = new Map((local || []).map((p) => [p.id, p]));
    (remote || []).forEach((rp) => {
      const lp = byId.get(rp.id);
      if (!lp) {
        byId.set(rp.id, rp);
        return;
      }
      const comments = [...(lp.comments || [])];
      const seen = new Set(comments.map((c) => `${c.at}|${c.authorId}|${c.text}`));
      (rp.comments || []).forEach((c) => {
        const key = `${c.at}|${c.authorId}|${c.text}`;
        if (!seen.has(key)) {
          comments.push(c);
          seen.add(key);
        }
      });
      byId.set(rp.id, {
        ...lp,
        ...rp,
        comments: comments.sort((a, b) => (a.at || 0) - (b.at || 0)),
        at: Math.max(lp.at || 0, rp.at || 0),
      });
    });
    return [...byId.values()];
  }

  function mergeByIdArray(local, remote, idField = "id") {
    const byId = new Map((local || []).map((item) => [item[idField], item]));
    (remote || []).forEach((item) => {
      const existing = byId.get(item[idField]);
      if (!existing) {
        byId.set(item[idField], item);
        return;
      }
      byId.set(item[idField], { ...existing, ...item, at: Math.max(existing.at || 0, item.at || 0) });
    });
    return [...byId.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  function mergeInvites(local, remote) {
    const byId = new Map((local || []).map((item) => [item.id || `${item.from}|${item.to}|${item.at}`, item]));
    (remote || []).forEach((item) => {
      const key = item.id || `${item.from}|${item.to}|${item.at}`;
      const existing = byId.get(key);
      if (!existing) {
        byId.set(key, item);
        return;
      }
      byId.set(key, {
        ...existing,
        ...item,
        acceptedAt: existing.acceptedAt || item.acceptedAt,
      });
    });
    return [...byId.values()].sort((a, b) => (b.at || 0) - (a.at || 0));
  }

  function mergeAccounts(local, remote) {
    const deletedMeta = { ...(remote?.__deletedAccounts || {}), ...(local?.__deletedAccounts || {}) };
    const deleted = new Set([...deletedSet(), ...Object.keys(deletedMeta).map(normId)]);
    const out = { ...local, __deletedAccounts: deletedMeta };
    Object.entries(remote || {}).forEach(([email, remoteAcct]) => {
      if (email === "__deletedAccounts" || deleted.has(normId(email))) return;
      const localAcct = out[email];
      if (!localAcct || (remoteAcct.updatedAt || 0) >= (localAcct.updatedAt || 0)) {
        out[email] = { ...localAcct, ...remoteAcct };
      }
    });
    deleted.forEach((id) => delete out[id]);
    if (!Object.keys(out.__deletedAccounts || {}).length) delete out.__deletedAccounts;
    return out;
  }

  function mergeEmojiLists(a, b) {
    return [...new Set([...(Array.isArray(a) ? a : a ? [a] : []), ...(Array.isArray(b) ? b : b ? [b] : [])])];
  }

  function mergeReactions(local, remote) {
    const out = { ...local };
    Object.entries(remote || {}).forEach(([targetId, remoteBucket]) => {
      const localBucket = out[targetId] || { byUser: {} };
      const byUser = { ...(localBucket.byUser || {}) };
      Object.entries(remoteBucket?.byUser || {}).forEach(([uid, remoteEmojis]) => {
        byUser[uid] = mergeEmojiLists(byUser[uid], remoteEmojis);
        if (!byUser[uid].length) delete byUser[uid];
      });
      if (Object.keys(byUser).length) out[targetId] = { byUser };
      else delete out[targetId];
    });
    return out;
  }

  function mergeKey(key, localRaw, remoteRaw) {
    const local = parseJson(
      localRaw,
      key === REGISTRY_KEY ||
        key === ACCOUNTS_KEY ||
        key === DM_KEY ||
        key === REACTIONS_KEY ||
        key === ENROLL_KEY ||
        key === RATING_AGG_KEY
        ? {}
        : []
    );
    const remote = parseJson(remoteRaw, Array.isArray(local) ? [] : {});

    switch (key) {
      case REGISTRY_KEY:
        return JSON.stringify(mergeRegistry(local, remote));
      case NETWORK_KEY:
        return JSON.stringify(mergeNetwork(local, remote));
      case DM_KEY:
        return JSON.stringify(mergeDM(local, remote));
      case DISCUSSION_KEY:
        return JSON.stringify(mergeDiscussions(local, remote));
      case FEED_KEY:
      case RECOMMENDATIONS_KEY:
        return JSON.stringify(mergeByIdArray(local, remote));
      case INVITES_KEY:
        return JSON.stringify(mergeInvites(local, remote));
      case ACCOUNTS_KEY:
        return JSON.stringify(mergeAccounts(local, remote));
      case DELETED_ACCOUNTS_KEY:
        return JSON.stringify([...new Set([...(Array.isArray(local) ? local : []), ...(Array.isArray(remote) ? remote : [])].map(normId).filter(Boolean))]);
      case REACTIONS_KEY:
        return JSON.stringify(mergeReactions(local, remote));
      case ENROLL_KEY:
      case RATING_AGG_KEY:
        return JSON.stringify(
          Object.keys(remote || {}).length >= Object.keys(local || {}).length ? { ...local, ...remote } : local
        );
      default:
        return remoteRaw;
    }
  }

  function showOfflineBanner(message) {
    const show = () => {
      if (document.getElementById("coursesync-offline-banner")) return;
      const el = document.createElement("div");
      el.id = "coursesync-offline-banner";
      el.className = "coursesync-offline-banner";
      el.setAttribute("role", "alert");
      el.innerHTML = message;
      document.body.prepend(el);
    };
    if (document.body) show();
    else document.addEventListener("DOMContentLoaded", show, { once: true });
  }

  function installSharedStoreSync() {
    if (!window.fetch) {
      window.CourseSyncSharedStore = { enabled: false };
      return;
    }

    if (window.location.protocol === "file:") {
      window.CourseSyncSharedStore = { enabled: false };
      showOfflineBanner(
        '<strong>Live community is off.</strong> Open CourseSync through the server — run <code>npm start</code> in the project folder, then visit <a href="http://localhost:4173">http://localhost:4173</a> so friends, messages, and the directory sync with other students.'
      );
      return;
    }

    const shared = new Set(SHARED_STORE_KEYS);
    let ready = false;
    let polling = false;
    let pollTimer = null;
    let lastFingerprint = "";
    const pendingWrites = [];

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);

    async function postKey(key, value) {
      const res = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Shared store write failed");
    }

    async function drainPending() {
      if (!ready || !pendingWrites.length) return;
      const batch = pendingWrites.splice(0, pendingWrites.length);
      await Promise.all(batch.map(({ key, value }) => postKey(key, value)));
    }

    const queueSend = (key, value) => {
      if (!shared.has(key)) return;
      if (!ready) {
        pendingWrites.push({ key, value });
        return;
      }
      postKey(key, value).catch(() => {
        pendingWrites.push({ key, value });
        ready = false;
      });
    };

    localStorage.setItem = (key, value) => {
      originalSetItem(key, value);
      queueSend(key, value);
    };

    localStorage.removeItem = (key) => {
      originalRemoveItem(key);
      queueSend(key, null);
    };

    function fingerprint(data) {
      return SHARED_STORE_KEYS.map((k) => data[k] || "").join("\x1e");
    }

    function applyRemote(data) {
      const changed = [];
      SHARED_STORE_KEYS.forEach((key) => {
        if (!shared.has(key) || typeof data[key] !== "string") return;
        const localRaw = localStorage.getItem(key);
        const merged = mergeKey(key, localRaw, data[key]);
        if (merged !== localRaw) {
          originalSetItem(key, merged);
          changed.push(key);
        }
      });
      return changed;
    }

    async function pull() {
      const res = await fetch("/api/store", { cache: "no-store" });
      if (!res.ok) throw new Error("Shared store unavailable");
      const data = await res.json();
      const fp = fingerprint(data);
      const changed = fp === lastFingerprint ? [] : applyRemote(data);
      lastFingerprint = fp;
      return changed;
    }

    function dispatchUpdate(changedKeys) {
      if (!changedKeys.length) return;
      document.dispatchEvent(
        new CustomEvent("coursesync:shared-updated", { detail: { keys: changedKeys } })
      );
    }

    async function pollOnce() {
      if (polling || document.hidden) return;
      polling = true;
      try {
        const changed = await pull();
        dispatchUpdate(changed);
      } catch {
        ready = false;
      } finally {
        polling = false;
      }
    }

    async function connect() {
      const changed = await pull();
      ready = true;
      await drainPending();
      dispatchUpdate(changed);
      return changed;
    }

    window.CourseSyncSharedStore = {
      enabled: true,
      KEYS: SHARED_STORE_KEYS,
      markReady() {
        ready = true;
      },
      async flush() {
        if (!ready) await connect().catch(() => {});
        const jobs = SHARED_STORE_KEYS.map(async (key) => {
          const value = localStorage.getItem(key);
          if (value !== null) await postKey(key, value);
        });
        await Promise.all(jobs);
      },
      async pushNow(key) {
        if (!shared.has(key)) return;
        const value = localStorage.getItem(key);
        if (!ready) {
          pendingWrites.push({ key, value });
          await connect().catch(() => {});
          return;
        }
        await postKey(key, value);
      },
      pull,
      connect,
      startPolling() {
        if (pollTimer) return;
        pollTimer = setInterval(pollOnce, POLL_MS);
        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) pollOnce();
        });
      },
      stopPolling() {
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = null;
      },
    };
  }

  installSharedStoreSync();
})();
