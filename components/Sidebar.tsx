import React, { Fragment } from 'react';
import { ChartIcon } from './icons/ChartIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { CloseIcon } from './icons/CloseIcon';
import { WheatIcon } from './icons/WheatIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { useNotifier } from '../context/NotificationContext';
import { CogIcon } from './icons/CogIcon';
import { ReceiptIcon } from './icons/ReceiptIcon';

type Page = 'transactions' | 'dashboard' | 'reports' | 'calculator' | 'settings' | 'expenses';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    isEditMode: boolean;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
    <li>
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left relative ${
                isActive
                    ? 'bg-slate-700/50 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {isActive && <div className="absolute left-0 top-2 bottom-2 w-1 bg-primary-500 rounded-r-full"></div>}
            {icon}
            <span className="text-base">{label}</span>
        </button>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, setCurrentPage, isEditMode }) => {
    const { addNotification } = useNotifier();

    const handleNavigation = (page: Page) => {
        setCurrentPage(page);
        setIsOpen(false);
    };

    return (
        <Fragment>
            <div
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            ></div>

            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-slate-900/95 backdrop-blur-lg border-r border-slate-700/50 text-white p-4 z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col justify-between ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
            >
                <div>
                    <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-3">
                            <WheatIcon />
                            <h1 className="text-xl font-bold text-slate-100">
                                Atta Chakki Hisab
                            </h1>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white lg:hidden -mr-2 flex-shrink-0">
                            <CloseIcon />
                        </button>
                    </div>

                    <nav>
                        <ul className="space-y-2">
                             <NavItem label="Dashboard" icon={<ChartIcon className="h-5 w-5" />} isActive={currentPage === 'dashboard'} onClick={() => handleNavigation('dashboard')} />
                             <NavItem label="Transactions" icon={<ListBulletIcon />} isActive={currentPage === 'transactions'} onClick={() => handleNavigation('transactions')} />
                             <NavItem label="Expenses" icon={<ReceiptIcon className="h-5 w-5" />} isActive={currentPage === 'expenses'} onClick={() => handleNavigation('expenses')} />
                             <NavItem label="Reports" icon={<DocumentTextIcon />} isActive={currentPage === 'reports'} onClick={() => handleNavigation('reports')} />
                             <NavItem label="Calculator" icon={<CalculatorIcon />} isActive={currentPage === 'calculator'} onClick={() => handleNavigation('calculator')} />
                        </ul>
                    </nav>
                </div>
                 <div>
                    <nav>
                        <ul className="space-y-2">
                            <NavItem label="Settings" icon={<CogIcon />} isActive={currentPage === 'settings'} onClick={() => handleNavigation('settings')} />
                        </ul>
                    </nav>
                </div>
            </aside>
        </Fragment>
    );
};

export default Sidebar;