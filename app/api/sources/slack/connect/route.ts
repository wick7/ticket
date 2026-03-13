import { NextResponse } from "next/server";

const SCOPES = [
  "channels:history",
  "channels:read",
  "groups:history",
  "groups:read",
  "im:history",
  "mpim:history",
  "users:read",
].join(",");

export async function GET() {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.SLACK_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "SLACK_CLIENT_ID and SLACK_REDIRECT_URI must be set in .env.local" },
      { status: 500 }
    );
  }

  const url = new URL("https://slack.com/oauth/v2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("user_scope", SCOPES); // user token (xoxp-), not bot token
  url.searchParams.set("redirect_uri", redirectUri);

  return NextResponse.redirect(url.toString());
}
