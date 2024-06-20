import { LoaderFunction, redirect } from "@remix-run/cloudflare";
import { createCookie } from "@remix-run/cloudflare";
import { Google, generateCodeVerifier, generateState } from "arctic";

interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REDIRECT_URI: string;
}

// Define the cookies
const googleOAuthStateCookie = createCookie("google_oauth_state", {
  path: "/",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

const googleOAuthCodeVerifierCookie = createCookie("google_oauth_code_verifier", {
  path: "/",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

// Function to create Google provider
const createGoogleProvider = (env: Env) => {
  return new Google(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI);
};

export const loader: LoaderFunction = async ({ request, context }) => {
  const env = context.env as Env; // Assuming env is passed in the context
  const google = createGoogleProvider(env);

  const state = generateState();
  const codeVerifier = generateCodeVerifier();

  const url = await google.createAuthorizationURL(state, codeVerifier, {
    scopes: ["profile", "email"]
  });

  console.log("Google OAuth URL:", url);

  // Set the state and code_verifier in cookies
  const stateCookie = await googleOAuthStateCookie.serialize(state);
  const codeVerifierCookie = await googleOAuthCodeVerifierCookie.serialize(codeVerifier);

  return redirect(String(url), {
    headers: [
      ["Set-Cookie", stateCookie], 
      ["Set-Cookie", codeVerifierCookie]
    ]
  });
};
