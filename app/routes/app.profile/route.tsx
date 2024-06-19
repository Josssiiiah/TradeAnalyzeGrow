import { doTheAuthThing } from "lib/authThing";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Users } from "~/drizzle/schema.server";
import { eq } from "drizzle-orm";
import { useLoaderData, Form, useActionData, useFetcher } from "@remix-run/react";
import axios from "axios";
import React, { useEffect } from "react";
import { useToast } from "~/components/ui/use-toast";


type ActionData = { error?: string; success?: string };
 
export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, session, db } = await doTheAuthThing({ request, context });

  if (user) {
    const userId = user.id;
    console.log("LOGGED IN!!");

    const [userInfo] = await db.select().from(Users).where(eq(Users.id, userId)).execute();

    if (!userInfo) {
      return json({ error: "User not found" }, { status: 404 });
    }

    return json({ user: userInfo });
  } else {
    console.log("NOT LOGGED IN!!");
    return json({ error: "Not authenticated" }, { status: 401 });
  }
}



export default function Profile() {
    const data = useLoaderData<typeof loader>();
    const actionData = useActionData<ActionData>();
    const fetcher = useFetcher<typeof action>();
    const { toast } = useToast();
  
    if ('error' in data) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="p-6 bg-white rounded shadow-md">
            <p className="text-red-500">{data.error}</p>
          </div>
        </div>
      );
    }
  
    const { user } = data;
  
    useEffect(() => {
        if (fetcher.data && fetcher.data.success) {
          const formData = new FormData();
          formData.append("token", fetcher.data.success);
          fetcher.submit(formData, { action: '/app/seed', method: 'post' });
          toast({
            title: "Success",
            description: "Seed database successfully"
          });
        }
      }, [fetcher.data]);
    
    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        fetcher.submit(formData, { method: 'post' });
      };
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <div className="max-w-md p-6 bg-white rounded shadow-md">
          <h1 className="mb-4 text-2xl font-bold text-center">Profile</h1>
          {user.avatar_url && (
            <div className="flex justify-center mb-4">
              <img
                className="w-32 h-32 rounded-full"
                src={user.avatar_url}
                alt={`${user.username}'s avatar`}
              />
            </div>
          )}
          <div className="space-y-2 mb-4">
            <p>
              <span className="font-semibold">Username:</span> {user.username}
            </p>
            <p>
              <span className="font-semibold">Email:</span> {user.email}
            </p>
          </div>
  
          {actionData?.error && (
            <div className="mb-4 text-red-500">
              {actionData.error}
            </div>
          )}
          {actionData?.success && (
            <div className="mb-4 text-green-500">
              {actionData.success}
            </div>
          )}
  
          <Form method="post" className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block font-medium text-gray-700">Robinhood Username</label>
              <input type="text" name="username" id="username" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="password" className="block font-medium text-gray-700">Robinhood Password</label>
              <input type="password" name="password" id="password" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" required />
            </div>
            <div>
              <label htmlFor="mfa" className="block font-medium text-gray-700">MFA Code</label>
              <input type="text" name="mfa" id="mfa" className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500" required />
            </div>
            <button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Retrieve Auth Token</button>
          </Form>
        </div>
      </div>
    );
  }
  
  export const action = async ({ request, context }: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const username = formData.get("username");
  const password = formData.get("password");
  const mfa = formData.get("mfa");

  if (!username || !password || !mfa) {
    return json<ActionData>({ error: "All fields are required" }, { status: 400 });
  }

  const options = {
    method: "POST",
    url: "https://api.robinhood.com/oauth2/token/",
    headers: {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br",
      "Accept-Language": "en-US,en;q=1",
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Robinhood-API-Version": "1.315.0",
      Connection: "keep-alive",
      "User-Agent": "*",
    },
    data: {
      client_id: "c82SH0WZOsabOXGP2sxqcj34FxkvfnWRZBKlBjFS",
      grant_type: "password",
      password,
      scope: "internal",
      username,
      challenge_type: "sms",
      device_token: "fe3e28aa-4914-0cbb-d631-110568146b29",
      mfa_code: mfa,
    },
  };

  try {
    const response = await axios(options);
    const authToken = response.data.access_token;

    const { user, db } = await doTheAuthThing({ request, context });

    await db.update(Users)
      .set({ auth_token: authToken })
      .where(eq(Users.id, user!.id))
      .execute();

    return json<ActionData>({ success: authToken });
  } catch (error) {
    console.error("Error retrieving auth token:", error);
    return json<ActionData>({ error: "Failed to retrieve auth token" }, { status: 500 });
  }
};