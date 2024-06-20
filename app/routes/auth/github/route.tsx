import { generateState, GitHub } from "arctic";
import { createCookie, LoaderFunction, redirect } from "@remix-run/cloudflare";

// Define the Env interface
interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

// Define the cookie
const githubOAuthStateCookie = createCookie("github_oauth_state", {
  path: "/",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax"
});

// Function to create GitHub provider
const createGitHubProvider = (env: Env) => {
  return new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);
};

export const loader: LoaderFunction = async ({ request, context }) => {
  const env = context.env as Env; // Assuming env is passed in the context
  const github = createGitHubProvider(env);

  const state = generateState();
  const url = await github.createAuthorizationURL(state);
  console.log("GitHub OAuth URL:", url);

  // Set the cookie
  return redirect(String(url), {
    headers: {
      "Set-Cookie": await githubOAuthStateCookie.serialize(state)
    }
  });
};
