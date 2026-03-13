import { NextResponse } from "next/server";

// Scopes needed:
//   Mail.Read           — read Outlook inbox (delegated, no admin consent)
//   Chat.Read           — read Teams DMs (delegated, no admin consent)
//   offline_access      — get a refresh token
//   User.Read           — basic profile
const SCOPES = "offline_access User.Read Mail.Read Chat.Read";

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const redirectUri = process.env.MICROSOFT_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: "MICROSOFT_CLIENT_ID and MICROSOFT_REDIRECT_URI must be set in .env.local" },
      { status: 500 }
    );
  }

  const url = new URL(
    "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
  );
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("response_mode", "query");

  return NextResponse.redirect(url.toString());
}
