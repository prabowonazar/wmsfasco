import React, { useState, useEffect } from 'react';
import {
  InventoryItem,
  InboundOrder,
  InboundItem,
  WarehouseLocation,
  WarehouseUser,
} from '../../types/warehouse';
import { CameraBarcodeScanner } from '../CameraBarcodeScanner';
import {
  PackageCheck,
  Truck,
  Scan,
  CheckCircle2,
  AlertTriangle,
  Plus,
  FileSpreadsheet,
  Building,
  User,
  Sparkles,
  ClipboardList,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface InboundTabProps {
  inventory: InventoryItem[];
  inboundOrders: InboundOrder[];
  onSaveInboundOrders: (orders: InboundOrder[]) => void;
  onConfirmInboundReceipt: (order: InboundOrder) => void;
  activeWarehouse: WarehouseLocation;
  activeUser: WarehouseUser;
  onOpenTestBarcodes: () => void;
  externalBarcodeToScan?: string | null;
  onClearExternalBarcode?: () => void;
}

export const InboundTab: React.FC<InboundTabProps> = ({
  inventory,
  inboundOrders,
  onSaveInboundOrders,
  onConfirmInboundReceipt,
  activeWarehouse,
  activeUser,
  onOpenTestBarcodes,
  externalBarcodeToScan,
  onClearExternalBarcode,
}) => {
  // Select active receiving order
  const [activeOrderId, setActiveOrderId] = useState<string>(
    inboundOrders.find((o) => o.status === 'receiving')?.id || inboundOrders[0]?.id || ''
  );

  const activeOrder = inboundOrders.find((o) => o.id === activeOrderId) || inboundOrders[0];

  // Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [lastScannedItemName, setLastScannedItemName] = useState<string | null>(null);

  // New PO modal
  const [isCreatingPO, setIsCreatingPO] = useState(false);
  const [newPoNumber, setNewPoNumber] = useState('');
  const [newSupplier, setNewSupplier] = useState('');
  const [newSuratJalan, setNewSuratJalan] = useState('');

  // Handle barcode scanned during inbound
  const handleBarcodeDecoded = (code: string) => {
    if (!activeOrder) return;

    // Check if barcode matches any expected item in this PO
    const itemIndex = activeOrder.items.findIndex(
      (it) => it.barcode === code || it.sku.toLowerCase() === code.toLowerCase()
    );

    if (itemIndex >= 0) {
      const item = activeOrder.items[itemIndex];
      const updatedReceived = item.receivedQty + 1;

      const updatedItems = [...activeOrder.items];
      updatedItems[itemIndex] = {
        ...item,
        receivedQty: updatedReceived,
      };

      const updatedOrder: InboundOrder = {
        ...activeOrder,
        items: updatedItems,
        receiverOperator: activeUser.name,
      };

      const updatedOrders = inboundOrders.map((o) =>
        o.id === activeOrder.id ? updatedOrder : o
      );
      onSaveInboundOrders(updatedOrders);

      setLastScannedItemName(`${item.name} (+1 diterima)`);
      soundService.playScanBeep();
    } else {
      // Check if product exists in master inventory
      const master = inventory.find(
        (m) => m.barcode === code || m.sku.toLowerCase() === code.toLowerCase()
      );

      if (master) {
        // Add as extra line item
        const extraItem: InboundItem = {
          sku: master.sku,
          barcode: master.barcode,
          name: master.name,
          orderedQty: 0,
          receivedQty: 1,
          unit: master.unit,
          binLocation: master.defaultBin,
        };

        const updatedOrder: InboundOrder = {
          ...activeOrder,
          items: [...activeOrder.items, extraItem],
          receiverOperator: activeUser.name,
        };

        const updatedOrders = inboundOrders.map((o) =>
          o.id === activeOrder.id ? updatedOrder : o
        );
        onSaveInboundOrders(updatedOrders);

        setLastScannedItemName(`${master.name} (Tambahan luar PO)`);
        soundService.playSuccessChime();
      } else {
        soundService.playErrorBuzz();
        alert(`Barcode ${code} tidak dikenali dalam katalog.`);
      }
    }
  };

  useEffect(() => {
    if (externalBarcodeToScan) {
      handleBarcodeDecoded(externalBarcodeToScan);
      if (onClearExternalBarcode) onClearExternalBarcode();
    }
  }, [externalBarcodeToScan]);

  const handleUpdateItemReceived = (sku: string, newQty: number) => {
    if (!activeOrder) return;
    const validQty = Math.max(0, newQty);
    const updatedItems = activeOrder.items.map((it) =>
      it.sku === sku ? { ...it, receivedQty: validQty } : it
    );
    const updatedOrder = { ...activeOrder, items: updatedItems };
    const updatedOrders = inboundOrders.map((o) =>
      o.id === activeOrder.id ? updatedOrder : o
    );
    onSaveInboundOrders(updatedOrders);
  };

  const handleFinalizeReceipt = () => {
    if (!activeOrder) return;
    const confirmed = window.confirm(
      `Konfirmasi penerimaan barang untuk ${activeOrder.poNumber}? Saldo stok gudang (${activeOrder.warehouse}) akan bertambah dan mutasi masuk akan dicatat.`
    );
    if (!confirmed) return;

    onConfirmInboundReceipt(activeOrder);
    soundService.playSuccessChime();
  };

  const handleCreateNewOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const poNum = newPoNumber.trim() || `PO-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const newOrder: InboundOrder = {
      id: 'inbound-' + Date.now(),
      poNumber: poNum,
      supplier: newSupplier.trim() || 'PT Supplier Logistik Terpadu',
      orderDate: new Date().toISOString().slice(0, 10),
      warehouse: activeWarehouse,
      status: 'receiving',
      suratJalanNumber: newSuratJalan.trim() || `SJ-${Date.now().toString().slice(-6)}`,
      receiverOperator: activeUser.name,
      notes: 'Penerimaan barang baru',
      items: inventory.slice(0, 3).map((item) => ({
        sku: item.sku,
        barcode: item.barcode,
        name: item.name,
        orderedQty: 10,
        receivedQty: 0,
        unit: item.unit,
        binLocation: item.defaultBin,
      })),
    };

    onSaveInboundOrders([newOrder, ...inboundOrders]);
    setActiveOrderId(newOrder.id);
    setIsCreatingPO(false);
    setNewPoNumber('');
    setNewSupplier('');
    setNewSuratJalan('');
    soundService.playSuccessChime();
  };

  // Metrics
  const totalOrdered = activeOrder?.items.reduce((sum, it) => sum + it.orderedQty, 0) || 0;
  const totalReceived = activeOrder?.items.reduce((sum, it) => sum + it.receivedQty, 0) || 0;
  const isAllComplete =
    activeOrder &&
    activeOrder.items.length > 0 &&
    activeOrder.items.every((it) => it.receivedQty >= it.orderedQty && it.orderedQty > 0);

  return (
    <div className="space-y-4 pb-12">
      {/* Sub Fitur 1: Terima Barang Header & Dokumen PO */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                GR (Good Receipt) - Barang Masuk
              </h2>
              <p className="text-[11px] text-zinc-400">Penerimaan Barang Dari Supplier / Vendor (Good Receipt)</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingPO(!isCreatingPO)}
            className="text-[11px] font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 px-2.5 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Buat GR / PO Baru
          </button>
        </div>

        {/* Modal Buat PO Baru */}
        {isCreatingPO && (
          <form
            onSubmit={handleCreateNewOrder}
            className="p-3 mb-3 bg-zinc-950 border border-emerald-500/40 rounded-xl space-y-2.5 animate-in fade-in"
          >
            <div className="text-xs font-bold text-emerald-400">Buat Dokumen Penerimaan Good Receipt (GR) Baru</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Nomor PO</label>
                <input
                  type="text"
                  value={newPoNumber}
                  onChange={(e) => setNewPoNumber(e.target.value)}
                  placeholder="PO-2026-0099"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">No. Surat Jalan (SJ)</label>
                <input
                  type="text"
                  value={newSuratJalan}
                  onChange={(e) => setNewSuratJalan(e.target.value)}
                  placeholder="SJ-VND-5512"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Nama Supplier / Vendor</label>
              <input
                type="text"
                value={newSupplier}
                onChange={(e) => setNewSupplier(e.target.value)}
                placeholder="PT Mitra Perkasa Indonesia"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreatingPO(false)}
                className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Simpan & Mulai Terima
              </button>
            </div>
          </form>
        )}

        {/* PO Selector Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-3">
          {inboundOrders.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => setActiveOrderId(order.id)}
              className={`px-3 py-2 rounded-xl text-left border shrink-0 transition-all cursor-pointer ${
                activeOrderId === order.id
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-white'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-bold text-emerald-400">
                  {order.poNumber}
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                    order.status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {order.status === 'completed' ? 'SELESAI' : 'PROSES'}
                </span>
              </div>
              <div className="text-[11px] truncate max-w-[140px] mt-0.5">{order.supplier}</div>
            </button>
          ))}
        </div>

        {/* Active PO Details Card */}
        {activeOrder && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-zinc-400" /> {activeOrder.supplier}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Surat Jalan: <span className="text-zinc-200 font-mono">{activeOrder.suratJalanNumber}</span> ·
                  Tgl: <span className="text-zinc-200">{activeOrder.orderDate}</span>
                </p>
                <p className="text-[11px] text-zinc-400">
                  Tujuan:{' '}
                  <span className="text-emerald-400 font-semibold">{activeOrder.warehouse}</span> ·
                  Penerima: <span className="text-zinc-300">{activeOrder.receiverOperator}</span>
                </p>
              </div>

              <div className="text-right">
                <div className="text-xs font-mono font-bold text-white">
                  <span className="text-emerald-400">{totalReceived}</span> / {totalOrdered} Unit
                </div>
                <span className="text-[10px] text-zinc-400">Total Diterima</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${totalOrdered > 0 ? (totalReceived / totalOrdered) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Sub Fitur 2: Scan Barang Datang */}
      {activeOrder && (
        <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                <Scan className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Scan Barang Datang
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Arahkan scanner ke kemasan fisik barang kedatangan
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
            <div className="p-2 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
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

          {/* Sub Fitur 3: Cek Jumlah Terima vs PO */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5 text-zinc-400" /> Cek & Validasi Jumlah Terima
            </h4>

            <div className="space-y-2">
              {activeOrder.items.map((item) => {
                const isComplete = item.receivedQty === item.orderedQty;
                const isOver = item.receivedQty > item.orderedQty;
                const isPartial = item.receivedQty > 0 && item.receivedQty < item.orderedQty;

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
                          Barcode: {item.barcode} · Rak Simpan:{' '}
                          <span className="text-zinc-200">{item.binLocation}</span>
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          isComplete
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : isOver
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : isPartial
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {isComplete
                          ? '✓ LENGKAP'
                          : isOver
                          ? '⚠ LEBIH'
                          : isPartial
                          ? '● SEBAGIAN'
                          : '○ BELUM'}
                      </span>
                    </div>

                    {/* Quantity counter and verification */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                      <div className="text-xs text-zinc-400 font-mono">
                        Target PO: <strong className="text-zinc-200">{item.orderedQty}</strong>{' '}
                        {item.unit}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-zinc-400">Diterima:</span>
                        <div className="flex items-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemReceived(item.sku, item.receivedQty - 1)
                            }
                            className="px-2 py-1 bg-zinc-800 text-zinc-200 rounded-l hover:bg-zinc-700 text-xs font-bold"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.receivedQty}
                            onChange={(e) =>
                              handleUpdateItemReceived(
                                item.sku,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="w-14 bg-zinc-900 border-y border-zinc-700 text-center py-1 text-xs font-bold text-emerald-400 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItemReceived(item.sku, item.receivedQty + 1)
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

            {/* Tombol Konfirmasi Selesai Terima */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleFinalizeReceipt}
                className="w-full py-3.5 bg-[#c8f53c] hover:bg-[#b8e830] active:scale-[0.99] text-black font-extrabold text-xs rounded-2xl shadow-lg shadow-[#c8f53c]/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <PackageCheck className="w-4 h-4 stroke-[2.5]" />
                Konfirmasi Good Receipt (GR) Selesai & Tambah Saldo Stok
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
