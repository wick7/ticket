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

export async function refreshMicrosoftToken(
  refreshToken: string
): Promise<RefreshedTokens | null> {
  const res = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
        scope: "offline_access User.Read Mail.Read Chat.Read",
      }),
    }
  );

  const data = await res.json() as TokenResponse;

  if (!data.access_token) {
    console.error("Microsoft token refresh failed:", data.error);
    return null;
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
  };
}
