import type { Transaction, Expense, Receivable, Calculation, Service, ExpenseCategory, Settings } from '../types';
import { formatCurrency } from './currency';

type BackupData = {
    transactions: Transaction[];
    expenses: Expense[];
    receivables: Receivable[];
    calculations: Calculation[];
    services: Service[];
    expenseCategories: ExpenseCategory[];
    settings: Settings;
};

type BackupFile = {
    version: number;
    exportedAt: string;
    data: BackupData;
};

export const exportDataToJson = (data: BackupData) => {
    const backupFile: BackupFile = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: data
    };

    const jsonString = JSON.stringify(backupFile, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    const dateString = new Date().toISOString().split('T')[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `chakki_hisab_backup_${dateString}.json`);
    
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const validateBackupFile = (parsedJson: any): parsedJson is BackupFile => {
    if (typeof parsedJson !== 'object' || parsedJson === null) return false;
    
    const hasCoreKeys = 'version' in parsedJson && 'exportedAt' in parsedJson && 'data' in parsedJson;
    if (!hasCoreKeys) return false;

    const data = parsedJson.data;
    const hasDataKeys = 'transactions' in data && 'expenses' in data && 'receivables' in data && 'calculations' in data && 'services' in data && 'expenseCategories' in data && 'settings' in data;
    if (!hasDataKeys) return false;

    // Basic type checking
    return Array.isArray(data.transactions) && Array.isArray(data.expenses) && typeof data.settings === 'object';
};


export const exportTransactionsToTxt = (transactions: Transaction[]) => {
    if (transactions.length === 0) {
        alert('No transactions to export.');
        return;
    }

    const now = new Date();
    const exportDateTime = now.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });

    let reportContent = `
*********************************************
      ATTA CHAKKI HISAB - TRANSACTION EXPORT
*********************************************

Export Date: ${exportDateTime}
Total Transactions: ${transactions.length}

---------------------------------------------
          TRANSACTION DETAILS
---------------------------------------------
`;

    transactions.forEach((t, index) => {
        const balanceDue = t.total - (t.paid_amount || 0);
        const transactionCard = `
=============================================
Transaction #${index + 1}
---------------------------------------------
ID:            ${t.id}
Date:          ${new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
Customer:      ${t.customer_name}
Mobile:        ${t.customer_mobile || 'N/A'}
Item:          ${t.item}

--- Breakdown ---
Quantity:      ${t.quantity.toFixed(2)} kg
Rate:          ${t.rate.toFixed(2)} Rs/kg
Grinding Cost: ${(t.grinding_cost || 0).toFixed(2)} Rs
Cleaning Cost: ${(t.cleaning_cost || 0).toFixed(2)} Rs
-----------------
TOTAL:         ${t.total.toFixed(2)} Rs
-----------------

--- Payment ---
Status:        ${t.payment_status.toUpperCase()}
Paid Amount:   ${(t.paid_amount || 0).toFixed(2)} Rs
Balance Due:   ${balanceDue.toFixed(2)} Rs
---------------

Notes:
${t.notes || 'No notes provided.'}
=============================================
`;
        reportContent += transactionCard;
    });
    
    reportContent += `
*********************************************
            END OF REPORT
*********************************************
`;

    const blob = new Blob([reportContent.trim()], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const dateString = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
    link.setAttribute("download", `transactions_report_${dateString}.txt`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};


export const exportMonthlyReportToTxt = (transactions: Transaction[], date: Date, stats: any) => {
    const monthYear = date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const now = new Date();
    const exportDateTime = now.toLocaleString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });

    let reportContent = `
*********************************************
      ATTA CHAKKI HISAB - MONTHLY REPORT
*********************************************

Report for:         ${monthYear}
Export Date:        ${exportDateTime}

---------------------------------------------
          MONTHLY SUMMARY
---------------------------------------------
Total Sales:        ${formatCurrency(stats.totalSales)}
Total Quantity:     ${stats.totalQuantity.toFixed(2)} kg
Total Transactions: ${stats.totalTransactions}
Total Due Balance:  ${formatCurrency(stats.totalDue)}

---------------------------------------------
          TRANSACTION DETAILS
---------------------------------------------
`;

    transactions.forEach((t, index) => {
        const balanceDue = t.total - (t.paid_amount || 0);
        reportContent += `
---------------------------------------------
  #${index + 1} | ${new Date(t.date).toLocaleDateString('en-CA')} | ${t.customer_name}
---------------------------------------------
  Item:         ${t.item}
  Quantity:     ${t.quantity.toFixed(2)} kg @ ${formatCurrency(t.rate)}/kg
  Total:        ${formatCurrency(t.total)}
  Status:       ${t.payment_status.toUpperCase()} (Due: ${formatCurrency(balanceDue)})
`;
    });

    reportContent += `
*********************************************
            END OF REPORT
*********************************************
`;

    const blob = new Blob([reportContent.trim()], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);

    const dateString = `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    link.setAttribute("download", `monthly_report_${dateString}.txt`);

    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
