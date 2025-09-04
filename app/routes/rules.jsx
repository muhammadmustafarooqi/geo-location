// app/routes/app.rules.jsx
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, DataTable, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

  const rules = await db.rule.findMany({
    where: { shop: session.shop },
    include: {
      productRules: true,
      collectionRules: true,
      VendorRules: true,   // Capital V
      TagRules: true,      // Capital T
    },
    orderBy: { createdAt: "desc" },
  });

  return json({ rules });
}

export default function RulesPage() {
  const { rules } = useLoaderData();

  const rows = rules.map((r) => [
    r.country || "-",
    r.eventName || "-",
    r.startDate ? new Date(r.startDate).toLocaleDateString() : "-",
    r.endDate ? new Date(r.endDate).toLocaleDateString() : "-",
  ]);

  return (
    <Page title="All Rules">
      <Card>
        <DataTable
          columnContentTypes={["text", "text", "text", "text"]}
          headings={["Country", "Event", "Start", "End"]}
          rows={rows}
        />
      </Card>
    </Page>
  );
}