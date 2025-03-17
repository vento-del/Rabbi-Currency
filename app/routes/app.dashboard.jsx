import { Layout, Page, Text, Card, Button, Popover, ActionList, Badge } from '@shopify/polaris';
import React, { useState, useEffect, useCallback } from 'react';
import { useLoaderData } from '@remix-run/react'; // Make sure you're using Remix
import { authenticate } from '../shopify.server';

export const loader = async ({ request }) => {
    const { admin } = await authenticate.admin(request);

    const response = await admin.graphql(`
        query fetchShop {
            shop {
                id
                metafield(namespace: "custom", key: "selected_currencies") {
                    value
                }
            }
        }
    `);

    const shopData = (await response.json()).data;
    const selectedCurrencies = shopData?.shop?.metafield?.value
        ? JSON.parse(shopData.shop.metafield.value)
        : [];

    return new Response(JSON.stringify({ selectedCurrencies, shopId: shopData?.shop?.id }), {
        headers: { "Content-Type": "application/json" },
    });
};

export default function NewPage() {
    const { selectedCurrencies: initialSelectedCurrencies, shopId } = useLoaderData();
    const [popoverActive, setPopoverActive] = useState(false);
    const [selectedCurrencies, setSelectedCurrencies] = useState(initialSelectedCurrencies || []);

    const togglePopover = () => setPopoverActive((active) => !active);

    const currencies = [
        { name: 'US Dollar', code: 'USD' },
        { name: 'Euro', code: 'EUR' },
        { name: 'British Pound', code: 'GBP' },
        { name: 'Japanese Yen', code: 'JPY' },
        { name: 'Indian Rupee', code: 'INR' }
    ];

    const handleCurrencySelection = (currency) => {
        setSelectedCurrencies((prev) => {
            const isSelected = prev.some((item) => item.code === currency.code);
            return isSelected
                ? prev.filter((item) => item.code !== currency.code)
                : [...prev, currency];
        });
    };

    const deleteSelected = (currency) => {
        setSelectedCurrencies((prev) => prev.filter((item) => item.code !== currency.code));
    };

    const saveSelectedCurrenciesToMetafield = useCallback(async () => {
        try {
            const response = await fetch('/api/metafield', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    namespace: 'custom',
                    key: 'selected_currencies',
                    type: 'json',
                    value: JSON.stringify(selectedCurrencies),
                    ownerId: shopId,
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to update metafield: ${response.statusText}`);
            }

            const jsonResponse = await response.json();
            console.log("Saved Metafield Response:", jsonResponse);
        } catch (error) {
            console.error("Error saving metafield:", error);
        }
    }, [selectedCurrencies, shopId]);

    useEffect(() => {
        if (selectedCurrencies.length >= 0) {
            saveSelectedCurrenciesToMetafield();
        }
    }, [selectedCurrencies, saveSelectedCurrenciesToMetafield]);

    const currencyItems = currencies.map((currency) => ({
        content: `${currency.name} (${currency.code})`,
        onAction: () => handleCurrencySelection(currency),
        active: selectedCurrencies.some((item) => item.code === currency.code),
    }));

    return (
        <Page>
            <Layout>
                <Layout.Section>
                    <Card>
                        <Text as="h5" variant="bodyMd">Shop ID: {shopId}</Text>

                        <Text as="h5" variant="bodyMd">Select Currencies</Text>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                            <Popover
                                active={popoverActive}
                                activator={
                                    <Button onClick={togglePopover} disclosure>
                                        Choose Currencies
                                    </Button>
                                }
                                onClose={togglePopover}
                            >
                                <ActionList items={currencyItems} />
                            </Popover>

                            {selectedCurrencies.length > 0 && (
                                <div>
                                    <Text variant="bodyMd">Selected Currencies:</Text>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
                                        {selectedCurrencies.map((currency) => (
                                            <div key={currency.code} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Badge status="success">
                                                    {currency.name} ({currency.code})
                                                </Badge>
                                                <span
                                                    style={{ cursor: 'pointer', color: 'red', fontWeight: 'bold' }}
                                                    onClick={() => deleteSelected(currency)}
                                                >
                                                    ✖
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </Layout.Section>
            </Layout>
        </Page>
    );
}
