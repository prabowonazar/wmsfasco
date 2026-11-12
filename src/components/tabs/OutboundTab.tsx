import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  OutboundOrder,
  OutboundItem,
  WarehouseLocation,
  WarehouseUser,
} from '../../types/warehouse';
import { CameraBarcodeScanner } from '../CameraBarcodeScanner';
import {
  PackageMinus,
  Truck,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Send,
  Navigation,
  FileText,
  User,
  Sparkles,
  ClipboardCheck,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface OutboundTabProps {
  inventory: InventoryItem[];
  outboundOrders: OutboundOrder[];
  onSaveOutboundOrders: (orders: OutboundOrder[]) => void;
  onConfirmOutboundDispatch: (order: OutboundOrder) => void;
  activeWarehouse: WarehouseLocation;
  activeUser: WarehouseUser;
  onOpenTestBarcodes: () => void;
  externalBarcodeToScan?: string | null;
  onClearExternalBarcode?: () => void;
}

export const OutboundTab: React.FC<OutboundTabProps> = ({
  inventory,
  outboundOrders,
  onSaveOutboundOrders,
  onConfirmOutboundDispatch,
  activeWarehouse,
  activeUser,
  onOpenTestBarcodes,
  externalBarcodeToScan,
  onClearExternalBarcode,
}) => {
  // Select active outbound order
  const [activeOrderId, setActiveOrderId] = useState<string>(
    outboundOrders.find((o) => o.status === 'picking')?.id || outboundOrders[0]?.id || ''
  );

  const activeOrder = outboundOrders.find((o) => o.id === activeOrderId) || outboundOrders[0];

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedItemName, setLastScannedItemName] = useState<string | null>(null);

  // New DO modal
  const [isCreatingDO, setIsCreatingDO] = useState(false);
  const [newDoNumber, setNewDoNumber] = useState('');
  const [newDestination, setNewDestination] = useState('');
  const [newCustomer, setNewCustomer] = useState('');
  const [newPurpose, setNewPurpose] = useState<OutboundOrder['purpose']>('Penjualan');
  const [newDriver, setNewDriver] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newNotes, setNewNotes] = useState('');

  // Handle barcode scanned during outbound
  const handleBarcodeDecoded = (code: string) => {
    if (!activeOrder) return;

    // Check if barcode matches any requested item in DO
    const itemIndex = activeOrder.items.findIndex(
      (it) => it.barcode === code || it.sku.toLowerCase() === code.toLowerCase()
    );

    if (itemIndex >= 0) {
      const item = activeOrder.items[itemIndex];
      const masterInv = inventory.find((m) => m.sku === item.sku);
      const currentStock = masterInv ? masterInv.stock[activeOrder.warehouse] || 0 : 0;

      if (currentStock <= item.pickedQty) {
        soundService.playErrorBuzz();
        alert(
          `Peringatan: Stok fisik di ${activeOrder.warehouse} tidak mencukupi! Sisa stok: ${currentStock} ${item.unit}.`
        );
        return;
      }

      const updatedPicked = item.pickedQty + 1;
      const updatedItems = [...activeOrder.items];
      updatedItems[itemIndex] = {
        ...item,
        pickedQty: updatedPicked,
      };

      const updatedOrder: OutboundOrder = {
        ...activeOrder,
        items: updatedItems,
        pickerOperator: activeUser.name,
      };

      const updatedOrders = outboundOrders.map((o) =>
        o.id === activeOrder.id ? updatedOrder : o
      );
      onSaveOutboundOrders(updatedOrders);

      setLastScannedItemName(`${item.name} (+1 diambil)`);
      soundService.playScanBeep();
    } else {
      // Not in list or unknown
      const master = inventory.find(
        (m) => m.barcode === code || m.sku.toLowerCase() === code.toLowerCase()
      );

      if (master) {
        const extraItem: OutboundItem = {
          sku: master.sku,
          barcode: master.barcode,
          name: master.name,
          requestedQty: 1,
          pickedQty: 1,
          unit: master.unit,
        };

        const updatedOrder: OutboundOrder = {
          ...activeOrder,
          items: [...activeOrder.items, extraItem],
          pickerOperator: activeUser.name,
        };

        const updatedOrders = outboundOrders.map((o) =>
          o.id === activeOrder.id ? updatedOrder : o
        );
        onSaveOutboundOrders(updatedOrders);

        setLastScannedItemName(`${master.name} (Item tambahan DO)`);
        soundService.playSuccessChime();
      } else {
        soundService.playErrorBuzz();
        alert(`Barcode ${code} tidak terdaftar di sistem.`);
      }
    }
  };

  useEffect(() => {
    if (externalBarcodeToScan) {
      handleBarcodeDecoded(externalBarcodeToScan);
      if (onClearExternalBarcode) onClearExternalBarcode();
    }
  }, [externalBarcodeToScan]);

  const handleUpdateItemPicked = (sku: string, newQty: number) => {
    if (!activeOrder) return;
    const validQty = Math.max(0, newQty);
    const updatedItems = activeOrder.items.map((it) =>
      it.sku === sku ? { ...it, pickedQty: validQty } : it
    );
    const updatedOrder = { ...activeOrder, items: updatedItems };
    const updatedOrders = outboundOrders.map((o) =>
      o.id === activeOrder.id ? updatedOrder : o
    );
    onSaveOutboundOrders(updatedOrders);
  };

  const handleFinalizeDispatch = () => {
    if (!activeOrder) return;
    const confirmed = window.confirm(
      `Konfirmasi pengeluaran barang untuk ${activeOrder.doNumber}? Saldo stok ${activeOrder.warehouse} akan dipotong dan dicatat ke Kartu Stok Keluar.`
    );
    if (!confirmed) return;

    onConfirmOutboundDispatch(activeOrder);
    soundService.playSuccessChime();
  };

  const handleCreateNewDO = (e: React.FormEvent) => {
    e.preventDefault();
    const doNum = newDoNumber.trim() || `DO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrder: OutboundOrder = {
      id: 'outbound-' + Date.now(),
      doNumber: doNum,
      destination: newDestination.trim() || 'Cabang Distribusi',
      customerName: newCustomer.trim() || 'Pelanggan / Penerima Umum',
      orderDate: new Date().toISOString().slice(0, 10),
      warehouse: activeWarehouse,
      status: 'picking',
      purpose: newPurpose,
      driverName: newDriver.trim() || 'Driver Internal',
      vehicleNumber: newVehicle.trim() || 'B 1234 WMS',
      pickerOperator: activeUser.name,
      notes: newNotes.trim() || 'Pengeluaran barang standar',
      items: inventory.slice(2, 5).map((item) => ({
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        requestedQty: 5,
        pickedQty: 0,
        unit: item.unit,
      })),
    };

    onSaveOutboundOrders([newOrder, ...outboundOrders]);
    setActiveOrderId(newOrder.id);
    setIsCreatingDO(false);
    setNewDoNumber('');
    setNewDestination('');
    setNewCustomer('');
    setNewDriver('');
    setNewVehicle('');
    setNewNotes('');
    soundService.playSuccessChime();
  };

  // Metrics
  const totalRequested = activeOrder?.items.reduce((sum, it) => sum + it.requestedQty, 0) || 0;
  const totalPicked = activeOrder?.items.reduce((sum, it) => sum + it.pickedQty, 0) || 0;

  return (
    <div className="space-y-4 pb-12">
      {/* Sub Fitur 1: Barang Keluar Header & Dokumen DO */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-red-500/10 text-red-400 rounded-lg border border-red-500/20">
              <PackageMinus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                DO (Delivery Order) - Barang Keluar
              </h2>
              <p className="text-[11px] text-zinc-400">Pengiriman, Transfer Cabang & Retur (Delivery Order)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingDO(!isCreatingDO)}
            className="text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Buat DO Baru
          </button>
        </div>

        {/* Modal Buat DO Baru */}
        {isCreatingDO && (
          <form
            onSubmit={handleCreateNewDO}
            className="p-3 mb-3 bg-zinc-950 border border-red-500/40 rounded-xl space-y-2.5 animate-in fade-in"
          >
            <div className="text-xs font-bold text-red-400">Buat Dokumen Delivery Order (DO) Baru</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nomor DO</label>
                <input
                  type="text"
                  value={newDoNumber}
                  onChange={(e) => setNewDoNumber(e.target.value)}
                  placeholder="DO-2026-0910"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Tujuan Pengiriman</label>
                <input
                  type="text"
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                  placeholder="Cabang Surabaya / Alamat Pelanggan"
                  required
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Tujuan / Keperluan</label>
                <select
                  value={newPurpose}
                  onChange={(e) => setNewPurpose(e.target.value as OutboundOrder['purpose'])}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="Penjualan">Penjualan Pelanggan</option>
                  <option value="Transfer Cabang">Transfer Antar Cabang</option>
                  <option value="Retur Supplier">Retur ke Supplier</option>
                  <option value="Pemakaian Internal">Pemakaian Internal</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nama Penerima/Customer</label>
                <input
                  type="text"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  placeholder="PT Maju Sentosa Bersama"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nama Driver / Ekspedisi</label>
                <input
                  type="text"
                  value={newDriver}
                  onChange={(e) => setNewDriver(e.target.value)}
                  placeholder="J&T Cargo / Pak Dedi"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nomor Polisi Kendaraan</label>
                <input
                  type="text"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  placeholder="B 9821 TZX"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingDO(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Simpan & Mulai Picking
              </button>
            </div>
          </form>
        )}

        {/* DO Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          {outboundOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setActiveOrderId(order.id)}
              className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all cursor-pointer ${
                activeOrderId === order.id
                  ? 'bg-red-950/40 border-red-500/50 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-red-400">
                  {order.doNumber}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    order.status === 'dispatched'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {order.status === 'dispatched' ? 'TERKIRIM' : 'PICKING'}
                </span>
              </div>
              <div className="text-[11px] truncate max-w-[140px] mt-0.5">{order.destination}</div>
            </button>
          ))}
        </div>

        {/* Active DO Details Card (Sub Fitur 3: Tujuan dan Keterangan) */}
        {activeOrder && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-red-400" /> {activeOrder.destination}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Penerima: <span className="text-zinc-200 font-semibold">{activeOrder.customerName}</span> ·
                  Tujuan: <span className="text-amber-400 font-mono">{activeOrder.purpose}</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  Armada: <span className="text-zinc-300 font-mono">{activeOrder.vehicleNumber}</span> ({activeOrder.driverName}) ·
                  Picker: <span className="text-zinc-300">{activeOrder.pickerOperator}</span>
                </p>
                {activeOrder.notes && (
                  <p className="text-[11px] text-zinc-400 italic mt-1">
                    Catatan: &ldquo;{activeOrder.notes}&rdquo;
                  </p>
                )}
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-white">
                  <span className="text-red-400">{totalPicked}</span> / {totalRequested} Unit
                </div>
                <span className="text-[10px] text-zinc-400">Barang Dipacking</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-red-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${totalRequested > 0 ? (totalPicked / totalRequested) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Sub Fitur 2: Scan Barang Keluar */}
      {activeOrder && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Scan Barang Keluar (Picking)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Scan barcode item untuk validasi dan pemotongan stok
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onOpenTestBarcodes}
                className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-amber-300 px-2 py-1 rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" /> Lembar Barcode
              </button>

              <button
                type="button"
                onClick={() => setShowScanner(!showScanner)}
                className="text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2 py-1 rounded-lg border border-zinc-700 cursor-pointer"
              >
                {showScanner ? 'Tutup Kamera' : 'Buka Kamera'}
              </button>
            </div>
          </div>

          {lastScannedItemName && (
            <div className="p-2 bg-red-950/40 border border-red-500/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-red-400" />
              <span>
                Hasil Scan Terakhir: <strong>{lastScannedItemName}</strong>
              </span>
            </div>
          )}

          {showScanner && (
            <CameraBarcodeScanner
              isScanning={showScanner}
              onScan={handleBarcodeDecoded}
              onOpenTestBarcodes={onOpenTestBarcodes}
            />
          )}

          {/* List Item Picking & Verification */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-zinc-400" /> Daftar Item DO & Saldo Gudang
            </h4>

            <div className="space-y-2">
              {activeOrder.items.map((item) => {
                const master = inventory.find((m) => m.sku === item.sku);
                const currentPhysicalStock = master ? master.stock[activeOrder.warehouse] || 0 : 0;
                const isComplete = item.pickedQty >= item.requestedQty;

                return (
                  <div
                    key={item.sku}
                    className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                          <span className="text-xs font-bold text-white">{item.name}</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                          Barcode: {item.barcode} · Saldo Stok Fisik:{' '}
                          <span
                            className={
                              currentPhysicalStock > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'
                            }
                          >
                            {currentPhysicalStock} {item.unit}
                          </span>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isComplete
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : item.pickedQty > 0
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isComplete ? '✓ LENGKAP' : `${item.pickedQty}/${item.requestedQty}`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                      <div className="text-xs text-zinc-400 font-mono">
                        Target DO: <strong className="text-zinc-200">{item.requestedQty}</strong>{' '}
                        {item.unit}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Diambil:</span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemPicked(item.sku, item.pickedQty - 1)
                            }
                            className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded-l hover:bg-zinc-700 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.pickedQty}
                            onChange={(e) =>
                              handleUpdateItemPicked(
                                item.sku,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-14 bg-zinc-900 border-y border-zinc-700 text-center py-1 text-xs font-bold text-red-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemPicked(item.sku, item.pickedQty + 1)
                            }
                            className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded-r hover:bg-zinc-700 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tombol Konfirmasi Selesai Pengeluaran */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinalizeDispatch}
                className="w-full py-3.5 bg-[#c8f53c] hover:bg-[#b8e830] active:scale-[0.99] text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#c8f53c]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4 stroke-[2.5]" />
                Konfirmasi Delivery Order (DO) Selesai & Potong Stok Gudang
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
