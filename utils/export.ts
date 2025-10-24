import type { Transaction } from '../types';
import { formatCurrency } from './currency';

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
        const balanceDue = t.total - (t.paidAmount || 0);
        const transactionCard = `
=============================================
Transaction #${index + 1}
---------------------------------------------
ID:            ${t.id}
Date:          ${new Date(t.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year:'numeric', hour: 'numeric', minute: '2-digit', hour12: true })}
Customer:      ${t.customerName}
Mobile:        ${t.customerMobile || 'N/A'}
Item:          ${t.item}

--- Breakdown ---
Quantity:      ${t.quantity.toFixed(2)} kg
Rate:          ${t.rate.toFixed(2)} Rs/kg
Grinding Cost: ${(t.grindingCost || 0).toFixed(2)} Rs
Cleaning Cost: ${(t.cleaningCost || 0).toFixed(2)} Rs
-----------------
TOTAL:         ${t.total.toFixed(2)} Rs
-----------------

--- Payment ---
Status:        ${t.paymentStatus.toUpperCase()}
Paid Amount:   ${(t.paidAmount || 0).toFixed(2)} Rs
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
        const balanceDue = t.total - (t.paidAmount || 0);
        reportContent += `
---------------------------------------------
  #${index + 1} | ${new Date(t.date).toLocaleDateString('en-CA')} | ${t.customerName}
---------------------------------------------
  Item:         ${t.item}
  Quantity:     ${t.quantity.toFixed(2)} kg @ ${formatCurrency(t.rate)}/kg
  Total:        ${formatCurrency(t.total)}
  Status:       ${t.paymentStatus.toUpperCase()} (Due: ${formatCurrency(balanceDue)})
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
