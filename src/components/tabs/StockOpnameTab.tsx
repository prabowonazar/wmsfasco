import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  OpnameSession,
  OpnameItemCount,
  WarehouseLocation,
  WarehouseUser,
} from '../../types/warehouse';
import { CameraBarcodeScanner } from '../CameraBarcodeScanner';
import {
  Calculator,
  Play,
  CheckCircle2,
  AlertTriangle,
  Scan,
  RefreshCw,
  Plus,
  Minus,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  FileCheck2,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface StockOpnameTabProps {
  inventory: InventoryItem[];
  opnameSessions: OpnameSession[];
  onSaveOpnameSessions: (sessions: OpnameSession[]) => void;
  activeWarehouse: WarehouseLocation;
  activeUser: WarehouseUser;
  onOpenTestBarcodes: () => void;
  onApplyOpnameAdjustment: (session: OpnameSession) => void;
  externalBarcodeToScan?: string | null;
  onClearExternalBarcode?: () => void;
}

export const StockOpnameTab: React.FC<StockOpnameTabProps> = ({
  inventory,
  opnameSessions,
  onSaveOpnameSessions,
  activeWarehouse,
  activeUser,
  onOpenTestBarcodes,
  onApplyOpnameAdjustment,
  externalBarcodeToScan,
  onClearExternalBarcode,
}) => {
  // Find currently active session or the first one
  const [activeSessionId, setActiveSessionId] = useState<string>(
    opnameSessions.find((s) => s.status === 'active')?.id || opnameSessions[0]?.id || ''
  );

  const activeSession = opnameSessions.find((s) => s.id === activeSessionId) || opnameSessions[0];

  // Camera scanner visibility
  const [showScanner, setShowScanner] = useState(false);

  // Active item being counted
  const [selectedSku, setSelectedSku] = useState<string>('');
  const [activeItemCount, setActiveItemCount] = useState<OpnameItemCount | null>(null);

  // New session modal
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionZone, setNewSessionZone] = useState('Zona A & B (Semua Rak)');

  // Rapid continuous scan mode (each scan increments count by 1 automatically)
  const [rapidIncrementMode, setRapidIncrementMode] = useState(true);

  // Select initial item when session opens
  useEffect(() => {
    if (activeSession && activeSession.items.length > 0 && !selectedSku) {
      const first = activeSession.items[0];
      setSelectedSku(first.sku);
      setActiveItemCount(first);
    }
  }, [activeSession, selectedSku]);

  // Handle barcode scanned during opname
  const handleBarcodeDecoded = (code: string) => {
    if (!activeSession) return;

    // Find in session items
    let target = activeSession.items.find(
      (item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase()
    );

    if (!target) {
      // Find in master inventory
      const master = inventory.find(
        (m) => m.barcode === code || m.sku.toLowerCase() === code.toLowerCase()
      );
      if (master) {
        const newItemCount: OpnameItemCount = {
          sku: master.sku,
          barcode: master.barcode,
          name: master.name,
          binLocation: master.defaultBin,
          systemStock: master.stock[activeSession.warehouse] || 0,
          physicalCount: 1,
          difference: 1 - (master.stock[activeSession.warehouse] || 0),
          costPrice: master.costPrice,
          lastScannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          notes: 'Item baru ditambahkan saat opname fisik',
        };

        const updatedItems = [...activeSession.items, newItemCount];
        updateSessionItems(updatedItems);
        setSelectedSku(newItemCount.sku);
        setActiveItemCount(newItemCount);
        soundService.playSuccessChime();
        return;
      } else {
        soundService.playErrorBuzz();
        alert(`Barcode ${code} tidak ditemukan di master inventory.`);
        return;
      }
    }

    // Found in session
    const nextCount = rapidIncrementMode ? target.physicalCount + 1 : target.physicalCount;
    const diff = nextCount - target.systemStock;

    const updated = activeSession.items.map((it) =>
      it.sku === target!.sku
        ? {
            ...it,
            physicalCount: nextCount,
            difference: diff,
            lastScannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }
        : it
    );

    updateSessionItems(updated);
    setSelectedSku(target.sku);
    setActiveItemCount({
      ...target,
      physicalCount: nextCount,
      difference: diff,
    });
    soundService.playScanBeep();
  };

  useEffect(() => {
    if (externalBarcodeToScan) {
      handleBarcodeDecoded(externalBarcodeToScan);
      if (onClearExternalBarcode) onClearExternalBarcode();
    }
  }, [externalBarcodeToScan]);

  const updateSessionItems = (items: OpnameItemCount[]) => {
    const updatedSessions = opnameSessions.map((s) =>
      s.id === activeSession.id ? { ...s, items } : s
    );
    onSaveOpnameSessions(updatedSessions);
  };

  const handleManualCountChange = (newCount: number) => {
    if (!activeItemCount || !activeSession) return;
    const validCount = Math.max(0, newCount);
    const diff = validCount - activeItemCount.systemStock;

    const updated = activeSession.items.map((it) =>
      it.sku === activeItemCount.sku
        ? {
            ...it,
            physicalCount: validCount,
            difference: diff,
            lastScannedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
          }
        : it
    );

    updateSessionItems(updated);
    setActiveItemCount({
      ...activeItemCount,
      physicalCount: validCount,
      difference: diff,
    });
  };

  const handleCreateNewSession = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newSessionTitle.trim() || `Opname ${activeWarehouse} - ${new Date().toLocaleDateString('id-ID')}`;
    const newSession: OpnameSession = {
      id: 'opname-' + Date.now(),
      code: `OPN-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      title,
      warehouse: activeWarehouse,
      targetBinZone: newSessionZone,
      status: 'active',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      operatorName: activeUser.name,
      items: inventory.map((inv) => ({
        sku: inv.sku,
        barcode: inv.barcode,
        name: inv.name,
        binLocation: inv.defaultBin,
        systemStock: inv.stock[activeWarehouse] || 0,
        physicalCount: 0,
        difference: -(inv.stock[activeWarehouse] || 0),
        costPrice: inv.costPrice,
      })),
    };

    onSaveOpnameSessions([newSession, ...opnameSessions]);
    setActiveSessionId(newSession.id);
    setIsCreatingSession(false);
    setNewSessionTitle('');
    soundService.playSuccessChime();
  };

  const handleFinishOpname = () => {
    if (!activeSession) return;
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menyelesaikan sesi "${activeSession.title}" dan menerapkan penyesuaian selisih ke Kartu Stok gudang?`
    );
    if (!confirmed) return;

    onApplyOpnameAdjustment(activeSession);
    soundService.playSuccessChime();
  };

  // Calculations
  const totalItemsCounted = activeSession?.items.filter((it) => it.lastScannedAt).length || 0;
  const totalItemsTarget = activeSession?.items.length || 0;
  const matchCount = activeSession?.items.filter((it) => it.difference === 0 && it.lastScannedAt).length || 0;
  const discrepancyItems = activeSession?.items.filter((it) => it.difference !== 0) || [];

  return (
    <div className="space-y-4 pb-12">
      {/* Sesi Opname Header & Switcher */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg border border-purple-500/20">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Hitung Opname (Rekonsel)
              </h2>
              <p className="text-[11px] text-zinc-400">
                Sesi Hitung Fisik vs Saldo Sistem Real-Time (Rekonsiliasi)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingSession(!isCreatingSession)}
            className="text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" /> Sesi Baru
          </button>
        </div>

        {/* Modal / Form Buat Sesi Baru */}
        {isCreatingSession && (
          <form
            onSubmit={handleCreateNewSession}
            className="p-3 mb-3 bg-zinc-950 border border-amber-500/40 rounded-xl space-y-2.5 animate-in fade-in"
          >
            <div className="text-xs font-bold text-amber-300">Mulai Sesi Hitung Baru</div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Nama / Judul Sesi Sensus</label>
              <input
                type="text"
                value={newSessionTitle}
                onChange={(e) => setNewSessionTitle(e.target.value)}
                placeholder="Contoh: Opname Akhir Pekan - Rak A (Komponen)"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Zona / Rak Target</label>
                <input
                  type="text"
                  value={newSessionZone}
                  onChange={(e) => setNewSessionZone(e.target.value)}
                  placeholder="Zona A, Rak 01 - 04"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Lokasi Gudang</label>
                <div className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-xs font-bold text-amber-400">
                  {activeWarehouse}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingSession(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg cursor-pointer"
              >
                Mulai Sesi Sekarang
              </button>
            </div>
          </form>
        )}

        {/* Active Session Card */}
        {activeSession ? (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  {activeSession.code}
                </span>
                <h3 className="text-xs font-bold text-white mt-1">{activeSession.title}</h3>
                <p className="text-[11px] text-zinc-400">
                  Gudang: <span className="text-zinc-200">{activeSession.warehouse}</span> · PIC:{' '}
                  <span className="text-zinc-200">{activeSession.operatorName}</span>
                </p>
              </div>

              <div className="text-right">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                    activeSession.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400'
                  }`}
                >
                  {activeSession.status === 'active' ? '● SESI AKTIF' : 'SELESAI'}
                </span>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Progress: <strong className="text-amber-400">{totalItemsCounted}</strong> /{' '}
                  {totalItemsTarget} Item
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    totalItemsTarget > 0 ? (totalItemsCounted / totalItemsTarget) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="text-xs text-zinc-400 py-3 text-center">
            Belum ada sesi opname aktif. Silakan klik &quot;Sesi Baru&quot;.
          </div>
        )}
      </section>

      {/* Sub Fitur 2 & 3: Scan dan Bandingkan + Input Jumlah Fisik */}
      {activeSession && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Scan & Bandingkan Fisik
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Arahkan scanner ke barang untuk update hitungan fisik
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRapidIncrementMode(!rapidIncrementMode)}
                className={`text-[10px] px-2 py-1 rounded-lg border font-mono transition-colors ${
                  rapidIncrementMode
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
                title="Tiap scan langsung menambah +1"
              >
                {rapidIncrementMode ? '⚡ Multi-Scan (+1)' : 'Manual Mode'}
              </button>

              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 rounded-lg border border-zinc-700 cursor-pointer"
              >
                {showScanner ? 'Tutup Kamera' : 'Buka Kamera'}
              </button>
            </div>
          </div>

          {/* Camera scanner for opname */}
          {showScanner && (
            <CameraBarcodeScanner
              isScanning={showScanner}
              onScan={handleBarcodeDecoded}
              onOpenTestBarcodes={onOpenTestBarcodes}
            />
          )}

          {/* Active Item Discrepancy Card */}
          {activeItemCount ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      {activeItemCount.sku}
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Rak: <strong className="text-zinc-200">{activeItemCount.binLocation}</strong>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{activeItemCount.name}</h4>
                  <p className="font-mono text-[11px] text-zinc-500">
                    Barcode: {activeItemCount.barcode}
                  </p>
                </div>

                {/* Variance Status Pill */}
                <div
                  className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 ${
                    activeItemCount.difference === 0
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : activeItemCount.difference > 0
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  {activeItemCount.difference === 0 ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Cocok (0)
                    </>
                  ) : activeItemCount.difference > 0 ? (
                    <>
                      <TrendingUp className="w-4 h-4" /> Lebih (+{activeItemCount.difference})
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" /> Kurang ({activeItemCount.difference})
                    </>
                  )}
                </div>
              </div>

              {/* Side by side comparison: Sistem vs Fisik */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">
                    Saldo Sistem WMS
                  </span>
                  <span className="text-2xl font-black font-mono text-zinc-200">
                    {activeItemCount.systemStock}
                  </span>
                  <span className="text-[10px] text-zinc-500 block">Unit Terdaftar</span>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center">
                  <span className="text-[10px] uppercase font-mono text-amber-400 block mb-0.5">
                    Hitungan Fisik Nyata
                  </span>
                  <span className="text-2xl font-black font-mono text-amber-300">
                    {activeItemCount.physicalCount}
                  </span>
                  <span className="text-[10px] text-amber-500/80 block">Hasil Scan Gudang</span>
                </div>
              </div>

              {/* Quick Input Counter & Keypad Buttons */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold text-zinc-400">
                  Input Jumlah Fisik Cepat:
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleManualCountChange(activeItemCount.physicalCount + 1)}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualCountChange(activeItemCount.physicalCount + 5)}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> 5
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualCountChange(activeItemCount.physicalCount + 10)}
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" /> 10
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleManualCountChange(Math.max(0, activeItemCount.physicalCount - 1))
                    }
                    className="p-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5 text-red-400" /> 1
                  </button>
                  <button
                    type="button"
                    onClick={() => handleManualCountChange(0)}
                    className="p-2.5 bg-zinc-800 hover:bg-red-950/60 active:scale-95 text-zinc-300 hover:text-red-400 font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer"
                  >
                    Reset
                  </button>
                </div>

                {/* Direct Numeric Input */}
                <div className="flex gap-2 items-center pt-1">
                  <span className="text-[11px] text-zinc-400 whitespace-nowrap">Input Angka:</span>
                  <input
                    type="number"
                    min="0"
                    value={activeItemCount.physicalCount}
                    onChange={(e) => handleManualCountChange(parseInt(e.target.value) || 0)}
                    className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white text-center focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleManualCountChange(activeItemCount.systemStock)}
                    className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium rounded-lg whitespace-nowrap cursor-pointer"
                    title="Set fisik sama dengan sistem"
                  >
                    Samakan Sistem
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-zinc-950 rounded-xl text-center text-xs text-zinc-400">
              Pilih item dari daftar di bawah atau scan barcode untuk mulai menghitung.
            </div>
          )}

          {/* Quick Select Item List inside active session */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white">Item Dalam Sesi Hitung:</span>
              <button
                type="button"
                onClick={onOpenTestBarcodes}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-medium underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Lembar Barcode
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {activeSession.items.map((item) => (
                <div
                  key={item.sku}
                  onClick={() => {
                    setSelectedSku(item.sku);
                    setActiveItemCount(item);
                  }}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                    selectedSku === item.sku
                      ? 'bg-amber-500/10 border-amber-500/50'
                      : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] font-bold text-amber-400">
                      {item.sku}
                    </span>
                    <span className="text-zinc-200 truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      Sistem: <strong className="text-zinc-200">{item.systemStock}</strong> | Fisik:{' '}
                      <strong className="text-amber-300">{item.physicalCount}</strong>
                    </span>

                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        item.difference === 0
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : item.difference > 0
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {item.difference > 0 ? `+${item.difference}` : item.difference}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selesaikan Sesi & Terapkan Opname */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <FileCheck2 className="w-4 h-4 text-emerald-400" /> Selesaikan Sesi & Buat Jurnal
              </div>
              <p className="text-[11px] text-zinc-400">
                Sesuaikan saldo stok & update kartu stok otomatis
              </p>
            </div>

            <button
              type="button"
              onClick={handleFinishOpname}
              className="px-4 py-2.5 bg-[#c8f53c] hover:bg-[#b8e830] active:scale-95 text-black font-extrabold text-xs rounded-xl shadow-md shadow-[#c8f53c]/20 transition-all cursor-pointer"
            >
              Terapkan Opname
            </button>
          </div>
        </section>
      )}
    </div>
  );
};
