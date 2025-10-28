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
    took_flour?: boolean; // Kept for backward compatibility
    flour_taken_kg?: number;
    is_settled?: boolean;
    paid_cleaning_with_flour?: boolean;
    paid_grinding_with_flour?: boolean;
    grinding_cost_flour_kg?: number;
    cleaning_cost_flour_kg?: number;
    cleaning_reduction_kg?: number;
    grinding_reduction_kg?: number;
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

export type Theme = 'amber' | 'blue' | 'green' | 'slate' | 'red' | 'rose' | 'violet' | 'indigo' | 'teal' | 'cyan';

export interface Settings {
    soundEnabled: boolean;
    theme: Theme;
}

export interface Service {
    id: string;
    user_id: string;
    name: string;
    default_rate?: number;
    category?: string;
    created_at: string;
}

export interface ExpenseCategory {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface Expense {
    id: string;
    user_id: string;
    created_at: string;
    expense_name: string;
    amount: number;
    date: string;
    category: string;
    notes?: string;
}

export interface Receivable {
    id: string;
    user_id: string;
    person_name: string;
    amount: number;
    due_date?: string;
    notes?: string;
    status: 'pending' | 'received';
    created_at: string;
    updated_at?: string;
}