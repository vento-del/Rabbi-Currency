import { json } from "@remix-run/node";
import { useLoaderData, useFetcher } from "@remix-run/react";
import { GraphQLClient } from "graphql-request";
import { useState, useEffect } from "react";


const GRAPHQL_ENDPOINT = "https://ankie-23.myshopify.com/admin/api/2024-01/graphql.json";




const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    "X-Shopify-Access-Token": "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",
    "Content-Type": "application/json",
  },
});

export const loader = async () => {
  const query = `
    {
      shop {
        id
        name
        metafields(first: 10) {
          edges {
            node {
              id
              namespace
              key
              value
            }
          }
        }
      }
    }
  `;

  try {
    const data = await client.request(query);
    return json(data);
  } catch (error) {
    console.error("Error fetching shop data:", error);
    return json({ error: "Failed to fetch shop data" }, { status: 500 });
  }
};

export const action = async ({ request }) => {
  const formData = await request.formData();
  const selectedCurrenciesArray = formData.getAll("currencies");

  // Convert the array into an object { "USD": "US Dollar", "EUR": "Euro" }
  const selectedCurrencies = selectedCurrenciesArray.reduce((acc, item) => {
    const [code, name] = item.split(":");
    acc[code] = name;
    return acc;
  }, {});

  const mutation = `
    mutation CreateMetafield($input: MetafieldsSetInput!) {
      metafieldsSet(metafields: [$input]) {
        metafields {
          id
          namespace
          key
          value
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      ownerId: "gid://shopify/Shop/84384940321",
      namespace: "custom",
      key: "selected_currencies",
      type: "json",
      value: JSON.stringify(selectedCurrencies),
    },
  };

  try {
    const response = await client.request(mutation, variables);
    return json(response);
  } catch (error) {
    console.error("Error updating metafield:", error);
    return json({ error: "Failed to update metafield" }, { status: 500 });
  }
};

export default function Shop() {
  const data = useLoaderData();
  const fetcher = useFetcher();
  const [selectedCurrencies, setSelectedCurrencies] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currencies = [
    { name: "US Dollar", code: "USD" },
    { name: "Euro", code: "EUR" },
    { name: "British Pound", code: "GBP" },
    { name: "Indian Rupee", code: "INR" },
    { name: "Japanese Yen", code: "JPY" },
  ];

  // ✅ Load existing metafield values from Shopify
  useEffect(() => {
    const metafield = data.shop.metafields.edges.find(
      (m) => m.node.namespace === "custom" && m.node.key === "selected_currencies"
    );

    if (metafield && metafield.node.value) {
      try {
        setSelectedCurrencies(JSON.parse(metafield.node.value));
      } catch (error) {
        console.error("Failed to parse metafield JSON", error);
      }
    }
  }, [data]);

  const handleCurrencyChange = (event) => {
    const { value, checked } = event.target;
    const [code, name] = value.split(":");

    setSelectedCurrencies((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[code] = name; // ✅ Add currency if checked
      } else {
        delete updated[code]; // ✅ Remove currency if unchecked
      }
      return updated;
    });
  };

  return (
    <div>
      <h1>Shop Info</h1>
      <p><strong>ID:</strong> {data.shop.id}</p>
      <p><strong>Name:</strong> {data.shop.name}</p>

      <h2>Metafields</h2>
      <ul>
        {data.shop.metafields.edges.map(({ node }) => (
          <li key={node.id}>
            <strong>{node.namespace}.{node.key}:</strong> {node.value}
          </li>
        ))}
      </ul>

      <fetcher.Form method="post">
        <div style={{ position: "relative", display: "inline-block" }}>
          <button 
            type="button" 
            onClick={() => setDropdownOpen(!dropdownOpen)} 
            style={{ padding: "10px", cursor: "pointer", borderRadius: "5px", background: "#007bff", color: "#fff", border: "none" }}
          >
            Select Currencies
          </button>

          {dropdownOpen && (
            <div style={{ 
              position: "absolute", 
              top: "100%", 
              left: 0, 
              background: "#fff", 
              border: "1px solid #ccc", 
              borderRadius: "5px", 
              padding: "10px", 
              boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", 
              zIndex: 1000
            }}>
              {currencies.map((currency) => (
                <label key={currency.code} style={{ display: "block", padding: "5px 0" }}>
                  <input
                    type="checkbox"
                    name="currencies"
                    value={`${currency.code}:${currency.name}`}
                    checked={selectedCurrencies.hasOwnProperty(currency.code)} // ✅ Fix: Uses hasOwnProperty() to check state
                    onChange={handleCurrencyChange}
                  />
                  {currency.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {/* ✅ Hidden Inputs for Form Submission */}
        {Object.entries(selectedCurrencies).map(([code, name]) => (
          <input key={code} type="hidden" name="currencies" value={`${code}:${name}`} />
        ))}

        <div>
          <h3>Selected Currencies:</h3>
          <p>{Object.keys(selectedCurrencies).length > 0 
            ? JSON.stringify(selectedCurrencies) 
            : "None selected"}
          </p>
        </div>

        <button type="submit" disabled={Object.keys(selectedCurrencies).length === 0}>
          Update Metafield
        </button>
      </fetcher.Form>
    </div>
  );
}
