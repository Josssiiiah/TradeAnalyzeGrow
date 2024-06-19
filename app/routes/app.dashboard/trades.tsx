import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
} from "@remix-run/cloudflare";
import { Form, useLoaderData } from "@remix-run/react";
import { drizzle } from "drizzle-orm/d1";
import { trades } from "app/drizzle/schema.server";

import { doTheDBThing } from "~/lib/dbThing";

// This function fetches trades from D1 and images from R2
export async function loader({ context }: LoaderFunctionArgs) {
  // call this at the top of all your loaders that need auth and db
  const { db } = await doTheDBThing({ context } as any);

  const resourceList = await db
    .select({
      id: trades.id,
      date: trades.date,
      trades: trades.trades as any,
    })
    .from(trades)
    .orderBy(trades.id);

  return json({
    resourceList,
  });
}

export default function Index() {
  const { resourceList } = useLoaderData<typeof loader>();

  return (
    <div style={{ width: "500px", height: "auto", overflow: "hidden" }}>
      <h1>Welcome to Remix (with Drizzle, Vite, and Cloudflare D1 and R2)</h1>
      <ul>
        {resourceList.map((resource) => (
          <li key={resource.id}>
            {resource.date}
            {resource.trades}
          </li>
        ))}
      </ul>
      <Form method="POST">
        <div>
          <label>
            Title: <input type="text" name="title" required />
          </label>
        </div>

        <button type="submit">Add Resource</button>
      </Form>
      <Form method="POST">
        <input type="hidden" name="action" value="clear" />
        <button
          type="submit"
          style={{ backgroundColor: "red", color: "white" }}
        >
          Delete All trades
        </button>
      </Form>
    </div>
  );
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const db = drizzle(context.cloudflare.env.DB);

  const actionType = formData.get("action");

  // Check if the clear action has been triggered
  if (actionType === "clear") {
    // Perform database clear operation
    await db.delete(trades);
    return json({ message: "Database cleared" }, { status: 200 });
  }

  const title = formData.get("title");

  // Handle resource addition
  if (title) {
    await db.insert(trades);
    return json({ message: "Resource added" }, { status: 201 });
  }

  return json({ message: "No operation performed" }, { status: 400 });
}
