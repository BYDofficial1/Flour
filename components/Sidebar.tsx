

import React, { Fragment } from 'react';
import { ChartIcon } from './icons/ChartIcon';
import { ListBulletIcon } from './icons/ListBulletIcon';
import { CloseIcon } from './icons/CloseIcon';
import { WheatIcon } from './icons/WheatIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { BellIcon } from './icons/BellIcon';
import { CogIcon } from './icons/CogIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';

type Page = 'transactions' | 'dashboard' | 'calculator' | 'settings' | 'reports';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    currentPage: Page;
    setCurrentPage: (page: Page) => void;
    isEditMode: boolean;
    onToggleEditMode: () => void;
    // Fix: The correct type for Notification.permission is NotificationPermission.
    notificationPermission: NotificationPermission;
    onRequestNotifications: () => void;
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
                    ? 'bg-primary-500 text-white font-bold shadow-lg'
                    : 'text-slate-300 hover:bg-primary-500/20 hover:text-white'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {icon}
            <span className="text-base">{label}</span>
        </button>
    </li>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen, currentPage, setCurrentPage, isEditMode, onToggleEditMode, notificationPermission, onRequestNotifications }) => {

    const handleNavigation = (page: Page) => {
        setCurrentPage(page);
        setIsOpen(false);
    };

    const isNotificationsEnabled = notificationPermission === 'granted';

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
                className={`fixed top-0 left-0 h-full w-64 bg-stone-800 text-white p-4 z-50 transform transition-transform duration-300 ease-in-out shadow-lg flex flex-col justify-between ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 lg:shadow-xl`}
            >
                <div> {/* Top section */}
                    <div className="flex justify-between items-center mb-8">
                         <div className="flex items-center gap-2">
                            <button 
                                onClick={onToggleEditMode} 
                                className="cursor-default focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-800 focus-visible:ring-white rounded-full p-1" 
                                title="Toggle Edit Mode"
                                aria-label="Toggle Edit Mode"
                            >
                                <WheatIcon isEditMode={isEditMode}/>
                            </button>
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-yellow-300">
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
                                label="Dashboard"
                                icon={<ChartIcon />}
                                isActive={currentPage === 'dashboard'}
                                onClick={() => handleNavigation('dashboard')}
                            />
                            <NavItem
                                label="Transactions"
                                icon={<ListBulletIcon />}
                                isActive={currentPage === 'transactions'}
                                onClick={() => handleNavigation('transactions')}
                            />
                             <NavItem
                                label="Reports"
                                icon={<DocumentTextIcon />}
                                isActive={currentPage === 'reports'}
                                onClick={() => handleNavigation('reports')}
                            />
                            <NavItem
                                label="Calculator"
                                icon={<CalculatorIcon />}
                                isActive={currentPage === 'calculator'}
                                onClick={() => handleNavigation('calculator')}
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

                <div> {/* Bottom section */}
                     <ul className="space-y-2 border-t border-slate-600/50 pt-4">
                         <li>
                            <button
                                onClick={onRequestNotifications}
                                disabled={isNotificationsEnabled}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-slate-300 hover:bg-primary-500/20 hover:text-white disabled:opacity-70 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            >
                                <BellIcon isActive={isNotificationsEnabled} />
                                <div className="flex flex-col">
                                    <span className="text-base">Notifications</span>
                                    <span className={`text-xs capitalize ${isNotificationsEnabled ? 'text-green-400' : 'text-yellow-400'}`}>
                                        {isNotificationsEnabled ? 'Enabled' : 'Click to Enable'}
                                    </span>
                                </div>
                            </button>
                         </li>
                    </ul>
                </div>

            </aside>
        </Fragment>
    );
};

export default Sidebar;