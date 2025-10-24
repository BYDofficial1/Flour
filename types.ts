



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
    cleaningCost?: number;
    notes?: string;
    updatedAt?: string;
    paymentStatus: 'paid' | 'unpaid' | 'partial';
    paidAmount?: number;
}

export interface Calculation {
    id: string;
    customer_name: string;
    total_kg: number;
    total_price: number;
    bags: { weight: number }[];
    created_at: string;
    notes?: string;
    price_per_maund?: number;
}

export interface Reminder {
    id: string;
    transactionId: string;
    remindAt: string;
}


// Fix: Define and export Theme and Settings types.
export type Theme = 'amber' | 'blue' | 'green' | 'slate';

export interface Settings {
    theme: Theme;
}