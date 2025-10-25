export interface Transaction {
    id: string;
    customer_name: string;
    item: string;
    quantity: number; // in kg
    rate: number; // per kg
    total: number;
    date: string;
    customer_mobile?: string;
    grinding_cost?: number;
    cleaning_cost?: number;
    notes?: string;
    created_at: string;
    updated_at?: string;
    payment_status: 'paid' | 'unpaid' | 'partial';
    paid_amount?: number;
    user_id?: string;
}

export interface Calculation {
    id: string;
    customer_name?: string;
    total_kg: number;
    total_price: number;
    bags: { weight: number }[];
    created_at: string;
    notes?: string;
    price_per_maund?: number;
    updated_at?: string;
    user_id?: string;
}

export interface Reminder {
    id: string;
    transactionId: string;
    remindAt: string;
    isDismissed?: boolean;
}

export type Theme = 'amber' | 'blue' | 'green' | 'slate';

export interface Settings {
    soundEnabled: boolean;
    theme: Theme;
}