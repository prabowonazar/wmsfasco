import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  StockCardEntry,
  WarehouseLocation,
  getItemMinStock,
} from '../../types/warehouse';
import {
  Search,
  Printer,
  Download,
  Plus,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  Sparkles,
  FileText,
  Layers,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  Eye,
  EyeOff,
  Filter,
  ShieldAlert,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface StockCardTabProps {
  inventory: InventoryItem[];
  stockCards: StockCardEntry[];
  activeWarehouse: WarehouseLocation;
  onChangeWarehouse: (wh: WarehouseLocation) => void;
  onAddManualMutation?: (mutation: {
    sku: string;
    transactionType: 'GR' | 'DO' | 'MUTASI_MASUK' | 'MUTASI_KELUAR' | 'INBOUND' | 'OUTBOUND' | 'OPNAME_ADJUSTMENT';
    referenceNo: string;
    notes: string;
    qtyIn: number;
    qtyOut: number;
    warehouse: WarehouseLocation;
    date: string;
  }) => void;
}

export const StockCardTab: React.FC<StockCardTabProps> = ({
  inventory,
  stockCards,
  activeWarehouse,
  onChangeWarehouse,
  onAddManualMutation,
}) => {
  // Selected item
  const [selectedSku, setSelectedSku] = useState<string>(
    inventory[2]?.sku || inventory[0]?.sku || ''
  );
  const [searchSkuQuery, setSearchSkuQuery] = useState<string>('');
  const [activeLetterFilter, setActiveLetterFilter] = useState<string | null>(null);
  const [filterOnlyLowStock, setFilterOnlyLowStock] = useState<boolean>(false);

  // Quick form modal for adding manual transaction row
  const [isAddingRow, setIsAddingRow] = useState(false);
  const [newRowType, setNewRowType] = useState<
    'GR' | 'DO' | 'MUTASI_MASUK' | 'MUTASI_KELUAR'
  >('GR');
  const [newRowDate, setNewRowDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [newRowNota, setNewRowNota] = useState('');
  const [newRowKeterangan, setNewRowKeterangan] = useState('');
  const [newRowQty, setNewRowQty] = useState<number>(10);

  // Alphabet letters A to Z for the top index bar
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Items with stock at or below minimum threshold for currently selected warehouse
  const lowStockItems = useMemo(() => {
    return inventory.filter(
      (item) => (item.stock[activeWarehouse] || 0) <= getItemMinStock(item, activeWarehouse)
    );
  }, [inventory, activeWarehouse]);

  // Catalog items filtered by low stock toggle and letter filter
  const displayedCatalog = useMemo(() => {
    return inventory.filter((item) => {
      if (filterOnlyLowStock) {
        const isLow = (item.stock[activeWarehouse] || 0) <= getItemMinStock(item, activeWarehouse);
        if (!isLow) return false;
      }
      if (activeLetterFilter) {
        const matchLetter =
          item.name.toUpperCase().startsWith(activeLetterFilter) ||
          item.sku.toUpperCase().startsWith(activeLetterFilter);
        if (!matchLetter) return false;
      }
      return true;
    });
  }, [inventory, activeWarehouse, filterOnlyLowStock, activeLetterFilter]);

  const selectedItem =
    inventory.find((it) => it.sku === selectedSku) || inventory[0];

  const selectedItemBranchMin = useMemo(() => {
    return getItemMinStock(selectedItem, activeWarehouse);
  }, [selectedItem, activeWarehouse]);

  // Filter and sort mutations chronologically (oldest to newest) to compute running Sisa
  const itemMutationsChronological = useMemo(() => {
    if (!selectedItem) return [];

    const raw = stockCards.filter(
      (entry) =>
        entry.sku === selectedItem.sku && entry.warehouse === activeWarehouse
    );

    // Sort ascending by date
    return [...raw].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [stockCards, selectedItem, activeWarehouse]);

  // Compute calculated ledger rows with Running Balance (Sisa)
  const ledgerRows = useMemo(() => {
    let runningBalance = 0;

    return itemMutationsChronological.map((m) => {
      const masuk = Number(m.qtyIn) || 0;
      const keluar = Number(m.qtyOut) || 0;

      // Hitung Sisa: Sisa sebelumnya + Masuk - Keluar
      runningBalance = runningBalance + masuk - keluar;

      // Format date: dd/mm/yy
      let formattedDate = m.date.slice(0, 10);
      try {
        const d = new Date(m.date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).slice(-2);
        formattedDate = `${day}/${month}/${year}`;
      } catch {
        // fallback
      }

      const isBelowMin = runningBalance <= selectedItemBranchMin;

      return {
        id: m.id,
        rawDate: m.date,
        displayDate: formattedDate,
        noNota: m.referenceNo || '-',
        keterangan: m.notes || (masuk > 0 ? 'Penerimaan Barang' : 'Pengeluaran Barang'),
        masuk: masuk > 0 ? masuk : null,
        keluar: keluar > 0 ? keluar : null,
        sisa: runningBalance,
        isBelowMin,
        operator: m.operator,
      };
    });
  }, [itemMutationsChronological, selectedItemBranchMin]);

  // Calculate totals
  const totalMasuk = ledgerRows.reduce((sum, r) => sum + (r.masuk || 0), 0);
  const totalKeluar = ledgerRows.reduce((sum, r) => sum + (r.keluar || 0), 0);
  const currentSisa = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].sisa : (selectedItem?.stock[activeWarehouse] || 0);

  // Check if current item has reached or dropped below threshold
  const isCurrentItemLowStock = useMemo(() => {
    if (!selectedItem) return false;
    const whStock = selectedItem.stock[activeWarehouse] || 0;
    return whStock <= selectedItemBranchMin || currentSisa <= selectedItemBranchMin;
  }, [selectedItem, activeWarehouse, currentSisa, selectedItemBranchMin]);

  // Target blank lines count to match authentic physical paper pad (~16-18 rows)
  const targetTotalLines = Math.max(16, ledgerRows.length + 3);
  const blankLinesCount = Math.max(0, targetTotalLines - ledgerRows.length);

  // Handle letter click in top alphabet bar
  const handleLetterClick = (letter: string) => {
    if (activeLetterFilter === letter) {
      setActiveLetterFilter(null);
    } else {
      setActiveLetterFilter(letter);
      // Auto select first item matching this letter if exists
      const match = displayedCatalog.find((it) =>
        it.name.toUpperCase().startsWith(letter) || it.sku.toUpperCase().startsWith(letter)
      ) || inventory.find((it) =>
        it.name.toUpperCase().startsWith(letter) || it.sku.toUpperCase().startsWith(letter)
      );
      if (match) {
        setSelectedSku(match.sku);
        soundService.playScanBeep();
      }
    }
  };

  const handleManualRowSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || newRowQty <= 0) return;

    const isMasuk = newRowType === 'GR' || newRowType === 'MUTASI_MASUK';
    const timestamp = `${newRowDate} 12:00:00`;
    const defaultPrefix =
      newRowType === 'GR'
        ? 'GR'
        : newRowType === 'DO'
        ? 'DO'
        : newRowType === 'MUTASI_MASUK'
        ? 'MT-IN'
        : 'MT-OUT';
    const notaNo = newRowNota.trim() || `${defaultPrefix}-${Date.now().toString().slice(-4)}`;
    const defaultNotes =
      newRowType === 'GR'
        ? 'Good Receipt (GR) - Barang Masuk'
        : newRowType === 'DO'
        ? 'Delivery Order (DO) - Barang Keluar'
        : newRowType === 'MUTASI_MASUK'
        ? 'Mutasi Masuk (Terima Barang)'
        : 'Mutasi Keluar (Item Transfer)';
    const notes = newRowKeterangan.trim() || defaultNotes;

    if (onAddManualMutation) {
      onAddManualMutation({
        sku: selectedItem.sku,
        transactionType: newRowType,
        referenceNo: notaNo,
        notes,
        qtyIn: isMasuk ? newRowQty : 0,
        qtyOut: !isMasuk ? newRowQty : 0,
        warehouse: activeWarehouse,
        date: timestamp,
      });
    }

    soundService.playSuccessChime();
    setIsAddingRow(false);
    setNewRowNota('');
    setNewRowKeterangan('');
  };

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (!selectedItem) return;
    const headers = ['Tgl.', 'No. Nota', 'Keterangan', 'Masuk', 'Keluar', 'Sisa'];
    const rows = ledgerRows.map((r) => [
      r.displayDate,
      `"${r.noNota}"`,
      `"${r.keterangan.replace(/"/g, '""')}"`,
      r.masuk !== null ? r.masuk : '',
      r.keluar !== null ? r.keluar : '',
      r.sisa,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"KARTU STOCK - ${selectedItem.name}"`,
        `"KODE BARANG: ${selectedItem.sku} | Gudang: ${activeWarehouse}"`,
        `"Satuan: ${selectedItem.unit} | Lokasi Rak: ${selectedItem.defaultBin} | Batas Min: ${selectedItem.minStock}"`,
        headers.join(','),
        ...rows.map((e) => e.join(',')),
        `"TOTAL","","",${totalMasuk},${totalKeluar},${currentSisa}`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Kartu_Stock_${selectedItem.sku}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-16">
      {/* Top Controls: Selector & Gudang Switch */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 shadow-md space-y-2.5 print:hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
          {/* Gudang filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-zinc-400">Gudang:</span>
            <select
              value={activeWarehouse}
              onChange={(e) => onChangeWarehouse(e.target.value as WarehouseLocation)}
              className="bg-zinc-950 border border-zinc-700 text-xs font-bold text-amber-400 rounded-lg px-2.5 py-1 focus:outline-none"
            >
              <option value="Gudang Pusat">Gudang Pusat</option>
              <option value="Gudang Meruya">Gudang Meruya</option>
              <option value="Gudang Denpasar">Gudang Denpasar</option>
              <option value="Gudang Surabaya">Gudang Surabaya</option>
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddingRow(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Catat Mutasi
            </button>
            <button
              type="button"
              onClick={handlePrint}
              title="Cetak Lembar Kartu Stock"
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={exportCSV}
              title="Unduh CSV"
              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-zinc-700 cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Highlight Banner: Items at or below minimum threshold for active warehouse */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              setFilterOnlyLowStock(!filterOnlyLowStock);
              soundService.playScanBeep();
            }}
            className={`w-full p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-all cursor-pointer ${
              filterOnlyLowStock
                ? 'bg-red-500/20 border-red-500/60 text-red-200 shadow-md ring-1 ring-red-500'
                : lowStockItems.length > 0
                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShieldAlert
                className={`w-4 h-4 shrink-0 ${
                  lowStockItems.length > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              />
              <span className="text-left">
                {lowStockItems.length > 0 ? (
                  <>
                    <strong className="text-red-400">{lowStockItems.length} Barang</strong> di{' '}
                    <span className="font-bold">{activeWarehouse}</span> mencapai/di bawah batas
                    minimum!
                  </>
                ) : (
                  <>Seluruh stok barang di {activeWarehouse} berada di atas batas minimum aman.</>
                )}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  filterOnlyLowStock
                    ? 'bg-red-500 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {filterOnlyLowStock ? '✕ Tampilkan Semua' : '🚨 Filter Stok Kritis'}
              </span>
            </div>
          </button>
        </div>

        {/* Double Picker: 1. Search by Kode Barang AND 2. Dropdown Selector */}
        <div className="pt-2 border-t border-zinc-800 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 1. Search by Kode Barang / SKU */}
            <div className="relative">
              <label className="text-[11px] text-zinc-400 font-semibold mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-cyan-400" /> Cari Kode Barang:
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchSkuQuery}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchSkuQuery(val);
                    const matched = inventory.find(
                      (it) => it.sku.toLowerCase() === val.trim().toLowerCase()
                    );
                    if (matched) {
                      setSelectedSku(matched.sku);
                      soundService.playScanBeep();
                    }
                  }}
                  placeholder="Ketik kode barang (cth: MC-101, EL-001)..."
                  className="w-full bg-zinc-950 border border-zinc-700 focus:border-cyan-400 rounded-lg pl-3 pr-8 py-1.5 text-xs text-white font-mono placeholder:text-zinc-500 focus:outline-none"
                />
                {searchSkuQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchSkuQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Suggestions dropdown if search query is typed */}
              {searchSkuQuery.trim().length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto p-1 divide-y divide-zinc-800">
                  {inventory
                    .filter(
                      (it) =>
                        it.sku.toLowerCase().includes(searchSkuQuery.toLowerCase()) ||
                        it.name.toLowerCase().includes(searchSkuQuery.toLowerCase())
                    )
                    .map((item) => {
                      const branchMin = getItemMinStock(item, activeWarehouse);
                      const isLow = (item.stock[activeWarehouse] || 0) <= branchMin;
                      return (
                        <button
                          key={item.sku}
                          type="button"
                          onClick={() => {
                            setSelectedSku(item.sku);
                            setSearchSkuQuery(item.sku);
                            soundService.playScanBeep();
                          }}
                          className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            isLow
                              ? 'bg-red-950/40 hover:bg-red-900/50 border border-red-500/30'
                              : 'hover:bg-zinc-800/80 text-zinc-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-cyan-400">{item.sku}</span>
                            {isLow && (
                              <span className="text-[9px] font-bold bg-red-500/20 text-red-400 px-1 rounded border border-red-500/30">
                                ⚠️ KRITIS
                              </span>
                            )}
                          </div>
                          <div className="text-right">
                            <span className="truncate max-w-[150px] block text-zinc-300 text-[11px]">
                              {item.name}
                            </span>
                            <span
                              className={`text-[10px] font-mono ${
                                isLow ? 'text-red-400 font-bold' : 'text-zinc-400'
                              }`}
                            >
                              Stok: {item.stock[activeWarehouse] || 0} / Min: {branchMin}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  {inventory.filter(
                    (it) =>
                      it.sku.toLowerCase().includes(searchSkuQuery.toLowerCase()) ||
                      it.name.toLowerCase().includes(searchSkuQuery.toLowerCase())
                  ).length === 0 && (
                    <div className="p-2 text-center text-xs text-zinc-500">
                      Tidak ada kode barang cocok
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Pilih via Dropdown (Double: Dropdown & Search by Kode Barang) */}
            <div>
              <label className="text-[11px] text-zinc-400 font-semibold mb-1 flex items-center justify-between">
                <span>Pilih via Dropdown:</span>
                {filterOnlyLowStock && (
                  <span className="text-[10px] text-red-400 font-bold">
                    (Menampilkan {displayedCatalog.length} item kritis)
                  </span>
                )}
              </label>
              <select
                value={selectedSku}
                onChange={(e) => {
                  setSelectedSku(e.target.value);
                  setSearchSkuQuery(e.target.value);
                  soundService.playScanBeep();
                }}
                className={`w-full bg-zinc-950 border rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none cursor-pointer ${
                  isCurrentItemLowStock
                    ? 'border-red-500/80 text-red-100 bg-red-950/20'
                    : 'border-zinc-700 focus:border-cyan-400'
                }`}
              >
                {displayedCatalog.map((item) => {
                  const currentItemStock = item.stock[activeWarehouse] || 0;
                  const branchMin = getItemMinStock(item, activeWarehouse);
                  const isLow = currentItemStock <= branchMin;
                  return (
                    <option
                      key={item.sku}
                      value={item.sku}
                      className={isLow ? 'bg-zinc-950 text-red-400 font-bold' : 'bg-zinc-900 text-white'}
                    >
                      {isLow ? '⚠️ [STOK KRITIS] ' : ''}[{item.sku}] {item.name} - Stok: {currentItemStock} (Min {activeWarehouse.replace('Gudang ', '')}: {branchMin} {item.unit})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Quick SKU Tag Bar for 1-Tap Switching with Low Stock Highlights */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
            <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
              Kode Cepat:
            </span>
            {displayedCatalog.map((item) => {
              const branchMin = getItemMinStock(item, activeWarehouse);
              const isLow = (item.stock[activeWarehouse] || 0) <= branchMin;
              const isSelected = selectedSku === item.sku;

              return (
                <button
                  key={item.sku}
                  type="button"
                  onClick={() => {
                    setSelectedSku(item.sku);
                    setSearchSkuQuery(item.sku);
                    soundService.playScanBeep();
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1 ${
                    isSelected
                      ? isLow
                        ? 'bg-red-500 text-white shadow ring-1 ring-white'
                        : 'bg-cyan-500 text-zinc-950 shadow'
                      : isLow
                      ? 'bg-red-950/60 text-red-300 border border-red-500/50 hover:bg-red-900/70'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                  title={`${item.sku}: Stok ${item.stock[activeWarehouse] || 0} / Min ${branchMin}`}
                >
                  {isLow && <span>⚠️</span>}
                  <span>{item.sku}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal / Inline Form Catat Mutasi Langsung */}
      {isAddingRow && (
        <form
          onSubmit={handleManualRowSubmit}
          className="bg-zinc-900 border-2 border-amber-500/60 rounded-2xl p-4 shadow-xl space-y-3 animate-in fade-in print:hidden"
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Catat Transaksi pada Kartu Stock ({selectedItem?.sku})
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsAddingRow(false)}
              className="text-xs text-zinc-400 hover:text-white"
            >
              ✕ Batal
            </button>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1 font-medium">Jenis Transaksi Mutasi</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setNewRowType('GR')}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all text-center ${
                  newRowType === 'GR'
                    ? 'bg-emerald-600 text-white shadow ring-1 ring-emerald-400'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                ↓ GR (Good Receipt)
              </button>
              <button
                type="button"
                onClick={() => setNewRowType('DO')}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all text-center ${
                  newRowType === 'DO'
                    ? 'bg-red-600 text-white shadow ring-1 ring-red-400'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                ↑ DO (Delivery Order)
              </button>
              <button
                type="button"
                onClick={() => setNewRowType('MUTASI_MASUK')}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all text-center ${
                  newRowType === 'MUTASI_MASUK'
                    ? 'bg-teal-600 text-white shadow ring-1 ring-teal-400'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                ↓ Mutasi Masuk
              </button>
              <button
                type="button"
                onClick={() => setNewRowType('MUTASI_KELUAR')}
                className={`py-2 px-2 rounded-lg text-[11px] font-bold cursor-pointer transition-all text-center ${
                  newRowType === 'MUTASI_KELUAR'
                    ? 'bg-amber-600 text-white shadow ring-1 ring-amber-400'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                ↑ Mutasi Keluar
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Jumlah (Qty)</label>
              <input
                type="number"
                min="1"
                value={newRowQty}
                onChange={(e) => setNewRowQty(Math.max(1, parseInt(e.target.value) || 1))}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Tanggal</label>
              <input
                type="date"
                value={newRowDate}
                onChange={(e) => setNewRowDate(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">No. Nota / Surat Jalan</label>
              <input
                type="text"
                value={newRowNota}
                onChange={(e) => setNewRowNota(e.target.value)}
                placeholder="Contoh: GR-8821 atau DO-009"
                required
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-zinc-400 block mb-1">Keterangan / Tujuan / Supplier</label>
            <input
              type="text"
              value={newRowKeterangan}
              onChange={(e) => setNewRowKeterangan(e.target.value)}
              placeholder="Contoh: Penerimaan Supplier Jaya / Pengiriman Toko Cabang"
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingRow(false)}
              className="px-3 py-1 text-xs text-zinc-400 hover:text-white"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg cursor-pointer"
            >
              Simpan ke Kartu Stock
            </button>
          </div>
        </form>
      )}

      {/* =========================================================================
          AUTHENTIC CLASSIC "KARTU STOCK" SHEET (PERSIS SEPERTI GAMBAR USER)
          Color: Signature cyan/light-blue ledger pad paper (#a8d8f0 / #c2e5f8)
          Features:
          - Kode Barang DI ATAS Nama Barang (Harga dihilangkan)
          - Kolom: Tgl. | No. Nota | Keterangan | Masuk | Keluar | Sisa
          - Perhitungan Sisa berjalan otomatis
          - Highlight stok di bawah / mencapai batas minimum untuk gudang aktif
          ========================================================================= */}
      <div
        className={`w-full bg-[#c2e5f8] text-[#0f2c42] rounded-xl shadow-2xl border-2 overflow-hidden p-2 sm:p-4 select-text font-serif transition-all ${
          isCurrentItemLowStock ? 'border-red-600 ring-2 ring-red-400/50' : 'border-[#5497be]'
        }`}
        style={{
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        {/* 1. Baris Index Abjad A - Z paling atas (Persis di gambar) */}
        <div className="w-full bg-white/70 border border-[#4085ac] mb-2 sm:mb-3 flex items-center justify-between text-[9px] sm:text-[11px] font-sans font-bold select-none overflow-x-auto">
          {ALPHABET.map((char) => {
            const isSelected =
              activeLetterFilter === char ||
              (!activeLetterFilter && selectedItem?.name.toUpperCase().startsWith(char));

            return (
              <button
                key={char}
                type="button"
                onClick={() => handleLetterClick(char)}
                title={`Filter abjad ${char}`}
                className={`flex-1 py-1 text-center border-r border-[#4085ac] last:border-r-0 transition-colors cursor-pointer min-w-[12px] sm:min-w-[14px] ${
                  isSelected
                    ? 'bg-[#0f3e5c] text-white font-black'
                    : 'text-[#0f3e5c] hover:bg-sky-200/80'
                }`}
              >
                {char}
              </button>
            );
          })}
        </div>

        {/* 2. Judul "KARTU STOCK" Centered */}
        <div className="text-center relative my-1 sm:my-2">
          <h2
            className="text-lg sm:text-2xl font-black tracking-[0.25em] text-[#0f324c] uppercase font-serif"
            style={{
              textShadow: '0.5px 0.5px 0px rgba(255,255,255,0.6)',
            }}
          >
            KARTU STOCK
          </h2>
        </div>

        {/* Prominent Warning Banner if Item reaches or drops below minimum threshold */}
        {isCurrentItemLowStock && (
          <div className="mb-2 p-2 bg-red-600 text-white rounded-md text-xs font-sans font-bold flex items-center justify-between gap-2 shadow animate-in fade-in">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-200" />
              <span>
                PERINGATAN: STOK MENCAPAI / DI BAWAH BATAS MINIMUM DI {activeWarehouse.toUpperCase()}!
              </span>
            </div>
            <div className="font-mono text-[11px] bg-red-800 px-2 py-0.5 rounded border border-red-400 whitespace-nowrap">
              Sisa: {currentSisa} {selectedItem?.unit} (Batas Min {activeWarehouse.replace('Gudang ', '')}: {selectedItemBranchMin})
            </div>
          </div>
        )}

        {/* 3. Header Informasi: KODE BARANG di atas NAMA BARANG (Harga dihilangkan) & Kotak Pojok Kanan Atas */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-2 pb-1 text-xs font-sans">
          {/* Sisi Kiri: Kode Barang di atas Nama Barang */}
          <div className="flex-1 space-y-1.5">
            {/* Baris 1: KODE BARANG (DI ATAS NAMA BARANG) */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] sm:text-xs text-[#0f324c] whitespace-nowrap">
                KODE BARANG :
              </span>
              <span className="flex-1 font-mono font-black text-xs sm:text-sm text-[#092233] border-b border-[#3b7e9e] pb-0.5 px-1 tracking-wider flex items-center justify-between">
                <span>{selectedItem?.sku}</span>
                {isCurrentItemLowStock && (
                  <span className="text-[10px] bg-red-600 text-white font-sans px-1.5 py-0.2 rounded font-bold">
                    ⚠️ STOK DI BAWAH MINIMUM
                  </span>
                )}
              </span>
            </div>

            {/* Baris 2: NAMA BARANG */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-[11px] sm:text-xs text-[#0f324c] whitespace-nowrap">
                NAMA BARANG :
              </span>
              <span className="flex-1 font-bold text-xs sm:text-sm text-[#0a2335] border-b border-[#3b7e9e] pb-0.5 px-1 truncate">
                {selectedItem?.name} {selectedItem?.unit ? `(${selectedItem?.unit})` : ''}
              </span>
            </div>
          </div>

          {/* Sisi Kanan: Kotak border di pojok kanan atas (Lokasi Rak, Batas Min & Status Gudang) */}
          <div
            className={`border p-1.5 rounded-sm min-w-[140px] text-right shrink-0 transition-colors ${
              isCurrentItemLowStock
                ? 'bg-red-50 border-red-500 shadow-sm'
                : 'border-[#2f6a88] bg-white/60'
            }`}
          >
            <div className="text-[9px] uppercase font-bold text-[#1a4a68] leading-tight">
              LOKASI RAK / BIN
            </div>
            <div className="font-mono font-black text-xs sm:text-sm text-[#092233]">
              {selectedItem?.defaultBin}
            </div>

            {/* Batas Minimum & Status */}
            <div className="mt-1 pt-0.5 border-t border-[#3a7596]/40 flex items-center justify-between text-[9px]">
              <span className="text-zinc-600">Min {activeWarehouse.replace('Gudang ', '')}:</span>
              <span className="font-mono font-bold text-red-700">
                {selectedItemBranchMin} {selectedItem?.unit}
              </span>
            </div>

            {/* Per-branch min summary */}
            <div className="text-[8px] text-zinc-500 font-mono mt-0.5 leading-tight">
              Pst: {getItemMinStock(selectedItem, 'Gudang Pusat')} | Mry: {getItemMinStock(selectedItem, 'Gudang Meruya')}
            </div>

            <div className="text-[9px] font-bold leading-tight mt-0.5">
              {isCurrentItemLowStock ? (
                <span className="text-red-600">⚠️ DI BAWAH MINIMUM</span>
              ) : (
                <span className="text-emerald-700">✓ AMAN DI GUDANG</span>
              )}
            </div>
          </div>
        </div>

        {/* 4. TABEL KARTU STOCK (KOLOM PERSIS DI GAMBAR)
            Kolom: Tgl. | No. Nota | Keterangan | Masuk | Keluar | Sisa
        */}
        <div className="w-full border-2 border-[#1e4d6a] bg-[#d3eefc] rounded overflow-hidden shadow-inner">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-sans text-xs">
              {/* Table Header */}
              <thead>
                <tr className="bg-[#b3ddf3] border-b-2 border-[#1e4d6a] text-[#0d2a3f] font-bold text-[11px] sm:text-xs">
                  <th className="py-2 px-2 border-r border-[#3a7596] w-14 sm:w-18 text-center whitespace-nowrap">
                    Tgl.
                  </th>
                  <th className="py-2 px-2 border-r border-[#3a7596] w-24 sm:w-28 text-center whitespace-nowrap">
                    No. Nota
                  </th>
                  <th className="py-2 px-3 border-r border-[#3a7596] min-w-[140px] text-center whitespace-nowrap">
                    Keterangan
                  </th>
                  <th className="py-2 px-2 border-r border-[#3a7596] w-14 sm:w-18 text-center text-emerald-950 whitespace-nowrap bg-emerald-500/10">
                    Masuk
                  </th>
                  <th className="py-2 px-2 border-r border-[#3a7596] w-14 sm:w-18 text-center text-red-950 whitespace-nowrap bg-red-500/10">
                    Keluar
                  </th>
                  <th className="py-2 px-2 w-16 sm:w-24 text-center text-blue-950 whitespace-nowrap bg-blue-500/15">
                    Sisa
                  </th>
                </tr>
              </thead>

              {/* Table Body: Baris-baris transaksi nyata + garis kosong khas lembar fisik */}
              <tbody className="divide-y divide-[#4d8cae]">
                {ledgerRows.map((row) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-white/40 transition-colors text-[11px] sm:text-xs ${
                      row.isBelowMin ? 'bg-red-500/10 font-medium' : ''
                    }`}
                  >
                    {/* Tgl. */}
                    <td className="py-1.5 px-2 border-r border-[#4d8cae] text-center font-mono text-[#092233] whitespace-nowrap">
                      {row.displayDate}
                    </td>

                    {/* No. Nota */}
                    <td className="py-1.5 px-2 border-r border-[#4d8cae] font-mono font-bold text-[#092233] whitespace-nowrap">
                      {row.noNota}
                    </td>

                    {/* Keterangan */}
                    <td className="py-1.5 px-2.5 border-r border-[#4d8cae] text-[#092233] truncate max-w-[180px] sm:max-w-xs">
                      {row.keterangan}
                    </td>

                    {/* Masuk (Apabila barang masuk, masuk ke kolom masuk) */}
                    <td className="py-1.5 px-2 border-r border-[#4d8cae] text-center font-mono font-bold text-emerald-900 bg-emerald-500/5">
                      {row.masuk !== null ? (
                        <span className="font-black text-emerald-800">{row.masuk}</span>
                      ) : (
                        <span className="text-[#88b1ca]">-</span>
                      )}
                    </td>

                    {/* Keluar (Apabila barang keluar, masuk ke kolom keluar) */}
                    <td className="py-1.5 px-2 border-r border-[#4d8cae] text-center font-mono font-bold text-red-900 bg-red-500/5">
                      {row.keluar !== null ? (
                        <span className="font-black text-red-800">{row.keluar}</span>
                      ) : (
                        <span className="text-[#88b1ca]">-</span>
                      )}
                    </td>

                    {/* Sisa (Hitung sisa nya berapa secara otomatis + highlight jika di bawah batas minimum) */}
                    <td
                      className={`py-1.5 px-2 text-center font-mono font-black ${
                        row.isBelowMin
                          ? 'bg-red-500/25 text-red-900 font-extrabold'
                          : 'bg-blue-500/10 text-blue-950'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {row.isBelowMin && (
                          <span title={`Sisa ${row.sisa} mencapai/di bawah batas min ${activeWarehouse.replace('Gudang ', '')} (${selectedItemBranchMin})`}>
                            ⚠️
                          </span>
                        )}
                        <span>{row.sisa}</span>
                      </div>
                    </td>
                  </tr>
                ))}

                {/* Garis-garis kosong khas buku/kartu fisik (Ruled blank ledger lines) */}
                {Array.from({ length: blankLinesCount }).map((_, idx) => (
                  <tr key={`blank-${idx}`} className="h-7 text-transparent select-none">
                    <td className="border-r border-[#4d8cae]">&nbsp;</td>
                    <td className="border-r border-[#4d8cae]">&nbsp;</td>
                    <td className="border-r border-[#4d8cae]">&nbsp;</td>
                    <td className="border-r border-[#4d8cae] bg-emerald-500/5">&nbsp;</td>
                    <td className="border-r border-[#4d8cae] bg-red-500/5">&nbsp;</td>
                    <td className="bg-blue-500/10">&nbsp;</td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer: Rekap Total Masuk, Total Keluar, dan Sisa Akhir */}
              <tfoot>
                <tr className="bg-[#a7d5ee] border-t-2 border-[#1e4d6a] font-bold text-[11px] sm:text-xs text-[#0a2335]">
                  <td colSpan={3} className="py-2 px-3 border-r border-[#3a7596] text-right font-bold uppercase tracking-wider">
                    TOTAL MUTASI & SALDO SISA :
                  </td>
                  {/* Total Masuk */}
                  <td className="py-2 px-2 border-r border-[#3a7596] text-center font-mono font-black text-emerald-900 bg-emerald-500/20">
                    {totalMasuk}
                  </td>
                  {/* Total Keluar */}
                  <td className="py-2 px-2 border-r border-[#3a7596] text-center font-mono font-black text-red-900 bg-red-500/20">
                    {totalKeluar}
                  </td>
                  {/* Sisa Akhir Terkini */}
                  <td
                    className={`py-2 px-2 text-center font-mono font-black ${
                      isCurrentItemLowStock
                        ? 'bg-red-500/35 text-red-950 font-extrabold'
                        : 'bg-blue-500/25 text-blue-950'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      {isCurrentItemLowStock && <span>⚠️</span>}
                      <span>{currentSisa}</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* 5. Bagian Bawah Kartu: Cap Stempel Logo & Ringkasan Validasi */}
        <div className="flex items-center justify-between pt-3 text-[10px] sm:text-xs text-[#1a4a68] font-sans">
          {/* Logo / Cap Stempel bulat di pojok kiri bawah (Persis di gambar) */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#1b4b6b] p-0.5 flex items-center justify-center bg-white/70 shadow-sm">
              <div className="w-full h-full rounded-full border border-dashed border-[#1b4b6b] flex items-center justify-center text-[7px] font-black uppercase text-center leading-none">
                SG
              </div>
            </div>
            <div>
              <span className="font-bold block leading-tight text-[#0f324c]">
                ScanGudang Mobile WMS
              </span>
              <span className="text-[9px] text-[#2c5f7f]">
                Dokumen Resmi Kartu Persediaan Barang ({activeWarehouse})
              </span>
            </div>
          </div>

          {/* Status Saldo Terkini */}
          <div className="text-right">
            <span className="text-[10px] text-[#1b4b6b] block">Sisa Stok Terkini:</span>
            <span
              className={`text-sm sm:text-base font-black font-mono ${
                isCurrentItemLowStock ? 'text-red-700 font-extrabold' : 'text-[#0a2538]'
              }`}
            >
              {currentSisa} {selectedItem?.unit}
            </span>
            {isCurrentItemLowStock && (
              <span className="block text-[9px] text-red-600 font-bold">
                ⚠️ Batas Minimum ({activeWarehouse.replace('Gudang ', '')}): {selectedItemBranchMin} {selectedItem?.unit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
