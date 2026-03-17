interface RefreshedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
}

export async function refreshGmailToken(
  refreshToken: string
): Promise<RefreshedTokens | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await res.json() as TokenResponse;

  if (!data.access_token) {
    console.error("Gmail token refresh failed:", data.error);
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}
