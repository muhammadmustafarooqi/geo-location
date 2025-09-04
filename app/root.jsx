// import { Links, LiveReload, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
// import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-remix/react";
// import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
// import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// import translations from '@shopify/polaris/locales/en.json';
// import { json } from "@remix-run/node"; 
// import { useLoaderData } from "@remix-run/react";
// import { authenticate } from "./shopify.server";


// export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// export const loader = async ({ request }) => {
//   await authenticate.admin(request);
//   return json({
//     env: {
//       SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
//     }
//   });
// };

// export default function App() {
//   const { env } = useLoaderData(); 

//   return (
//     <html lang="en">
//       <head>
//         <Meta />
//         <Links />
      
//         <script
//           src="https://unpkg.com/@shopify/app-bridge@3.7.9/dist/app-bridge.js"
//           async
//         />
//       </head>
//       <body>
//         <ShopifyAppProvider
//           isEmbeddedApp
//           apiKey={env.SHOPIFY_API_KEY} 
//         >
//           <PolarisAppProvider i18n={translations}>
//             <Outlet />
//           </PolarisAppProvider>
//         </ShopifyAppProvider>
//         <ScrollRestoration />
//         <Scripts />
//         <LiveReload />
//       </body>
//     </html>
//   );
// }




import { 
  Links, 
  LiveReload, 
  Meta, 
  Outlet, 
  Scripts, 
  ScrollRestoration 
} from "@remix-run/react";
import { AppProvider as ShopifyAppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import translations from '@shopify/polaris/locales/en.json';
import { json } from "@remix-run/node"; 
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "./shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  // Only authenticate for non-auth routes
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/auth')) {
    await authenticate.admin(request);
  }
  
  return json({
    env: {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY,
    }
  });
};

export default function App() {
  const { env } = useLoaderData(); 

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <link rel="preconnect" href="https://cdn.shopify.com/" />
        <link
          rel="stylesheet"
          href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
        />
        <Meta />
        <Links />
      </head>
      <body>
        <ShopifyAppProvider
          isEmbeddedApp
          apiKey={env.SHOPIFY_API_KEY} 
        >
          <PolarisAppProvider i18n={translations}>
            <Outlet />
          </PolarisAppProvider>
        </ShopifyAppProvider>
        <ScrollRestoration />
        <Scripts />
        <LiveReload />
      </body>
    </html>
  );
}












// import {
//   Links,
//   Meta,
//   Outlet,
//   Scripts,
//   ScrollRestoration,
// } from "@remix-run/react";

// export default function App() {
//   return (
//     <html>
//       <head>
//         <meta charSet="utf-8" />
//         <meta name="viewport" content="width=device-width,initial-scale=1" />
//         <link rel="preconnect" href="https://cdn.shopify.com/" />
//         <link
//           rel="stylesheet"
//           href="https://cdn.shopify.com/static/fonts/inter/v4/styles.css"
//         />
//         <Meta />
//         <Links />
//       </head>
//       <body>
//         <Outlet />
//         <ScrollRestoration />
//         <Scripts />
//       </body>
//     </html>
//   );
// }
