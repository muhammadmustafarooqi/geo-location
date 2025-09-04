import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  try {
    // Protect all /app routes
    await authenticate.admin(request);
  } catch (response) {
    if (response instanceof Response) {
      return response; // redirect to /auth/login if not logged in
    }
    throw response;
  }

  return { apiKey: process.env.SHOPIFY_API_KEY ?? null };
};

export default function App() {
  const { apiKey } = useLoaderData();

  if (!apiKey) {
    throw new Response("Missing SHOPIFY_API_KEY env var", { status: 500 });
  }

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Home</Link>
        <Link to="/app/additional">Additional page</Link>
        <Link to="/app/products">Products</Link>
        <Link to="/app/create-rule">Create Rule</Link>
        <Link to="/app/rules">Rules</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}


export function ErrorBoundary() {
  const error = useRouteError();

  if (error && error.status === 200 && typeof error.data === "string" && error.data.includes("app-bridge.js")) {
    return (
      <div>
        <h2>Authentication Required</h2>
        <p>Please login to continue.</p>
      </div>
    );
  }

  return boundary.error(error);
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
