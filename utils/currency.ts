
export const formatCurrency = (amount: number): string => {
    if (isNaN(amount)) {
        amount = 0;
    }
    // Formats number with commas for thousands, millions, etc.
    return `Rs ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};
