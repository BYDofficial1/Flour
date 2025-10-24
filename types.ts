
export interface Transaction {
    id: string;
    customerName: string;
    item: string;
    quantity: number; // in kg
    rate: number; // per kg
    total: number;
    date: string;
    customerMobile?: string;
    grindingCost?: number;
    notes?: string;
}