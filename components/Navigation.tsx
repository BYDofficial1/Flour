
import React from 'react';
import { ChartIcon } from './icons/ChartIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';

type Page = 'transactions' | 'dashboard';

interface NavigationProps {
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${
            isActive
                ? 'bg-amber-500 text-white shadow-md'
                : 'text-slate-600 hover:bg-amber-100 hover:text-amber-800'
        }`}
        aria-current={isActive ? 'page' : undefined}
    >
        {icon}
        <span className="font-semibold">{label}</span>
    </button>
);

const Navigation: React.FC<NavigationProps> = ({ currentPage, setCurrentPage }) => {
    return (
        <nav className="container mx-auto px-4 md:px-6 lg:px-8 -mt-4">
            <div className="bg-white rounded-xl shadow-sm p-2 flex justify-center sm:justify-start space-x-2">
                <NavItem
                    label="Transactions"
                    icon={<ListBulletIcon />}
                    isActive={currentPage === 'transactions'}
                    onClick={() => setCurrentPage('transactions')}
                />
                <NavItem
                    label="Dashboard"
                    icon={<ChartIcon />}
                    isActive={currentPage === 'dashboard'}
                    onClick={() => setCurrentPage('dashboard')}
                />
            </div>
        </nav>
    );
};

export default Navigation;
