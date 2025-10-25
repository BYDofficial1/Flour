


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
    customerName?: string;
    totalKg: number;
    totalPrice: number;
    bags: { weight: number }[];
    createdAt: string;
    notes?: string;
    pricePerMaund?: number;
    updatedAt?: string;
}

export interface Reminder {
    id: string;
    transactionId: string;
    remindAt: string;
}


// Fix: Define and export Theme and Settings types.
export type Theme = 'amber' | 'blue' | 'green' | 'slate';

export interface Settings {
    soundEnabled: boolean;
    theme: Theme;
}