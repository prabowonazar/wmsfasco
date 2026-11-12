import React from 'react';
import {
  Scan,
  Calculator,
  Truck,
  PackageMinus,
  CreditCard,
  FileSpreadsheet,
  Scale,
} from 'lucide-react';

export type AppTab =
  | 'scan_log'
  | 'opname'
  | 'inbound'
  | 'outbound'
  | 'stock_card'
  | 'sync'
  | 'accurate';

interface BottomNavBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  pendingSyncCount: number;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onSelectTab,
  pendingSyncCount,
}) => {
  const tabs = [
    {
      id: 'scan_log' as AppTab,
      label: 'Scan Log',
      shortLabel: 'Scan',
      icon: Scan,
    },
    {
      id: 'opname' as AppTab,
      label: 'Opname',
      shortLabel: 'Opname',
      icon: Calculator,
    },
    {
      id: 'inbound' as AppTab,
      label: 'GR (Masuk)',
      shortLabel: 'GR',
      icon: Truck,
    },
    {
      id: 'outbound' as AppTab,
      label: 'DO (Keluar)',
      shortLabel: 'DO',
      icon: PackageMinus,
    },
    {
      id: 'stock_card' as AppTab,
      label: 'Kartu Stok',
      shortLabel: 'Kartu',
      icon: CreditCard,
    },
    {
      id: 'sync' as AppTab,
      label: 'Spreadsheet',
      shortLabel: 'Sheet',
      icon: FileSpreadsheet,
      badge: pendingSyncCount > 0 ? pendingSyncCount : null,
    },
    {
      id: 'accurate' as AppTab,
      label: 'Accurate',
      shortLabel: 'Accurate',
      icon: Scale,
    },
  ];

  return (
    <div className="fixed bottom-3 left-0 right-0 z-40 flex justify-center pointer-events-none px-2 sm:px-4">
      {/* Floating Dark Pill Dock with Electric Lime Active Pill (Theme from Mockup) */}
      <nav className="pointer-events-auto bg-[#18181B] text-white rounded-full p-1.5 shadow-[0_20px_45px_rgba(0,0,0,0.55)] border border-zinc-800/90 flex items-center gap-1 max-w-full overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full text-xs transition-all cursor-pointer shrink-0 ${
                isActive
                  ? 'bg-[#C6F232] text-zinc-950 font-extrabold shadow-md scale-100'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
              }`}
            >
              <div className="relative flex items-center">
                <Icon className={`w-4 h-4 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-2 text-[9px] font-mono font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow ${
                      isActive ? 'bg-zinc-950 text-[#C6F232]' : 'bg-[#C6F232] text-zinc-950'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Show text label on active tab or larger screens */}
              <span className={isActive ? 'inline font-extrabold' : 'hidden md:inline'}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
