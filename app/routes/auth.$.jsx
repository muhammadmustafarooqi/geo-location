// import { authenticate, login } from "../shopify.server";

// export const loader = async ({ request }) => {
//   const url = new URL(request.url);
//   const path = url.pathname;
  
//   if (path.includes('session-token')) {
//     const { sessionToken } = await authenticate.admin(request);
//     return new Response(JSON.stringify({ 
//       success: true,
//       sessionToken: sessionToken 
//     }), {
//       headers: { 'Content-Type': 'application/json' }
//     });
//   }
  
//   if (path.includes('callback')) {
//     const { session } = await authenticate.admin(request);
//     return new Response(null, {
//       status: 302,
//       headers: { Location: `/app?shop=${session.shop}` }
//     });
//   }
  
//   if (path.includes('login')) {
//     return login(request);
//   }
  
//   await authenticate.admin(request);
//   return null;
// };

import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};