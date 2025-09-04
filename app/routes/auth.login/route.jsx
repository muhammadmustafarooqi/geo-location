// import { shopify } from "../../shopify.server";
// import polarisTranslations from "@shopify/polaris/locales/en.json";
// import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
// import {
//   AppProvider as PolarisAppProvider,
//   Button,
//   Card,
//   FormLayout,
//   Page,
//   Text,
//   TextField,
// } from "@shopify/polaris";
// import { Form, useActionData, useLoaderData } from "@remix-run/react";
// import { useState } from "react";
// import { loginErrorMessage } from "./error.server";

// export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

// // Loader → just return translations & empty errors
// export const loader = async () => {
//   return { errors: {}, polarisTranslations };
// };

// // Action → call shopify.login(request) (not authenticate.admin)
// export const action = async ({ request }) => {
//   const response = await shopify.login(request);
//   return response; // Shopify handles redirect if needed
// };

// export default function Auth() {
//   const loaderData = useLoaderData();
//   const actionData = useActionData();
//   const [shop, setShop] = useState("");
//   const { errors } = actionData || loaderData;

//   return (
//     <PolarisAppProvider i18n={loaderData.polarisTranslations}>
//       <Page>
//         <Card>
//           <Form method="post">
//             <FormLayout>
//               <Text variant="headingMd" as="h2">
//                 Log in
//               </Text>
//               <TextField
//                 type="text"
//                 name="shop"
//                 label="Shop domain"
//                 helpText="example.myshopify.com"
//                 value={shop}
//                 onChange={setShop}
//                 autoComplete="on"
//                 error={errors?.shop}
//               />
//               <Button submit>Log in</Button>
//             </FormLayout>
//           </Form>
//         </Card>
//       </Page>
//     </PolarisAppProvider>
//   );
// }



// app/routes/auth.login/route.jsx
import { shopify } from "../../shopify.server";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import {
  AppProvider as PolarisAppProvider,
  Button,
  Card,
  FormLayout,
  Page,
  Text,
  TextField,
} from "@shopify/polaris";
import { Form, useActionData, useLoaderData } from "@remix-run/react";
import { useState } from "react";

// ❌ remove this: import { loginErrorMessage } from "./error.server";
// ✅ we'll use it only in the action (server-side)
import { loginErrorMessage } from "./error.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async () => {
  return { errors: {}, polarisTranslations };
};

export const action = async ({ request }) => {
  const response = await shopify.login(request);

  // If Shopify returned loginErrors → map them into messages
  if (response?.loginErrors) {
    return {
      errors: loginErrorMessage(response.loginErrors),
      polarisTranslations,
    };
  }

  return response; // Shopify will redirect if login succeeds
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");

  // errors now come from actionData (if any), otherwise loaderData
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={loaderData.polarisTranslations}>
      <Page>
        <Card>
          <Form method="post">
            <FormLayout>
              <Text variant="headingMd" as="h2">
                Log in
              </Text>
              <TextField
                type="text"
                name="shop"
                label="Shop domain"
                helpText="example.myshopify.com"
                value={shop}
                onChange={setShop}
                autoComplete="on"
                error={errors?.shop}
              />
              <Button submit>Log in</Button>
            </FormLayout>
          </Form>
        </Card>
      </Page>
    </PolarisAppProvider>
  );
}
