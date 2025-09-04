import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  

  return new Response(null, {
    status: 302,
    headers: {
      Location: `/app?shop=${session.shop}`,
    },
  });
};
