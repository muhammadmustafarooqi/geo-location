import { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import prisma from "../db.server.js";
import { Badge, Box, Button, Card, DataTable, EmptyState, Grid, Layout, Page, ResourceList, Text,BlockStack ,InlineStack  } from "@shopify/polaris";

export async function loader({ request }) {
  const { session } = await authenticate.admin(request);

    if (!session) {
    console.warn("❗ No Shopify session – returning empty array");
    return json({ rules: [] });
  }

  const { shop } = session;

  const rules = await prisma.rule.findMany({
    where: { shop },
    include: {
      productRules: {
        include: {
          product: true,
        },
      },
      collectionRules: {
        include: {
          collection: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return json({ rules });
}

export default function ShippingRulesList() {
  const { rules } = useLoaderData();
  const [expandedRows, setExpandedRows] = useState({});

  const toggleRow = (ruleId) => {
    setExpandedRows((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }));
  };

  const headings = [
    "Country",
    "Delivery Time",
    "Shipping Method",
    "Products",
    "Collections",
    "Date Range",
    "Details",
  ];

  const formatShippingMethod = (method) => {
    if (!method) return "-";
    const methods = {
      express: "Express",
      standard: "Standard",
      pickup: "Pickup",
      local_delivery: "Local Delivery",
    };
    return methods[method] || method;
  };

  const rows = rules.map((rule) => {
    const startDate = rule.startDate ? new Date(rule.startDate).toLocaleDateString() : "-";
    const endDate = rule.endDate ? new Date(rule.endDate).toLocaleDateString() : "-";
    const dateRange = `${startDate} - ${endDate}`;

    return [
      rule.country || "All Countries",
      rule.deliveryTime || "-",
      formatShippingMethod(rule.shippingMethod),
      `${rule.productRules.length}${rule.productRules.some(pr => pr.excluded) ? " (some excluded)" : ""}`,
      `${rule.collectionRules.length}${rule.collectionRules.some(cr => cr.excluded) ? " (some excluded)" : ""}`,
      dateRange,
      <Button
        variant="plain"
        onClick={() => toggleRow(rule.id)}
        accessibilityLabel={expandedRows[rule.id] ? "Hide details" : "Show details"}
      >
        {expandedRows[rule.id] ? "Hide" : "Show"}
      </Button>,
    ];
  });

  return (
    <Page title="Shipping Rules" fullWidth>
      <Layout>
        <Layout.Section>
          <Card padding="0">
            {rules.length === 0 ? (
              <EmptyState
                heading="No shipping rules created yet"
                action={{
                  content: "Create Rule",
                  url: "/app/create-rule",
                }}
                image="https://cdn.shopify.com/s/files/1/0262/4071/5253/files/emptystate-files.png"
              >
                <Text as="p" tone="subdued">
                  Create your first shipping rule to get started.
                </Text>
              </EmptyState>
            ) : (
              <Box padding="400">
                <Box paddingBlockEnd="400">
                  <DataTable
                    columnContentTypes={["text", "text", "text", "text", "text", "text", "text"]}
                    headings={headings}
                    rows={rows}
                    increasedTableDensity
                    verticalAlign="middle"
                  />
                </Box>
                {rules.map((rule) =>
                  expandedRows[rule.id] ? (
                    <Box
                      key={rule.id}
                      padding="400"
                      background="bg-surface-secondary"
                      borderWidth="025"
                      borderColor="border-subdued"
                    >
                      <BlockStack gap="400">
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Products
                          </Text>
                          {rule.productRules.length > 0 ? (
                            <BlockStack gap="100">
                              {rule.productRules.map((productRule) => (
                                <Box
                                  key={productRule.productId}
                                  padding="200"
                                  background="bg-surface"
                                  borderWidth="025"
                                  borderColor="border-subdued"
                                  borderRadius="200"
                                >
                                  <InlineStack gap="200" align="space-between" blockAlign="center">
                                    <Text variant="bodyMd" fontWeight="medium">
                                      {productRule.product?.title || "Unknown Product"}
                                    </Text>
                                    {productRule.excluded && (
                                      <Badge tone="critical">Excluded</Badge>
                                    )}
                                  </InlineStack>
                                </Box>
                              ))}
                            </BlockStack>
                          ) : (
                            <Text as="p" tone="subdued">
                              No products selected
                            </Text>
                          )}
                        </BlockStack>
                        <BlockStack gap="200">
                          <Text variant="headingSm" as="h3">
                            Collections
                          </Text>
                          {rule.collectionRules.length > 0 ? (
                            <BlockStack gap="100">
                              {rule.collectionRules.map((collectionRule) => (
                                <Box
                                  key={collectionRule.collectionId}
                                  padding="200"
                                  background="bg-surface"
                                  borderWidth="025"
                                  borderColor="border-subdued"
                                  borderRadius="200"
                                >
                                  <InlineStack gap="200" align="space-between" blockAlign="center">
                                    <Text variant="bodyMd" fontWeight="medium">
                                      {collectionRule.collection?.title || "Unknown Collection"}
                                    </Text>
                                    {collectionRule.excluded && (
                                      <Badge tone="critical">Excluded</Badge>
                                    )}
                                  </InlineStack>
                                </Box>
                              ))}
                            </BlockStack>
                          ) : (
                            <Text as="p" tone="subdued">
                              No collections selected
                            </Text>
                          )}
                        </BlockStack>
                        {rule.message && (
                          <BlockStack gap="200">
                            <Text variant="headingSm" as="h3">
                              Customer Message
                            </Text>
                            <Box
                              padding="200"
                              background="bg-surface"
                              borderWidth="025"
                              borderColor="border-subdued"
                              borderRadius="200"
                            >
                              <Text as="p" tone="subdued">
                                {rule.message}
                              </Text>
                            </Box>
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Box>
                  ) : null
                )}
              </Box>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}