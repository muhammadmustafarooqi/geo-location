import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { sessionToken } = await authenticate.admin(request);
  
  return new Response(JSON.stringify({ 
    success: true,
    sessionToken: sessionToken 
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export default function SessionToken() {
  return null;
}
