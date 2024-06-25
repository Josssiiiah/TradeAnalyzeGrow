import { Form, Link, useActionData, useFetcher } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { json, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { doTheAuthThing } from "lib/authThing";
import { waitlist } from "~/drizzle/schema.server";
import { useToast } from "~/components/ui/use-toast";
import { useEffect } from "react";

export default function Index() {
  const response = useActionData<typeof action>();
  console.log("RESPONSE:", response);

  const { toast } = useToast();

  useEffect(() => {
    if (response) {
      if ("success" in response) {
        toast({
          title: "Success",
          description: response.success,
          variant: "default",
        });
      }
      if ("error" in response) {
        toast({
          title: "Error",
          description: response.error,
          variant: "destructive",
        });
      }
    }
  }, [response, toast]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center text-center text-gray-800">
      {/* <div className="flex flex-row gap-12 pt-48">
        <Link
          to="/login"
          className="px-4 py-2 rounded bg-blue-500 text-white font-medium hover:bg-blue-600"
        >
          Login
        </Link>
        <Link
          to="/signup"
          className="px-4 py-2 rounded bg-green-500 text-white font-medium hover:bg-green-600"
        >
          Sign Up
        </Link>
        <Link
          to="/logout"
          className="px-4 py-2 rounded bg-red-500 text-white font-medium hover:bg-red-600"
        >
          Logout
        </Link>
        <Link
          to="/protected"
          className="px-4 py-2 rounded bg-black text-white font-medium hover:bg-gray-600"
        >
          Protected
        </Link>
        <Link
          to="/app"
          className="px-4 py-2 rounded bg-purple-500 text-white font-medium hover:bg-purple-600"
        >
          App
        </Link>
      </div> */}

      <div className="flex flex-col items-center justify-center">
        <h1 className="font-[Inter-bold] text-5xl md:text-7xl max-w-sm md:max-w-6xl leading-[1.2] font-bold mb-4 pt-24 md:pt-[100px]">
          Automate your trading journal
        </h1>

        <p className="font-[Inter] text-xl md:text-2xl pt-4 max-w-sm md:max-w-5xl leading-[1.3] font-bold">
          Trading without a journal is like ripping dollars in half... it
          doesn't make cents.
          <span className="hidden md:flex">
            {" "}
            Import trades with one click, analyze performance, and become a
            better trader.
          </span>
        </p>
        <Form method="post" className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:gap-10 justify-center items-center w-full max-w-sm md:max-w-xl pt-10">
            <Input
              name="email"
              id="email"
              className="flex-2 w-[370px] md:text-lg p-6"
              placeholder="Email"
            />
            <Button
              type="submit"
              className="flex-1 md:w-48 md:text-lg p-4 md:p-6"
            >
              Join the waitlist!
            </Button>
          </div>
        </Form>

        <div className="pt-10 mx-8 md:mx-20 flex">
          <img
            src="/dashboard.png"
            alt="Dashboard"
            className="w-full rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}

export const action = async ({ request, context }: LoaderFunctionArgs) => {
  const formData = await request.formData();
  const email = String(formData.get("email"));

  // need to add zod validation still
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return json({ error: "Invalid email provided" }, { status: 400 });
  }

  console.log(email);

  try {
    const { db } = await doTheAuthThing({ request, context });
    await db.insert(waitlist).values({ email }).execute();

    console.log("Email added to waitlist");
    return json({ success: "Email added to waitlist" });
  } catch (error) {
    console.error("Error:", error);
    return json({ error: "Failed to add email to waitlist" }, { status: 500 });
  }
};
