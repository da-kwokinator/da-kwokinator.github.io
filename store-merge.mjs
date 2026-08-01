/**
 * Shared merge logic for CourseSync community data (server + browser).
 */

export const REGISTRY_KEY = "coursesync_registry_v1";
export const NETWORK_KEY = "coursesync_network_v1";
export const DM_KEY = "coursesync_dm_v1";
export const DISCUSSION_KEY = "coursesync_discussions_v1";
export const FEED_KEY = "coursesync_feed_v1";
export const REACTIONS_KEY = "coursesync_reactions_v2";
export const RECOMMENDATIONS_KEY = "coursesync_recommendations_v1";
export const INVITES_KEY = "coursesync_invites_v1";
export const ENROLL_KEY = "coursesync_enroll_v1";
export const RATING_AGG_KEY = "coursesync_rating_agg_v1";
export const ACCOUNTS_KEY = "coursesync_accounts_v1";
export const DELETED_ACCOUNTS_KEY = "coursesync_deleted_accounts_v1";

export const SHARED_STORE_KEYS = [
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

function friendPair(a, b) {
  return [a, b].sort().join("|||");
}

export function parseJson(raw, fallback) {
  try {
    return JSON.parse(raw || "");
  } catch {
    return fallback;
  }
}

function deletedSetFromStorageLike(source) {
  return new Set((Array.isArray(source) ? source : []).map((id) => normId(id)).filter(Boolean));
}

export function mergeRegistry(local, remote, deleted = new Set()) {
  const deletedMeta = { ...(remote?.__deletedAccounts || {}), ...(local?.__deletedAccounts || {}) };
  const deletedIds = new Set([...deleted, ...Object.keys(deletedMeta).map(normId)]);
  const out = { ...local, __deletedAccounts: deletedMeta };
  Object.entries(remote || {}).forEach(([id, remoteUser]) => {
    if (id === "__deletedAccounts") return;
    if (deletedIds.has(normId(id))) return;
    const localUser = out[id];
    if (!localUser || (remoteUser.updatedAt || 0) >= (localUser.updatedAt || 0)) {
      out[id] = remoteUser;
    }
  });
  deletedIds.forEach((id) => delete out[id]);
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

export function mergeNetwork(local, remote) {
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

export function mergeDM(local, remote) {
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

export function mergeDiscussions(local, remote) {
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

export function mergeByIdArray(local, remote, idField = "id") {
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

export function mergeInvites(local, remote) {
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

export function mergeAccounts(local, remote) {
  const deletedMeta = { ...(remote?.__deletedAccounts || {}), ...(local?.__deletedAccounts || {}) };
  const deleted = new Set(Object.keys(deletedMeta).map(normId));
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

export function mergeReactions(local, remote) {
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

export function mergeKey(key, localRaw, remoteRaw) {
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

export function mergeStoreValue(key, existingRaw, incomingRaw) {
  if (!SHARED_STORE_KEYS.includes(key)) return incomingRaw;
  if (existingRaw == null || existingRaw === "") return incomingRaw;
  if (incomingRaw == null) return null;
  return mergeKey(key, existingRaw, incomingRaw);
}
