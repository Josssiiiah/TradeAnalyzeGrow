import { doTheAuthThing } from "lib/authThing";
import { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { Users } from "~/drizzle/schema.server";
import { eq } from "drizzle-orm";
import {
  useLoaderData,
  Form,
  useActionData,
  useFetcher,
} from "@remix-run/react";
import axios from "axios";
import React, { useEffect } from "react";
import { useToast } from "~/components/ui/use-toast";
import { Input } from "~/components/ui/input";

type ActionData = { error?: string; success?: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
  const { user, session, db } = await doTheAuthThing({ request, context });

  if (user) {
    const userId = user.id;
    console.log("LOGGED IN!!");

    const [userInfo] = await db
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .execute();

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
  const fetcher = useFetcher<typeof action>();
  const { toast } = useToast();

  if ("error" in data) {
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
      fetcher.submit(formData, { action: "/app/seed", method: "post" });
      toast({
        title: "Success",
        description: "Imported trades successfully",
      });
    }
  }, [fetcher.data]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    fetcher.submit(formData, { method: "post" });
  };

  return (
    <div className="flex flex-col mx-auto max-w-[1400px] w-full p-10">
      <h1 className="text-4xl font-bold text-center">Profile</h1>
      <div className="flex flex-col pt-10 items-center justify-between w-full">
        <div className="flex flex-col w-1/3">
          <div className="flex flex-col items-center mb-6">
            {user.avatar_url ? (
              <img
                className="w-32 h-32 rounded-full mb-4"
                src={user.avatar_url}
                alt={`${user.username}'s avatar`}
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-black text-white flex items-center justify-center mb-4">
                <span className="text-4xl">
                  {user.username[0].toUpperCase()}
                </span>
              </div>
            )}
            <h2 className="text-2xl font-bold">{user.username}</h2>
          </div>
          {/* <button className="bg-purple-600 text-white py-2 px-4 rounded-md mb-2">
        Update image
      </button>
      <button className="text-purple-400 mb-4">Remove image</button> */}
        </div>

        <div className="flex-1 w-full max-w-xl pt-2">
        <h1 className="py-6 font-bold text-red-500">To see trading info, log into Robinhood and import trades</h1>

          <Form method="post" className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Robinhood Username
              </label>
              <Input
                type="text"
                name="username"
                id="username"
                className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                Robinhood Password
              </label>
              <Input
                type="password"
                name="password"
                id="password"
                className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none"
                required
              />
            </div>
            <div>
              <label
                htmlFor="mfa"
                className="block text-sm font-medium text-gray-800 mb-1"
              >
                MFA Code
              </label>
              <Input
                type="text"
                name="mfa"
                id="mfa"
                className="w-full px-3 py-2 border border-gray-700 rounded-md focus:outline-none"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-black text-white py-2 px-4 rounded-md hover:bg-gray-700"
            >
              Import Trades
            </button>
          </Form>
        </div>
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
    return json<ActionData>(
      { error: "All fields are required" },
      { status: 400 }
    );
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

    // const { user, db } = await doTheAuthThing({ request, context });

    // await db
    //   .update(Users)
    //   .set({ auth_token: authToken })
    //   .where(eq(Users.id, user!.id))
    //   .execute();

    return json<ActionData>({ success: authToken });
  } catch (error) {
    console.error("Error retrieving auth token:", error);
    return json<ActionData>(
      { error: "Failed to retrieve auth token" },
      { status: 500 }
    );
  }
};
