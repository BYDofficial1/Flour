import React, { Fragment } from 'react';
import { ChartIcon } from './icons/ChartIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { CloseIcon } from './icons/CloseIcon';
import { WheatIcon } from './icons/WheatIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CogIcon } from './icons/CogIcon';

type Page = 'transactions' | 'dashboard' | 'calculator' | 'insights' | 'settings';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
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
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                isActive
                    ? 'bg-amber-500 text-white font-bold shadow-lg'
                    : 'text-slate-300 hover:bg-amber-500/20 hover:text-white'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {icon}
            <span className="text-base">{label}</span>
        </button>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, setCurrentPage }) => {

    const handleNavigation = (page: Page) => {
        setCurrentPage(page);
        setIsOpen(false);
    };

    return (
        <Fragment>
            {/* Overlay */}
            <div
                onClick={() => setIsOpen(false)}
                className={`fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300 lg:hidden ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
            ></div>

            {/* Sidebar */}
            <aside
                className={`fixed top-0 left-0 h-full w-64 bg-stone-800 text-white p-4 z-50 transform transition-transform duration-300 ease-in-out shadow-lg flex flex-col ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 lg:shadow-xl`}
            >
                <div className="flex-shrink-0">
                    <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-2">
                            <WheatIcon/>
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
                               Atta Chakki Hisab
                            </span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white lg:hidden">
                            <CloseIcon />
                        </button>
                    </div>

                    <nav>
                        <ul className="space-y-2">
                            <NavItem
                                label="Transactions"
                                icon={<ListBulletIcon />}
                                isActive={currentPage === 'transactions'}
                                onClick={() => handleNavigation('transactions')}
                            />
                            <NavItem
                                label="Dashboard"
                                icon={<ChartIcon />}
                                isActive={currentPage === 'dashboard'}
                                onClick={() => handleNavigation('dashboard')}
                            />
                            <NavItem
                                label="Calculator"
                                icon={<CalculatorIcon />}
                                isActive={currentPage === 'calculator'}
                                onClick={() => handleNavigation('calculator')}
                            />
                            <li className="pt-4 pb-2 px-4">
                               <span className="text-xs font-semibold text-slate-500 uppercase">Tools & More</span>
                            </li>
                             <NavItem
                                label="AI Insights"
                                icon={<SparklesIcon />}
                                isActive={currentPage === 'insights'}
                                onClick={() => handleNavigation('insights')}
                            />
                             <NavItem
                                label="Settings"
                                icon={<CogIcon />}
                                isActive={currentPage === 'settings'}
                                onClick={() => handleNavigation('settings')}
                            />
                        </ul>
                    </nav>
                </div>

            </aside>
        </Fragment>
    );
};

export default Sidebar;