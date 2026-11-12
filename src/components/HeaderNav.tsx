import React, { useState } from 'react';
import { WarehouseLocation, WarehouseUser } from '../types/warehouse';
import {
  MapPin,
  ChevronDown,
  Bell,
  QrCode,
  Smartphone,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

interface HeaderNavProps {
  activeWarehouse: WarehouseLocation;
  onChangeWarehouse: (wh: WarehouseLocation) => void;
  activeUser: WarehouseUser | null;
  onOpenAuthModal: () => void;
  onOpenBarcodeHelper: () => void;
  onOpenMobileConnect?: () => void;
  viewMode: 'mobile_frame' | 'responsive';
  onToggleViewMode: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onResetFactoryData: () => void;
  lowStockCount?: number;
  onOpenStockCard?: () => void;
  onOpenNotifications?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  activeWarehouse,
  onChangeWarehouse,
  activeUser,
  onOpenAuthModal,
  onOpenBarcodeHelper,
  onOpenMobileConnect,
  viewMode,
  onToggleViewMode,
  soundEnabled,
  onToggleSound,
  onResetFactoryData,
  lowStockCount = 0,
  onOpenStockCard,
  onOpenNotifications,
}) => {
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showQuickSettings, setShowQuickSettings] = useState(false);

  // Default display user fallback to active warehouse operator
  const displayName = activeUser?.name || 'Nazar Prabowo';
  const displayAvatar =
    activeUser?.avatar ||
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80';

  const warehouseLocations: { id: WarehouseLocation; label: string; city: string }[] = [
    { id: 'Gudang Pusat', label: 'Gudang Pusat', city: 'Yogyakarta, Indonesia' },
    { id: 'Gudang Meruya', label: 'Gudang Meruya', city: 'Jakarta Barat, DKI' },
    { id: 'Gudang Denpasar', label: 'Gudang Denpasar', city: 'Denpasar, Bali' },
    { id: 'Gudang Surabaya', label: 'Gudang Surabaya', city: 'Surabaya, Jawa Timur' },
  ];

  const currentLocationMeta =
    warehouseLocations.find((w) => w.id === activeWarehouse) || warehouseLocations[0];

  return (
    <header className="bg-[#f4f4f5] px-4 pt-3 pb-2 sticky top-0 z-30 select-none border-b border-zinc-200/50">
      <div className="flex items-center justify-between gap-3">
        {/* User Profile & Location Selector (Matches Screen 1 Mockup) */}
        <div className="flex items-center gap-3">
          {/* Avatar with Status Ring */}
          <button
            type="button"
            onClick={onOpenAuthModal}
            title="Profil Pengguna / Ganti Operator"
            className="relative cursor-pointer group"
          >
            <img
              src={displayAvatar}
              alt={displayName}
              className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-[#c8f53c] border-2 border-white rounded-full shadow-xs" />
          </button>

          {/* User Name & Warehouse City Dropdown */}
          <div className="relative">
            <h1
              onClick={onOpenAuthModal}
              className="text-base font-extrabold text-zinc-950 leading-tight cursor-pointer hover:text-zinc-700 transition-colors"
            >
              {displayName}
            </h1>

            <button
              type="button"
              onClick={() => setShowLocationMenu(!showLocationMenu)}
              className="flex items-center gap-1 text-xs text-zinc-500 font-medium hover:text-zinc-900 transition-colors mt-0.5 cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-zinc-400" />
              <span>{currentLocationMeta.city}</span>
              <ChevronDown className="w-3 h-3 text-zinc-400 stroke-[2.5]" />
            </button>

            {/* Warehouse Dropdown Popup */}
            {showLocationMenu && (
              <div className="absolute left-0 top-full mt-2 w-56 bg-[#18181b] text-white rounded-2xl shadow-2xl p-2 z-50 border border-zinc-800 animate-in fade-in zoom-in-95 duration-150">
                <span className="text-[10px] uppercase font-bold text-zinc-400 px-3 py-1 block">
                  Pilih Lokasi Gudang
                </span>
                {warehouseLocations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      onChangeWarehouse(item.id);
                      setShowLocationMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      activeWarehouse === item.id
                        ? 'bg-[#c8f53c] text-black font-bold'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <span>{item.label}</span>
                    <span className="text-[10px] opacity-75 font-normal">{item.city.split(',')[0]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Action Icons: Notification Bell & Utility Toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Critical Stock Alert Pill if low stock */}
          {lowStockCount > 0 && (
            <button
              type="button"
              onClick={onOpenStockCard}
              title={`Ada ${lowStockCount} barang mencapai batas minimum!`}
              className="px-2.5 py-1 bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-3 h-3 stroke-[2.5]" />
              <span>{lowStockCount} Kritis</span>
            </button>
          )}

          {/* Database Master Barang & Barcode Quick Modal */}
          <button
            type="button"
            onClick={onOpenBarcodeHelper}
            title="Database Master Barang: Input Manual, Import Excel & Barcode"
            className="h-9 px-2.5 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/80 flex items-center gap-1.5 text-zinc-800 shadow-xs transition-colors cursor-pointer text-xs font-bold"
          >
            <QrCode className="w-4 h-4 text-zinc-900" />
            <span className="hidden sm:inline text-[11px]">Database</span>
          </button>

          {/* Notification Bell (Matches Screen 1 Mockup) */}
          <button
            type="button"
            onClick={onOpenNotifications || onOpenBarcodeHelper}
            title="Notifikasi Aktivitas"
            className="relative w-9 h-9 rounded-full bg-white hover:bg-zinc-100 border border-zinc-200/80 flex items-center justify-center text-zinc-800 shadow-xs transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4 stroke-[2]" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#c8f53c] ring-2 ring-white shadow-xs" />
          </button>

          {/* Try on Mobile Phone Button */}
          {onOpenMobileConnect && (
            <button
              type="button"
              onClick={onOpenMobileConnect}
              title="Coba Langsung di HP Kamu"
              className="w-9 h-9 rounded-full bg-[#c8f53c] hover:bg-[#b8e830] text-black flex items-center justify-center shadow-xs transition-colors cursor-pointer font-bold text-xs"
            >
              <Smartphone className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
