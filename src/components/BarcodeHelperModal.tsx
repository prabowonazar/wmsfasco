import React, { useState, useRef } from 'react';
import { InventoryItem, WarehouseLocation, getItemMinStock } from '../types/warehouse';
import {
  X,
  Search,
  Sparkles,
  Copy,
  Check,
  QrCode,
  Plus,
  Upload,
  FileSpreadsheet,
  Trash2,
  Package,
  Layers,
  MapPin,
  Download,
  AlertCircle,
  CheckCircle2,
  Database,
  ArrowRight,
} from 'lucide-react';
import { soundService } from '../utils/audio';
import * as XLSX from 'xlsx';
import { REAL_USER_INVENTORY } from '../data/masterInventoryData';

interface BarcodeHelperModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onSelectBarcode: (barcode: string) => void;
  activeWarehouse?: WarehouseLocation;
  onSaveNewItem?: (item: InventoryItem) => void;
  onImportItems?: (items: InventoryItem[], replaceAll: boolean) => void;
  onDeleteItem?: (sku: string) => void;
  onOpenSpreadsheetTab?: () => void;
}

export const BarcodeHelperModal: React.FC<BarcodeHelperModalProps> = ({
  isOpen,
  onClose,
  items,
  onSelectBarcode,
  activeWarehouse = 'Gudang Pusat',
  onSaveNewItem,
  onImportItems,
  onDeleteItem,
  onOpenSpreadsheetTab,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'import'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);

  // Form Tambah Barang Manual
  const [newBarcode, setNewBarcode] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('Elektronik & Perangkat');
  const [newUnit, setNewUnit] = useState('Unit');
  const [newBin, setNewBin] = useState('A-01-01');
  const [newStock, setNewStock] = useState<number>(10);
  const [minStockPusat, setMinStockPusat] = useState<number>(10);
  const [minStockMeruya, setMinStockMeruya] = useState<number>(5);
  const [minStockDenpasar, setMinStockDenpasar] = useState<number>(5);
  const [minStockSurabaya, setMinStockSurabaya] = useState<number>(5);
  const [addSuccessMessage, setAddSuccessMessage] = useState<string | null>(null);

  // Import State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importPreview, setImportPreview] = useState<InventoryItem[] | null>(null);
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.barcode.includes(searchTerm) ||
      item.defaultBin.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleQuickScan = (barcode: string) => {
    soundService.playScanBeep();
    onSelectBarcode(barcode);
    onClose();
  };

  const handleCopy = (barcode: string) => {
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 1500);
  };

  const handleSaveManualForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBarcode.trim() || !newSku.trim() || !newName.trim()) {
      soundService.playErrorBuzz();
      return;
    }

    const newItem: InventoryItem = {
      barcode: newBarcode.trim(),
      sku: newSku.trim().toUpperCase(),
      name: newName.trim(),
      category: newCategory.trim() || 'Umum',
      unit: newUnit.trim() || 'Unit',
      defaultBin: newBin.trim().toUpperCase() || 'A-01-01',
      stock: {
        'Gudang Pusat': activeWarehouse === 'Gudang Pusat' ? Number(newStock) : 0,
        'Gudang Meruya': activeWarehouse === 'Gudang Meruya' ? Number(newStock) : 0,
        'Gudang Denpasar': activeWarehouse === 'Gudang Denpasar' ? Number(newStock) : 0,
        'Gudang Surabaya': activeWarehouse === 'Gudang Surabaya' ? Number(newStock) : 0,
      },
      minStock: Number(minStockPusat) || 5,
      minStockPerWarehouse: {
        'Gudang Pusat': Number(minStockPusat) || 5,
        'Gudang Meruya': Number(minStockMeruya) || 5,
        'Gudang Denpasar': Number(minStockDenpasar) || 5,
        'Gudang Surabaya': Number(minStockSurabaya) || 5,
      },
    };

    if (onSaveNewItem) {
      onSaveNewItem(newItem);
    }

    soundService.playSuccessChime();
    setAddSuccessMessage(`Barang "${newItem.name}" (${newItem.sku}) berhasil ditambahkan ke database!`);

    // Reset Form
    setNewBarcode('');
    setNewSku('');
    setNewName('');
    setNewBin('A-01-01');
    setNewStock(10);
    setMinStockPusat(10);
    setMinStockMeruya(5);
    setMinStockDenpasar(5);
    setMinStockSurabaya(5);

    setTimeout(() => {
      setAddSuccessMessage(null);
      setActiveTab('list');
    }, 1800);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportErrorMessage(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Prefer sheet named 'Master_Barang' or first sheet
        const sheetName = workbook.SheetNames.includes('Master_Barang')
          ? 'Master_Barang'
          : workbook.SheetNames[0];

        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonRows.length < 2) {
          setImportErrorMessage('File kosong atau tidak memiliki baris data.');
          return;
        }

        // Parse header row
        const headerRow: string[] = (jsonRows[0] || []).map((h: any) =>
          String(h || '').toLowerCase().trim()
        );

        // Find column indexes
        const idxBarcode = headerRow.findIndex((h) => h.includes('barcode') || h.includes('kode_barcode'));
        const idxSku = headerRow.findIndex((h) => h.includes('sku') || h.includes('kode_barang') || h.includes('kode'));
        const idxName = headerRow.findIndex((h) => h.includes('nama') || h.includes('item') || h.includes('deskripsi'));
        const idxCategory = headerRow.findIndex((h) => h.includes('kategori') || h.includes('category'));
        const idxUnit = headerRow.findIndex((h) => h.includes('satuan') || h.includes('unit'));
        const idxBin = headerRow.findIndex((h) => h.includes('rak') || h.includes('bin') || h.includes('lokasi'));
        
        // Stock per warehouse
        const idxStokPusat = headerRow.findIndex((h) => h.includes('stok') && (h.includes('pusat') || h.includes('pst')));
        const idxStokMeruya = headerRow.findIndex((h) => h.includes('stok') && (h.includes('meruya') || h.includes('mry')));
        const idxStokDenpasar = headerRow.findIndex((h) => h.includes('stok') && (h.includes('denpasar') || h.includes('dps') || h.includes('bali')));
        const idxStokSurabaya = headerRow.findIndex((h) => h.includes('stok') && (h.includes('surabaya') || h.includes('sby')));
        const idxStokGeneric = headerRow.findIndex((h) => (h === 'stok' || h === 'stock' || h.includes('stok_awal')) && !h.includes('min'));

        // Min stock per warehouse
        const idxMinStockPusat = headerRow.findIndex((h) => h.includes('min') && (h.includes('pusat') || h.includes('pst')));
        const idxMinStockMeruya = headerRow.findIndex((h) => h.includes('min') && (h.includes('meruya') || h.includes('mry')));
        const idxMinStockDenpasar = headerRow.findIndex((h) => h.includes('min') && (h.includes('denpasar') || h.includes('dps') || h.includes('bali')));
        const idxMinStockSurabaya = headerRow.findIndex((h) => h.includes('min') && (h.includes('surabaya') || h.includes('sby')));
        const idxMinStockGlobal = headerRow.findIndex((h) => (h.includes('min') || h.includes('minimum')) && !h.includes('pusat') && !h.includes('meruya') && !h.includes('denpasar') && !h.includes('surabaya'));

        const parsedItems: InventoryItem[] = [];

        for (let i = 1; i < jsonRows.length; i++) {
          const row = jsonRows[i];
          if (!row || row.length === 0) continue;

          const barcode = String(row[idxBarcode !== -1 ? idxBarcode : 0] || '').trim();
          const sku = String(row[idxSku !== -1 ? idxSku : 1] || '').trim().toUpperCase();
          const name = String(row[idxName !== -1 ? idxName : 2] || '').trim();

          if (!name && !sku) continue;

          const defaultMin = idxMinStockGlobal !== -1 ? Number(row[idxMinStockGlobal]) || 5 : 5;
          const minP = idxMinStockPusat !== -1 ? (Number(row[idxMinStockPusat]) || defaultMin) : defaultMin;
          const minM = idxMinStockMeruya !== -1 ? (Number(row[idxMinStockMeruya]) || defaultMin) : defaultMin;
          const minD = idxMinStockDenpasar !== -1 ? (Number(row[idxMinStockDenpasar]) || defaultMin) : defaultMin;
          const minS = idxMinStockSurabaya !== -1 ? (Number(row[idxMinStockSurabaya]) || defaultMin) : defaultMin;

          parsedItems.push({
            barcode: barcode || (sku ? 'BC-' + sku : 'BC-' + Date.now().toString().slice(-6)),
            sku: sku || 'SKU-' + (i + 100),
            name: name || 'Barang Tanpa Nama',
            category: idxCategory !== -1 && row[idxCategory] ? String(row[idxCategory]).trim() : 'Umum',
            unit: idxUnit !== -1 && row[idxUnit] ? String(row[idxUnit]).trim() : 'Unit',
            defaultBin: idxBin !== -1 && row[idxBin] ? String(row[idxBin]).trim().toUpperCase() : 'A-01-01',
            stock: {
              'Gudang Pusat': Number(idxStokPusat !== -1 ? row[idxStokPusat] : (idxStokGeneric !== -1 ? row[idxStokGeneric] : 0)) || 0,
              'Gudang Meruya': Number(idxStokMeruya !== -1 ? row[idxStokMeruya] : 0) || 0,
              'Gudang Denpasar': Number(idxStokDenpasar !== -1 ? row[idxStokDenpasar] : 0) || 0,
              'Gudang Surabaya': Number(idxStokSurabaya !== -1 ? row[idxStokSurabaya] : 0) || 0,
            },
            minStock: minP,
            minStockPerWarehouse: {
              'Gudang Pusat': minP,
              'Gudang Meruya': minM,
              'Gudang Denpasar': minD,
              'Gudang Surabaya': minS,
            },
          });
        }

        if (parsedItems.length === 0) {
          setImportErrorMessage('Tidak ada data barang yang valid ditemukan dalam file.');
        } else {
          setImportPreview(parsedItems);
          soundService.playSuccessChime();
        }
      } catch (err: any) {
        setImportErrorMessage('Gagal membaca file: ' + (err.message || 'Format tidak didukung'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleApplyImport = () => {
    if (!importPreview || importPreview.length === 0) return;

    if (onImportItems) {
      onImportItems(importPreview, importMode === 'replace');
    }

    soundService.playSuccessChime();
    setImportSuccessMessage(
      `Berhasil memasukkan ${importPreview.length} data barang ke database gudang!`
    );

    setTimeout(() => {
      setImportPreview(null);
      setImportFileName(null);
      setImportSuccessMessage(null);
      setActiveTab('list');
    }, 1800);
  };

  const handleDownloadTemplate = () => {
    const templateHeaders = [
      'Barcode',
      'Kode_SKU',
      'Nama_Barang',
      'Kategori',
      'Satuan',
      'Lokasi_Rak',
      'Stok_Gudang_Pusat',
      'Stok_Gudang_Meruya',
      'Stok_Gudang_Denpasar',
      'Stok_Gudang_Surabaya',
      'Min_Stok_Pusat',
      'Min_Stok_Meruya',
      'Min_Stok_Denpasar',
      'Min_Stok_Surabaya',
    ];
    const sampleRows = [
      ['899276100101', 'EL-001', 'Industrial Barcode Scanner 2D USB', 'Elektronik & Perangkat', 'Unit', 'A-01-01', 50, 20, 15, 25, 15, 5, 5, 8],
      ['899276100102', 'EL-002', 'Thermal Paper Roll 80x80mm', 'Perlengkapan Kasir', 'Pack', 'A-01-02', 100, 30, 20, 40, 20, 10, 10, 15],
      ['899276100201', 'MC-101', 'Bearing Baja Heavy Duty 6205-2RS', 'Sparepart & Mesin', 'Pcs', 'B-01-01', 75, 25, 15, 30, 20, 5, 5, 10],
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders, ...sampleRows]);
    ws['!cols'] = [
      { wch: 18 }, { wch: 14 }, { wch: 36 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
      { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
      { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Master_Barang');
    XLSX.writeFile(wb, 'Template_Master_Barang_PerCabang.xlsx');
    soundService.playSuccessChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in select-none">
      <div className="relative w-full max-w-lg max-h-[92vh] bg-zinc-900 border border-zinc-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-zinc-100 font-sans">
        {/* Header with Title & Close */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#C6F232]/10 border border-[#C6F232]/30 rounded-2xl text-[#C6F232]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
                Database Master Barang & Barcode
              </h2>
              <p className="text-[11px] text-zinc-400">
                Kelola katalog barang, input manual, import Excel, atau scan barcode
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Nav Tabs: Daftar Barang, + Tambah Baru, Import Excel */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/50 p-1.5 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'list'
                ? 'bg-[#18181B] text-[#C6F232] shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Katalog ({items.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'add'
                ? 'bg-[#18181B] text-[#C6F232] shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Input Barang</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'bg-[#18181B] text-[#C6F232] shadow-sm border border-zinc-700/60'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import Excel / CSV</span>
          </button>
        </div>

        {/* TAB 1: LIST / DAFTAR BARANG */}
        {activeTab === 'list' && (
          <div className="flex-1 flex flex-col min-h-0">
            {/* Search Bar */}
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cari SKU, nama barang, barcode, rak..."
                  className="w-full bg-zinc-950 border border-zinc-700/80 focus:border-[#C6F232] rounded-xl py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('add')}
                className="px-3 py-2 bg-[#C6F232] hover:bg-[#B8E62B] text-zinc-950 font-bold text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>

            {/* Banner Master Database Spreadsheet Aktif */}
            <div className="mx-3 mt-3 px-3 py-2 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                <span className="text-[11px] text-zinc-200 truncate">
                  <strong className="text-emerald-300 font-mono">{items.length} Barang Master</strong> dari Spreadsheet Anda Aktif
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onImportItems) {
                    onImportItems(REAL_USER_INVENTORY, true);
                    soundService.playSuccessChime();
                  }
                }}
                className="text-[10px] font-mono font-bold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-2 py-0.5 rounded-md border border-emerald-500/40 transition-colors cursor-pointer shrink-0"
                title="Muat ulang seluruh 994 item dari file spreadsheet yang Anda berikan"
              >
                Muat Ulang Master
              </button>
            </div>

            {/* List Container */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
              {filteredItems.length === 0 ? (
                <div className="text-center py-12 text-zinc-500 text-xs">
                  Tidak ada barang yang cocok dengan pencarian "{searchTerm}".
                </div>
              ) : (
                filteredItems.map((item) => {
                  const whStock = item.stock[activeWarehouse] || 0;
                  const branchMin = getItemMinStock(item, activeWarehouse);
                  const isLowStock = whStock <= branchMin;

                  return (
                    <div
                      key={item.sku}
                      className="group p-3 bg-zinc-950 border border-zinc-800/80 hover:border-[#C6F232]/50 rounded-2xl transition-all flex flex-col gap-2 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-[#C6F232] bg-[#C6F232]/10 px-2 py-0.5 rounded-lg border border-[#C6F232]/20">
                              {item.sku}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono">
                              Rak: <strong className="text-zinc-200">{item.defaultBin}</strong>
                            </span>
                            {isLowStock && (
                              <span className="text-[9px] font-bold bg-red-600/90 text-white px-1.5 py-0.5 rounded-md shadow">
                                STOK KRITIS (≤{branchMin})
                              </span>
                            )}
                          </div>
                          <h3 className="text-xs font-bold text-white mt-1 group-hover:text-[#C6F232] transition-colors truncate">
                            {item.name}
                          </h3>
                          <p className="text-[10px] text-zinc-400 mt-0.5 flex flex-wrap items-center gap-1.5 font-mono">
                            <span>{item.category}</span>
                            <span>·</span>
                            <span className={isLowStock ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                              Stok {activeWarehouse.replace('Gudang ', '')}: <strong className="text-white">{whStock}</strong> / Min: {branchMin} {item.unit}
                            </span>
                          </p>

                          {/* Branch Min Stock Summary Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] font-mono text-zinc-400 bg-zinc-900/60 px-2 py-0.5 rounded-md border border-zinc-800">
                            <span className="text-zinc-500 font-bold">Min Stok:</span>
                            <span className={activeWarehouse === 'Gudang Pusat' ? 'text-[#C6F232] font-bold' : 'text-zinc-300'}>
                              Pusat: {getItemMinStock(item, 'Gudang Pusat')}
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className={activeWarehouse === 'Gudang Meruya' ? 'text-[#C6F232] font-bold' : 'text-zinc-300'}>
                              Meruya: {getItemMinStock(item, 'Gudang Meruya')}
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className={activeWarehouse === 'Gudang Denpasar' ? 'text-[#C6F232] font-bold' : 'text-zinc-300'}>
                              Denpasar: {getItemMinStock(item, 'Gudang Denpasar')}
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className={activeWarehouse === 'Gudang Surabaya' ? 'text-[#C6F232] font-bold' : 'text-zinc-300'}>
                              Surabaya: {getItemMinStock(item, 'Gudang Surabaya')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleQuickScan(item.barcode)}
                            className="px-2.5 py-1.5 bg-[#C6F232] hover:bg-[#B8E62B] active:scale-95 text-zinc-950 text-xs font-extrabold rounded-xl flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                            title="Simulasi Scan Barcode Ini"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Scan</span>
                          </button>

                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus "${item.name}" dari database barang?`)) {
                                  onDeleteItem(item.sku);
                                }
                              }}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Hapus Barang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Barcode Strip */}
                      <div className="flex items-center justify-between bg-zinc-900/80 px-2.5 py-1.5 rounded-xl border border-zinc-800/60 text-[11px] font-mono">
                        <span className="text-zinc-300 truncate">
                          Barcode: <strong className="text-white">{item.barcode}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(item.barcode)}
                          className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 ml-2 cursor-pointer shrink-0"
                        >
                          {copiedBarcode === item.barcode ? (
                            <>
                              <Check className="w-3 h-3 text-[#C6F232]" />
                              <span className="text-[#C6F232]">Disalin!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FORM TAMBAH BARANG MANUAL */}
        {activeTab === 'add' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-[#18181B] p-3 rounded-2xl border border-zinc-800">
              <span className="text-xs font-bold text-white block">Form Pendaftaran Barang Baru</span>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Masukkan detail barang untuk didaftarkan ke database gudang Anda.
              </p>
            </div>

            {addSuccessMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#C6F232] shrink-0" />
                <span>{addSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveManualForm} className="space-y-3 text-xs">
              {/* Barcode & SKU */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Nomor Barcode / QR *
                  </label>
                  <input
                    type="text"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    placeholder="Contoh: 899276100105"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-[#C6F232]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Kode SKU Barang *
                  </label>
                  <input
                    type="text"
                    value={newSku}
                    onChange={(e) => setNewSku(e.target.value)}
                    placeholder="Contoh: BRG-001"
                    required
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-[#C6F232] uppercase"
                  />
                </div>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Nama Lengkap Barang *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Contoh: Lakban Coklat 2 Inch Heavy Duty"
                  required
                  className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C6F232]"
                />
              </div>

              {/* Kategori & Satuan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Kategori Barang
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="Packaging, Sparepart..."
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C6F232]"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Satuan
                  </label>
                  <input
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="Pcs, Unit, Box, Roll..."
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#C6F232]"
                  />
                </div>
              </div>

              {/* Lokasi Rak & Stok Awal */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Lokasi Rak (Bin)
                  </label>
                  <input
                    type="text"
                    value={newBin}
                    onChange={(e) => setNewBin(e.target.value)}
                    placeholder="A-01-01"
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-[#C6F232] uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                    Stok Awal ({activeWarehouse.split(' ')[1] || 'Pusat'})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newStock}
                    onChange={(e) => setNewStock(parseInt(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl px-3 py-2 font-mono text-white focus:outline-none focus:border-[#C6F232]"
                  />
                </div>
              </div>

              {/* Batas Minimum Tiap Cabang */}
              <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#C6F232] block font-mono uppercase tracking-wide">
                    Batas Min Stok Tiap Cabang (Kritis)
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">Bisa Berbeda</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Min Gudang Pusat</label>
                    <input
                      type="number"
                      min="0"
                      value={minStockPusat}
                      onChange={(e) => setMinStockPusat(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#C6F232] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Min Gudang Meruya</label>
                    <input
                      type="number"
                      min="0"
                      value={minStockMeruya}
                      onChange={(e) => setMinStockMeruya(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#C6F232] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Min Gudang Denpasar</label>
                    <input
                      type="number"
                      min="0"
                      value={minStockDenpasar}
                      onChange={(e) => setMinStockDenpasar(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#C6F232] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Min Gudang Surabaya</label>
                    <input
                      type="number"
                      min="0"
                      value={minStockSurabaya}
                      onChange={(e) => setMinStockSurabaya(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-2.5 py-1.5 font-mono text-xs text-white focus:border-[#C6F232] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-2xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className="flex-2 py-3 bg-[#C6F232] hover:bg-[#B8E62B] active:scale-98 text-zinc-950 font-extrabold rounded-2xl transition-all cursor-pointer shadow-lg shadow-[#C6F232]/20 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Simpan ke Database</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 3: IMPORT FILE EXCEL / CSV */}
        {activeTab === 'import' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Guide & Template Download */}
            <div className="bg-[#18181B] p-3.5 rounded-2xl border border-zinc-800 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white block">Import Database Excel (.xlsx / .csv)</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Gunakan template standar atau unggah file daftar barang Anda
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[#C6F232] border border-zinc-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Template</span>
              </button>
            </div>

            {importSuccessMessage && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-[#C6F232] shrink-0" />
                <span>{importSuccessMessage}</span>
              </div>
            )}

            {importErrorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-2xl text-xs text-red-300 font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{importErrorMessage}</span>
              </div>
            )}

            {/* Dropzone File Selector */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-700 hover:border-[#C6F232] bg-zinc-950/60 rounded-3xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-[#C6F232]/10 border border-[#C6F232]/30 text-[#C6F232] mx-auto flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Upload className="w-6 h-6 stroke-[2.5]" />
              </div>
              <h4 className="text-xs font-bold text-white">
                {importFileName ? importFileName : 'Klik atau Tarik File Excel (.xlsx / .csv) ke Sini'}
              </h4>
              <p className="text-[11px] text-zinc-500 mt-1">
                Format kolom otomatis terdeteksi (Barcode, SKU, Nama Barang, Satuan, Rak, Stok)
              </p>
            </div>

            {/* Preview Parsed Items */}
            {importPreview && importPreview.length > 0 && (
              <div className="space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#C6F232] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ditemukan {importPreview.length} Barang Siap Masuk Database
                  </span>

                  {/* Mode Selector */}
                  <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setImportMode('merge')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                        importMode === 'merge' ? 'bg-[#C6F232] text-zinc-950' : 'text-zinc-400'
                      }`}
                    >
                      Gabungkan
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`px-2 py-0.5 rounded-lg font-bold transition-all ${
                        importMode === 'replace' ? 'bg-red-500 text-white' : 'text-zinc-400'
                      }`}
                    >
                      Gantikan Semua
                    </button>
                  </div>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-zinc-950 rounded-2xl border border-zinc-800">
                  {importPreview.slice(0, 15).map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-zinc-900 rounded-xl flex items-center justify-between text-[11px]"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[#C6F232]">{it.sku}</span>
                          <span className="text-zinc-400 font-mono">({it.barcode})</span>
                        </div>
                        <p className="text-white font-medium truncate max-w-[220px]">{it.name}</p>
                      </div>
                      <span className="text-zinc-400 font-mono text-[10px]">
                        Stok: {it.stock['Gudang Pusat']} {it.unit}
                      </span>
                    </div>
                  ))}
                  {importPreview.length > 15 && (
                    <p className="text-[10px] text-zinc-500 text-center pt-1">
                      ...dan {importPreview.length - 15} barang lainnya
                    </p>
                  )}
                </div>

                {/* Confirm Apply Import */}
                <button
                  type="button"
                  onClick={handleApplyImport}
                  className="w-full py-3.5 bg-[#C6F232] hover:bg-[#B8E62B] text-zinc-950 font-extrabold text-xs rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>
                    Simpan {importPreview.length} Barang ke Database Gudang ({importMode === 'merge' ? 'Gabungkan' : 'Gantikan'})
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
