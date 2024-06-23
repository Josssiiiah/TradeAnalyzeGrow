// app/routes/auth/github.ts
import { generateState } from "arctic";
import { createCookie, LoaderFunction, redirect } from "@remix-run/cloudflare";
// import { github } from "auth";
import { GitHub } from "arctic";

// Define the cookie
const githubOAuthStateCookie = createCookie("github_oauth_state", {
  path: "/",
  httpOnly: true,
  maxAge: 60 * 10,
  sameSite: "lax",
});

export const loader: LoaderFunction = async ({ request, context }) => {
  const state = generateState();
  const { env }: any = context.cloudflare;
  const github = new GitHub(env.GITHUB_CLIENT_ID, env.GITHUB_CLIENT_SECRET);

  const url = await github.createAuthorizationURL(state);

  console.log("Girhub OAuth URL:", url);

  // Set the cookie
  return redirect(String(url), {
    headers: {
      "Set-Cookie": await githubOAuthStateCookie.serialize(state),
    },
  });
};
