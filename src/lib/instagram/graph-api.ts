import "server-only";

const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_VERSION}`;

export class InstagramApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown,
  ) {
    super(message);
    this.name = "InstagramApiError";
  }
}

async function graphFetch<T>(
  path: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "GET",
): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const init: RequestInit = { method };

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  } else {
    const body = new URLSearchParams(params);
    init.body = body;
  }

  const res = await fetch(url.toString(), init);
  const json = await res.json();

  if (!res.ok) {
    throw new InstagramApiError(
      json?.error?.message || `Instagram API request failed (${res.status})`,
      res.status,
      json,
    );
  }

  return json as T;
}

/** Step 1 of OAuth: exchange the "code" from the Instagram login redirect for a short-lived user token. */
export async function exchangeCodeForShortLivedToken(code: string) {
  const body = new URLSearchParams({
    client_id: process.env.INSTAGRAM_APP_ID!,
    client_secret: process.env.INSTAGRAM_APP_SECRET!,
    grant_type: "authorization_code",
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });

  const res = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    body,
  });
  const json = await res.json();

  if (!res.ok) {
    throw new InstagramApiError(
      json?.error_message || `Instagram token exchange failed (${res.status})`,
      res.status,
      json,
    );
  }

  return json as { access_token: string; user_id: number; permissions: string[] };
}

/** Step 2: exchange a short-lived user token for a long-lived one (~60 days). */
export async function exchangeForLongLivedToken(shortLivedToken: string) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", process.env.INSTAGRAM_APP_SECRET!);
  url.searchParams.set("access_token", shortLivedToken);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok) {
    throw new InstagramApiError(
      json?.error?.message || `Instagram token exchange failed (${res.status})`,
      res.status,
      json,
    );
  }

  return json as { access_token: string; token_type: string; expires_in: number };
}

/** Refreshes a long-lived token before it expires (must be called with a still-valid token). */
export async function refreshLongLivedToken(longLivedToken: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", longLivedToken);

  const res = await fetch(url.toString());
  const json = await res.json();

  if (!res.ok) {
    throw new InstagramApiError(
      json?.error?.message || `Instagram token refresh failed (${res.status})`,
      res.status,
      json,
    );
  }

  return json as { access_token: string; token_type: string; expires_in: number };
}

export async function getInstagramUsername(igUserId: string, accessToken: string) {
  const data = await graphFetch<{ username: string }>(`/${igUserId}`, {
    access_token: accessToken,
    fields: "username",
  });
  return data.username;
}

/** Creates a Reels media container. Returns the container id to be polled and then published. */
export async function createReelsContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption: string,
) {
  const data = await graphFetch<{ id: string }>(
    `/${igUserId}/media`,
    {
      access_token: accessToken,
      media_type: "REELS",
      video_url: videoUrl,
      caption,
      share_to_feed: "true",
    },
    "POST",
  );
  return data.id;
}

export type ContainerStatus = "EXPIRED" | "ERROR" | "FINISHED" | "IN_PROGRESS" | "PUBLISHED";

export async function getContainerStatus(containerId: string, accessToken: string) {
  return graphFetch<{ status_code: ContainerStatus; status: string }>(`/${containerId}`, {
    access_token: accessToken,
    fields: "status_code,status",
  });
}

/** Publishes a container that has finished processing (status_code === "FINISHED"). */
export async function publishContainer(igUserId: string, containerId: string, accessToken: string) {
  const data = await graphFetch<{ id: string }>(
    `/${igUserId}/media_publish`,
    { access_token: accessToken, creation_id: containerId },
    "POST",
  );
  return data.id;
}

export interface AccountInsights {
  impressions?: number;
  reach?: number;
  profile_views?: number;
  followers_count?: number;
}

/** Pulls basic account-level insights + current follower count. */
export async function getAccountInsights(igUserId: string, accessToken: string): Promise<AccountInsights> {
  const [insights, profile] = await Promise.all([
    graphFetch<{ data: { name: string; values: { value: number }[] }[] }>(`/${igUserId}/insights`, {
      access_token: accessToken,
      metric: "reach,profile_views",
      period: "day",
    }),
    graphFetch<{ followers_count: number }>(`/${igUserId}`, {
      access_token: accessToken,
      fields: "followers_count",
    }),
  ]);

  const result: AccountInsights = { followers_count: profile.followers_count };
  for (const metric of insights.data) {
    const latest = metric.values[metric.values.length - 1]?.value;
    if (metric.name === "reach") result.reach = latest;
    if (metric.name === "profile_views") result.profile_views = latest;
  }
  return result;
}

export interface MediaInsights {
  likes?: number;
  comments?: number;
  shares?: number;
  saved?: number;
  reach?: number;
  plays?: number;
}

/** Pulls per-post (Reels) engagement metrics. */
export async function getMediaInsights(mediaId: string, accessToken: string): Promise<MediaInsights> {
  const data = await graphFetch<{ data: { name: string; values: { value: number }[] }[] }>(
    `/${mediaId}/insights`,
    {
      access_token: accessToken,
      metric: "likes,comments,shares,saved,reach,plays",
    },
  );

  const result: MediaInsights = {};
  for (const metric of data.data) {
    const value = metric.values[metric.values.length - 1]?.value;
    (result as Record<string, number | undefined>)[metric.name] = value;
  }
  return result;
}
