import React, { useState } from 'react';
import {
  InventoryItem,
  AccurateItemRecord,
  AccurateReconciliationResult,
  WarehouseLocation,
} from '../../types/warehouse';
import {
  Scale,
  RefreshCw,
  Upload,
  Download,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  ArrowRight,
  Sparkles,
  Search,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface AccurateReconciliationTabProps {
  inventory: InventoryItem[];
  accurateRecords: AccurateItemRecord[];
  onUpdateAccurateRecords: (records: AccurateItemRecord[]) => void;
  activeWarehouse: WarehouseLocation;
}

export const AccurateReconciliationTab: React.FC<AccurateReconciliationTabProps> = ({
  inventory,
  accurateRecords,
  onUpdateAccurateRecords,
  activeWarehouse,
}) => {
  const [isPullingApi, setIsPullingApi] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'variance_only' | 'match_only'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Sub Fitur 1: Tarik Data Accurate Online API Simulation
  const handlePullAccurateData = () => {
    setIsPullingApi(true);
    setPullMessage(null);

    setTimeout(() => {
      // Simulate refreshed pull with slightly randomized minor updates or real match
      setIsPullingApi(false);
      setPullMessage(
        '✓ Berhasil menarik 8 data saldo buku dari Accurate Online API (Database: DB-PROD-ACC-01)'
      );
      soundService.playSuccessChime();
      setTimeout(() => setPullMessage(null), 4000);
    }, 1200);
  };

  // Sub Fitur 2: Bandingkan Data (Reconciliation engine)
  const reconciliationData: AccurateReconciliationResult[] = accurateRecords.map((acc) => {
    const matchedMaster = inventory.find((inv) => inv.sku === acc.sku);
    const physicalQty = matchedMaster ? matchedMaster.stock[activeWarehouse] || 0 : 0;
    const varianceQty = physicalQty - acc.accurateBookQty;
    const varianceValue = varianceQty * acc.costPerUnit;

    let status: AccurateReconciliationResult['status'] = 'MATCH';
    if (varianceQty > 0) status = 'SURPLUS';
    if (varianceQty < 0) status = 'DEFICIT';

    return {
      sku: acc.sku,
      name: acc.name,
      unit: acc.unit,
      costPerUnit: acc.costPerUnit,
      accurateQty: acc.accurateBookQty,
      physicalWarehouseQty: physicalQty,
      varianceQty,
      varianceValue,
      status,
    };
  });

  // Filtering
  const filteredData = reconciliationData.filter((row) => {
    const matchesSearch =
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.sku.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterMode === 'variance_only') {
      return matchesSearch && row.varianceQty !== 0;
    }
    if (filterMode === 'match_only') {
      return matchesSearch && row.varianceQty === 0;
    }
    return matchesSearch;
  });

  // Summary Metrics
  const totalVarianceQty = reconciliationData.reduce((acc, row) => acc + row.varianceQty, 0);
  const totalVarianceValue = reconciliationData.reduce((acc, row) => acc + row.varianceValue, 0);
  const totalMatches = reconciliationData.filter((r) => r.status === 'MATCH').length;
  const totalVariances = reconciliationData.filter((r) => r.status !== 'MATCH').length;

  // Sub Fitur 3: Ekspor Form Penyesuaian Persediaan (Inventory Adjustment) Accurate
  const exportAccurateAdjustmentCSV = () => {
    const varianceRows = reconciliationData.filter((r) => r.varianceQty !== 0);
    const headers = [
      'Kode Barang (Item No)',
      'Nama Barang (Item Description)',
      'Gudang (Warehouse)',
      'Kuantitas Buku (Book Qty)',
      'Kuantitas Fisik (Physical Qty)',
      'Selisih (Variance)',
      'Harga Pokok (Cost)',
      'Nilai Selisih (Total Variance IDR)',
      'Tipe Jurnal Penyesuaian',
    ];

    const rows = varianceRows.map((r) => [
      `"${r.sku}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${activeWarehouse}"`,
      r.accurateQty,
      r.physicalWarehouseQty,
      r.varianceQty,
      r.costPerUnit,
      r.varianceValue,
      r.varianceQty > 0 ? 'Penyesuaian Tambah (Surplus)' : 'Penyesuaian Kurang (Defisit)',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"FORM PENYESUAIAN PERSEDIAAN ACCURATE (INVENTORY ADJUSTMENT)"`,
        `"Tanggal: ${new Date().toISOString().slice(0, 10)}"`,
        headers.join(','),
        ...rows.map((e) => e.join(',')),
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Accurate_Inventory_Adjustment_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    soundService.playSuccessChime();
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Sub Fitur 1: Tarik Data Accurate Header */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Fase 3: Pencocokan Accurate
              </h2>
              <p className="text-[11px] text-zinc-400">
                Rekonsiliasi Saldo Buku Accurate vs Fisik Gudang
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePullAccurateData}
            disabled={isPullingApi}
            className="text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPullingApi ? 'animate-spin' : ''}`} />
            {isPullingApi ? 'Menarik Data...' : 'Tarik Data Accurate'}
          </button>
        </div>

        {pullMessage && (
          <div className="p-2.5 bg-blue-950/40 border border-blue-500/40 rounded-xl text-xs text-blue-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-400" />
            <span>{pullMessage}</span>
          </div>
        )}

        {/* Executive Variance Metric Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-mono text-zinc-400 block mb-0.5">
              Item Cocok 100%
            </span>
            <span className="text-xl font-black font-mono text-emerald-400">{totalMatches}</span>
            <span className="text-[10px] text-zinc-500 block">Sesuai Buku</span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-mono text-amber-400 block mb-0.5">
              Item Selisih
            </span>
            <span className="text-xl font-black font-mono text-amber-400">{totalVariances}</span>
            <span className="text-[10px] text-zinc-500 block">Perlu Penyesuaian</span>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-mono text-red-400 block mb-0.5">
              Estimasi Nilai Selisih
            </span>
            <span
              className={`text-sm font-black font-mono ${
                totalVarianceValue < 0 ? 'text-red-400' : 'text-amber-400'
              }`}
            >
              Rp {Math.abs(totalVarianceValue).toLocaleString('id-ID')}
            </span>
            <span className="text-[10px] text-zinc-500 block">
              {totalVarianceValue < 0 ? 'Potensi Rugi/Defisit' : 'Surplus Fisik'}
            </span>
          </div>
        </div>
      </section>

      {/* Sub Fitur 2 & 3: Bandingkan Data & Tandai Selisih */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-zinc-800">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Tabel Rekonsiliasi & Penanda Selisih
            </h3>
            <p className="text-[11px] text-zinc-400">
              Gudang: <strong className="text-blue-400">{activeWarehouse}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={exportAccurateAdjustmentCSV}
            className="text-[11px] bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            Export Form Penyesuaian Accurate
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari SKU atau nama barang..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white font-bold border-blue-500'
                  : 'bg-zinc-950 text-zinc-400 border-zinc-800'
              }`}
            >
              Semua ({reconciliationData.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('variance_only')}
              className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium cursor-pointer ${
                filterMode === 'variance_only'
                  ? 'bg-amber-500 text-zinc-950 font-bold border-amber-400'
                  : 'bg-zinc-950 text-amber-400 border-zinc-800'
              }`}
            >
              Hanya Selisih ({totalVariances})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('match_only')}
              className={`px-2.5 py-1 text-[11px] rounded-lg border font-medium cursor-pointer ${
                filterMode === 'match_only'
                  ? 'bg-emerald-600 text-white font-bold border-emerald-500'
                  : 'bg-zinc-950 text-emerald-400 border-zinc-800'
              }`}
            >
              Cocok ({totalMatches})
            </button>
          </div>
        </div>

        {/* Detailed Item Cards for mobile */}
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {filteredData.map((row) => (
            <div
              key={row.sku}
              className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                      {row.sku}
                    </span>
                    <span className="text-xs font-bold text-white">{row.name}</span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5 block">
                    HPP Satuan: Rp {row.costPerUnit.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Sub Fitur 3: Tandai Selisih Badge */}
                <div
                  className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] flex items-center gap-1 ${
                    row.status === 'MATCH'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : row.status === 'SURPLUS'
                      ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                      : 'bg-red-500/15 text-red-400 border-red-500/30'
                  }`}
                >
                  {row.status === 'MATCH' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> Cocok
                    </>
                  ) : row.status === 'SURPLUS' ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5" /> Selisih Lebih (+{row.varianceQty})
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3.5 h-3.5" /> Selisih Kurang ({row.varianceQty})
                    </>
                  )}
                </div>
              </div>

              {/* Side-by-side count details */}
              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-zinc-900 text-center font-mono">
                <div className="bg-zinc-900/60 p-1.5 rounded-lg">
                  <span className="text-[9px] text-zinc-400 block">Buku Accurate</span>
                  <span className="text-xs font-bold text-zinc-200">{row.accurateQty}</span>
                </div>
                <div className="bg-zinc-900/60 p-1.5 rounded-lg">
                  <span className="text-[9px] text-zinc-400 block">Fisik Gudang</span>
                  <span className="text-xs font-bold text-blue-300">
                    {row.physicalWarehouseQty}
                  </span>
                </div>
                <div
                  className={`p-1.5 rounded-lg ${
                    row.varianceQty === 0
                      ? 'bg-emerald-950/30 text-emerald-400'
                      : row.varianceQty > 0
                      ? 'bg-amber-950/30 text-amber-400'
                      : 'bg-red-950/30 text-red-400'
                  }`}
                >
                  <span className="text-[9px] block">Selisih Fisik</span>
                  <span className="text-xs font-bold">
                    {row.varianceQty > 0 ? `+${row.varianceQty}` : row.varianceQty} {row.unit}
                  </span>
                </div>
              </div>

              {/* Rupiah value discrepancy */}
              {row.varianceQty !== 0 && (
                <div className="flex items-center justify-between text-[11px] pt-1 text-zinc-400 border-t border-zinc-900/60">
                  <span>Estimasi Dampak Nilai Buku:</span>
                  <span
                    className={`font-mono font-bold ${
                      row.varianceValue > 0 ? 'text-amber-400' : 'text-red-400'
                    }`}
                  >
                    {row.varianceValue > 0 ? '+' : ''}Rp {row.varianceValue.toLocaleString('id-ID')}
                  </span>
                </div>
              )}
            </div>
          ))}

          {filteredData.length === 0 && (
            <div className="text-center py-6 text-zinc-500 text-xs">
              Tidak ada data yang sesuai filter pencarian.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
