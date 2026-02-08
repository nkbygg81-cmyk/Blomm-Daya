/**
* Format price as whole number without decimals
* Example: 120.50 -> "120"
*/
export const formatPrice = (price: number): string => {
return Math.round(price).toString();
};

/**
* Format price with currency
* Example: 120.50, "kr" -> "120 kr"
*/
export const formatPriceWithCurrency = (price: number, currency: string = "kr"): string => {
return `${formatPrice(price)} ${currency}`;
};
