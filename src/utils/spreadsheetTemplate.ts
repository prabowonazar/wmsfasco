import * as XLSX from 'xlsx';
import { InventoryItem, ScanLog, StockCardEntry, SyncQueueItem, SpreadsheetSyncConfig } from '../types/warehouse';

export interface SheetColumnDef {
  header: string;
  key: string;
  description: string;
  example: string | number;
  width?: number;
}

export interface SheetSchemaDef {
  sheetName: string;
  title: string;
  description: string;
  color: string;
  columns: SheetColumnDef[];
}

export const SPREADSHEET_SCHEMAS: SheetSchemaDef[] = [
  {
    sheetName: 'Master_Barang',
    title: '1. Master Database Barang & Barcode',
    description: 'Database utama barang, kode barcode scanner, lokasi rak gudang, dan stok acuan.',
    color: 'emerald',
    columns: [
      { header: 'Barcode', key: 'barcode', description: 'Nomor Barcode / QR (Teks)', example: '899276100101', width: 18 },
      { header: 'SKU', key: 'sku', description: 'Kode Item Barang Unik', example: 'EL-001', width: 14 },
      { header: 'Nama_Barang', key: 'name', description: 'Nama Lengkap Item / Produk', example: 'Industrial Barcode Scanner 2D USB', width: 35 },
      { header: 'Kategori', key: 'category', description: 'Kategori Produk', example: 'Elektronik & Perangkat', width: 22 },
      { header: 'Satuan', key: 'unit', description: 'Satuan Ukur (Unit, Pcs, Box, Roll)', example: 'Unit', width: 10 },
      { header: 'Lokasi_Rak', key: 'defaultBin', description: 'Lokasi Bin / Rak Penyimpanan', example: 'A-01-01', width: 14 },
      { header: 'Stok_Gudang_Pusat', key: 'stockPusat', description: 'Jumlah Stok di Gudang Pusat', example: 45, width: 18 },
      { header: 'Stok_Gudang_Meruya', key: 'stockMeruya', description: 'Jumlah Stok di Gudang Meruya', example: 18, width: 18 },
      { header: 'Stok_Gudang_Denpasar', key: 'stockDenpasar', description: 'Jumlah Stok di Gudang Denpasar', example: 10, width: 18 },
      { header: 'Stok_Gudang_Surabaya', key: 'stockSurabaya', description: 'Jumlah Stok di Gudang Surabaya', example: 25, width: 18 },
      { header: 'Min_Stok_Pusat', key: 'minStockPusat', description: 'Batas Stok Minimum Gudang Pusat', example: 15, width: 16 },
      { header: 'Min_Stok_Meruya', key: 'minStockMeruya', description: 'Batas Stok Minimum Gudang Meruya', example: 5, width: 16 },
      { header: 'Min_Stok_Denpasar', key: 'minStockDenpasar', description: 'Batas Stok Minimum Gudang Denpasar', example: 5, width: 16 },
      { header: 'Min_Stok_Surabaya', key: 'minStockSurabaya', description: 'Batas Stok Minimum Gudang Surabaya', example: 10, width: 16 },
    ],
  },
  {
    sheetName: 'Log_Transaksi',
    title: '2. Log Hasil Scan & Transaksi Gudang',
    description: 'Catatan setiap aktivitas scan: Barang Masuk (GR), Keluar (DO), Opname (Rekonsel), Mutasi Masuk/Keluar.',
    color: 'amber',
    columns: [
      { header: 'Timestamp', key: 'timestamp', description: 'Waktu Transaksi (YYYY-MM-DD HH:mm:ss)', example: '2026-10-13 08:35:12', width: 20 },
      { header: 'ID_Transaksi', key: 'id', description: 'ID Unik Record Scan', example: 'scan-1728801931', width: 18 },
      { header: 'Barcode', key: 'barcode', description: 'Barcode yang di-scan', example: '899276100101', width: 18 },
      { header: 'SKU', key: 'sku', description: 'Kode Item Barang', example: 'EL-001', width: 14 },
      { header: 'Nama_Barang', key: 'name', description: 'Nama Barang', example: 'Industrial Barcode Scanner 2D USB', width: 35 },
      { header: 'Tipe_Scan', key: 'type', description: 'GR / DO / OPNAME / MUTASI_MASUK / MUTASI_KELUAR', example: 'GR', width: 16 },
      { header: 'Gudang', key: 'warehouse', description: 'Lokasi Gudang Operasional', example: 'Gudang Pusat', width: 18 },
      { header: 'Lokasi_Rak', key: 'binLocation', description: 'Nomor Rak / Bin Penyimpanan', example: 'A-01-01', width: 14 },
      { header: 'Qty', key: 'quantity', description: 'Jumlah Barang', example: 10, width: 10 },
      { header: 'Operator', key: 'operatorName', description: 'Nama Petugas / Operator Scanner', example: 'Nazar Prabowo', width: 18 },
      { header: 'No_Referensi', key: 'referenceNo', description: 'No PO / Surat Jalan / No DO / Dokumen', example: 'GR-2026-001', width: 18 },
      { header: 'Catatan', key: 'notes', description: 'Catatan Tambahan', example: 'Penerimaan kontainer 1', width: 28 },
    ],
  },
  {
    sheetName: 'Kartu_Stok',
    title: '3. Kartu Stok & Mutasi Real-time',
    description: 'Rekap riwayat mutasi debit/kredit stok per SKU lengkap dengan saldo akhir setelah transaksi.',
    color: 'blue',
    columns: [
      { header: 'Tanggal', key: 'date', description: 'Tanggal Transaksi Mutasi', example: '2026-10-13', width: 14 },
      { header: 'ID_Kartu', key: 'id', description: 'ID Baris Kartu Stok', example: 'sc-1728801931', width: 18 },
      { header: 'SKU', key: 'sku', description: 'Kode SKU Barang', example: 'EL-001', width: 14 },
      { header: 'Nama_Barang', key: 'name', description: 'Nama Barang', example: 'Industrial Barcode Scanner 2D USB', width: 35 },
      { header: 'Gudang', key: 'warehouse', description: 'Gudang', example: 'Gudang Pusat', width: 18 },
      { header: 'Tipe_Transaksi', key: 'transactionType', description: 'GR / DO / OPNAME_RECONSEL / MUTASI_MASUK / MUTASI_KELUAR', example: 'GR', width: 18 },
      { header: 'No_Referensi', key: 'referenceNo', description: 'Nomor Dokumen / Surat Jalan', example: 'GR-2026-001', width: 18 },
      { header: 'Qty_Masuk', key: 'qtyIn', description: 'Jumlah Barang Masuk (+)', example: 10, width: 12 },
      { header: 'Qty_Keluar', key: 'qtyOut', description: 'Jumlah Barang Keluar (-)', example: 0, width: 12 },
      { header: 'Saldo_Akhir', key: 'balanceAfter', description: 'Sisa Saldo Stok di Gudang', example: 55, width: 14 },
      { header: 'Operator', key: 'operator', description: 'Nama Petugas', example: 'Nazar Prabowo', width: 18 },
      { header: 'Keterangan', key: 'notes', description: 'Keterangan Transaksi', example: 'Barang Masuk Supplier', width: 28 },
    ],
  },
  {
    sheetName: 'Opname_Rekonsel',
    title: '4. Hasil Stock Opname (Rekonsel Fisik vs Sistem)',
    description: 'Catatan hasil audit fisik vs angka komputer, selisih (variance), dan status rekonsiliasi.',
    color: 'purple',
    columns: [
      { header: 'ID_Sesi', key: 'sessionId', description: 'ID Sesi Opname', example: 'OPN-2026-10-01', width: 18 },
      { header: 'Tanggal_Opname', key: 'date', description: 'Tanggal Perhitungan', example: '2026-10-13 14:00', width: 18 },
      { header: 'Gudang', key: 'warehouse', description: 'Gudang yang di-opname', example: 'Gudang Pusat', width: 18 },
      { header: 'SKU', key: 'sku', description: 'Kode Item Barang', example: 'EL-001', width: 14 },
      { header: 'Nama_Barang', key: 'name', description: 'Nama Barang', example: 'Industrial Barcode Scanner 2D USB', width: 35 },
      { header: 'Stok_Sistem', key: 'systemQty', description: 'Jumlah Stok Menurut Sistem/Komputer', example: 45, width: 14 },
      { header: 'Stok_Fisik', key: 'physicalQty', description: 'Jumlah Hasil Hitung Fisik (Scan)', example: 45, width: 14 },
      { header: 'Selisih_Qty', key: 'variance', description: 'Selisih (Fisik dikurangi Sistem)', example: 0, width: 14 },
      { header: 'Status_Rekonsel', key: 'status', description: 'MATCH / LEBIH / KURANG', example: 'MATCH', width: 16 },
      { header: 'Auditor', key: 'auditor', description: 'Petugas Auditor Opname', example: 'Hendra Wijaya', width: 18 },
      { header: 'Catatan', key: 'notes', description: 'Catatan Temuan Fisik', example: 'Kondisi barang baik & segel utuh', width: 30 },
    ],
  },
];

export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * =========================================================================
 * GOOGLE APPS SCRIPT WEBHOOK UNTUK WMS MOBILE APPS
 * =========================================================================
 * Script ini menghubungkan ScanGudang WMS Mobile dengan Google Spreadsheet.
 * Data hasil scan (GR, DO, Opname Rekonsel, Mutasi) otomatis masuk ke sini!
 * 
 * CARA PASANG (HANYA 2 MENIT):
 * 1. Di Google Sheets Anda, klik menu: Ekstensi > Apps Script
 * 2. Hapus semua kode bawaan, lalu Paste (Tempel) SELURUH kode ini.
 * 3. Klik tombol "Jalankan" (Run) pada fungsi: setupDatabase
 *    (Fungsi ini otomatis membuat 4 sheet tabel lengkap dengan header & warna).
 * 4. Klik tombol "Terapkan" (Deploy) di kanan atas > "Deployment Baru" (New deployment).
 * 5. Pilih jenis: "Aplikasi Web" (Web App).
 *    - Deskripsi: WMS Mobile Webhook
 *    - Jalankan sebagai: "Saya" (Me)
 *    - Siapa yang memiliki akses: "Siapa saja" (Anyone) -> PENTING agar mobile bisa kirim!
 * 6. Klik "Terapkan" (Deploy), lalu SALIN URL Aplikasi Web yang dihasilkan
 *    (Contoh URL: https://script.google.com/macros/s/AKfycb.../exec).
 * 7. Buka tab "Spreadsheet" di aplikasi HP ScanGudang, lalu tempel URL tersebut.
 * =========================================================================
 */

// 1. SETUP TABEL DATABASE OTOMATIS
function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet 1: Master_Barang
  var shMaster = ss.getSheetByName('Master_Barang') || ss.insertSheet('Master_Barang');
  if (shMaster.getLastRow() === 0) {
    shMaster.appendRow([
      'Barcode', 'SKU', 'Nama_Barang', 'Kategori', 'Satuan', 'Lokasi_Rak',
      'Stok_Gudang_Pusat', 'Stok_Gudang_Meruya', 'Stok_Gudang_Denpasar', 'Stok_Gudang_Surabaya',
      'Min_Stok_Pusat', 'Min_Stok_Meruya', 'Min_Stok_Denpasar', 'Min_Stok_Surabaya'
    ]);
    // Format Header
    shMaster.getRange(1, 1, 1, 14).setBackground('#059669').setFontColor('#ffffff').setFontWeight('bold');
    shMaster.setFrozenRows(1);
    
    // Sample Data
    shMaster.appendRow(['899276100101', 'EL-001', 'Industrial Barcode Scanner 2D USB', 'Elektronik & Perangkat', 'Unit', 'A-01-01', 45, 18, 10, 25, 15, 5, 5, 8]);
    shMaster.appendRow(['899276100102', 'EL-002', 'Thermal Barcode Label Printer 4-inch', 'Elektronik & Perangkat', 'Unit', 'A-01-02', 20, 8, 5, 12, 10, 3, 3, 5]);
    shMaster.appendRow(['899276100103', 'PK-001', 'Stretch Film Wrapping Roll 50cm x 300m', 'Packaging & Logistik', 'Roll', 'B-02-01', 120, 45, 30, 80, 50]);
  }

  // Sheet 2: Log_Transaksi
  var shLog = ss.getSheetByName('Log_Transaksi') || ss.insertSheet('Log_Transaksi');
  if (shLog.getLastRow() === 0) {
    shLog.appendRow([
      'Timestamp', 'ID_Transaksi', 'Barcode', 'SKU', 'Nama_Barang',
      'Tipe_Scan', 'Gudang', 'Lokasi_Rak', 'Qty', 'Operator', 'No_Referensi', 'Catatan'
    ]);
    shLog.getRange(1, 1, 1, 12).setBackground('#d97706').setFontColor('#ffffff').setFontWeight('bold');
    shLog.setFrozenRows(1);
  }

  // Sheet 3: Kartu_Stok
  var shKartu = ss.getSheetByName('Kartu_Stok') || ss.insertSheet('Kartu_Stok');
  if (shKartu.getLastRow() === 0) {
    shKartu.appendRow([
      'Tanggal', 'ID_Kartu', 'SKU', 'Nama_Barang', 'Gudang',
      'Tipe_Transaksi', 'No_Referensi', 'Qty_Masuk', 'Qty_Keluar', 'Saldo_Akhir', 'Operator', 'Keterangan'
    ]);
    shKartu.getRange(1, 1, 1, 12).setBackground('#2563eb').setFontColor('#ffffff').setFontWeight('bold');
    shKartu.setFrozenRows(1);
  }

  // Sheet 4: Opname_Rekonsel
  var shOpname = ss.getSheetByName('Opname_Rekonsel') || ss.insertSheet('Opname_Rekonsel');
  if (shOpname.getLastRow() === 0) {
    shOpname.appendRow([
      'ID_Sesi', 'Tanggal_Opname', 'Gudang', 'SKU', 'Nama_Barang',
      'Stok_Sistem', 'Stok_Fisik', 'Selisih_Qty', 'Status_Rekonsel', 'Auditor', 'Catatan'
    ]);
    shOpname.getRange(1, 1, 1, 11).setBackground('#7c3aed').setFontColor('#ffffff').setFontWeight('bold');
    shOpname.setFrozenRows(1);
  }

  SpreadsheetApp.getUi().alert('Selamat! Database ScanGudang WMS berhasil dibuat dengan 4 tabel.');
}

// 2. TERIMA DATA DARI APLIKASI MOBILE (HTTP POST)
function doPost(e) {
  try {
    var rawData = e.postData.contents;
    var data = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // Pastikan sheet Log_Transaksi ada
    var shLog = ss.getSheetByName('Log_Transaksi') || ss.insertSheet('Log_Transaksi');
    var shKartu = ss.getSheetByName('Kartu_Stok') || ss.insertSheet('Kartu_Stok');

    // Jika data berupa batch array antrean (SyncQueue)
    var items = Array.isArray(data) ? data : [data];
    var processedCount = 0;

    for (var i = 0; i < items.length; i++) {
      var item = items[i];

      // Catat ke Log_Transaksi
      shLog.appendRow([
        item.timestamp || new Date().toISOString(),
        item.id || ('scan-' + new Date().getTime()),
        "'" + (item.barcode || item.referenceNo || ''),
        item.sku || '',
        item.name || '',
        item.type || 'GR',
        item.warehouse || 'Gudang Pusat',
        item.binLocation || item.bin || '-',
        Number(item.quantity || item.qty || 1),
        item.operator || item.operatorName || 'Operator Mobile',
        item.referenceNo || '-',
        item.notes || 'Sync dari Mobile'
      ]);

      processedCount++;
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'Berhasil menyimpan ' + processedCount + ' data transaksi ke Google Spreadsheet',
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// 3. BACA DATA MASTER DARI GOOGLE SHEET (HTTP GET)
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var shMaster = ss.getSheetByName('Master_Barang');
    if (!shMaster) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'Sheet Master_Barang belum dibuat. Jalankan fungsi setupDatabase terlebih dahulu.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var values = shMaster.getDataRange().getValues();
    var headers = values[0];
    var items = [];

    for (var r = 1; r < values.length; r++) {
      var row = values[r];
      var obj = {};
      for (var c = 0; c < headers.length; c++) {
        obj[headers[c]] = row[c];
      }
      items.push(obj);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      total: items.length,
      data: items
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
`;

/**
 * Downloads a complete, formatted .xlsx file containing all 4 database tables
 */
export function downloadDatabaseWorkbook(
  inventory: InventoryItem[] = [],
  scanLogs: ScanLog[] = [],
  stockCards: StockCardEntry[] = []
) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet Master_Barang
  const masterHeaders = [
    'Barcode',
    'SKU',
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

  const masterRows = inventory.length > 0
    ? inventory.map((inv) => [
        inv.barcode,
        inv.sku,
        inv.name,
        inv.category,
        inv.unit,
        inv.defaultBin,
        inv.stock['Gudang Pusat'] || 0,
        inv.stock['Gudang Meruya'] || 0,
        inv.stock['Gudang Denpasar'] || 0,
        inv.stock['Gudang Surabaya'] || 0,
        inv.minStockPerWarehouse?.['Gudang Pusat'] ?? inv.minStock ?? 5,
        inv.minStockPerWarehouse?.['Gudang Meruya'] ?? inv.minStock ?? 5,
        inv.minStockPerWarehouse?.['Gudang Denpasar'] ?? inv.minStock ?? 5,
        inv.minStockPerWarehouse?.['Gudang Surabaya'] ?? inv.minStock ?? 5,
      ])
    : [
        ['23f83027-23af-43ac-9f09-5b92ddd6420e', 'PL-23F8', 'Pallet Container Box Heavy Duty (ID: 23f83027)', 'Packaging & Logistik', 'Pallet', 'C-01-01', 50, 20, 15, 30, 15, 5, 5, 10],
        ['899276100101', 'EL-001', 'Industrial Barcode Scanner 2D USB', 'Elektronik & Perangkat', 'Unit', 'A-01-01', 45, 18, 10, 25, 15, 5, 5, 8],
        ['899276100102', 'EL-002', 'Thermal Barcode Label Printer 4-inch', 'Elektronik & Perangkat', 'Unit', 'A-01-02', 20, 8, 5, 12, 10, 3, 3, 5],
        ['899276100103', 'PK-001', 'Stretch Film Wrapping Roll 50cm x 300m', 'Packaging & Logistik', 'Roll', 'B-02-01', 120, 45, 30, 80, 40, 15, 10, 25],
        ['899276100104', 'PK-002', 'Heavy Duty Corrugated Carton Box 40x30x25', 'Packaging & Logistik', 'Pcs', 'B-02-02', 350, 150, 100, 200, 100, 40, 30, 60],
      ];

  const wsMaster = XLSX.utils.aoa_to_sheet([masterHeaders, ...masterRows]);
  wsMaster['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 38 }, { wch: 22 }, { wch: 10 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
    { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Master_Barang');

  // 2. Sheet Log_Transaksi
  const logHeaders = [
    'Timestamp',
    'ID_Transaksi',
    'Barcode',
    'SKU',
    'Nama_Barang',
    'Tipe_Scan',
    'Gudang',
    'Lokasi_Rak',
    'Qty',
    'Operator',
    'No_Referensi',
    'Catatan',
  ];

  const logRows = scanLogs.length > 0
    ? scanLogs.map((log) => [
        log.timestamp,
        log.id,
        log.barcode,
        log.sku,
        log.name,
        log.type.toUpperCase(),
        log.warehouse,
        log.binLocation,
        log.quantity,
        log.operatorName,
        log.referenceNo || '-',
        log.notes || '-',
      ])
    : [
        ['2026-10-13 08:35:12', 'scan-101', '899276100101', 'EL-001', 'Industrial Barcode Scanner 2D USB', 'GR', 'Gudang Pusat', 'A-01-01', 10, 'Nazar Prabowo', 'PO-2026-001', 'Barang Masuk Baru'],
        ['2026-10-13 09:12:45', 'scan-102', '899276100102', 'EL-002', 'Thermal Barcode Label Printer 4-inch', 'DO', 'Gudang Pusat', 'A-01-02', 2, 'Nazar Prabowo', 'DO-2026-088', 'Delivery Order Cabang Denpasar'],
        ['2026-10-13 10:05:00', 'scan-103', '899276100103', 'PK-001', 'Stretch Film Wrapping Roll 50cm x 300m', 'OPNAME', 'Gudang Meruya', 'B-02-01', 45, 'Siti Rahma', 'OPN-2026-10-01', 'Opname Rekonsel Fisik Cocok'],
      ];

  const wsLog = XLSX.utils.aoa_to_sheet([logHeaders, ...logRows]);
  wsLog['!cols'] = [
    { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 12 }, { wch: 38 },
    { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 18 }, { wch: 16 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsLog, 'Log_Transaksi');

  // 3. Sheet Kartu_Stok
  const kartuHeaders = [
    'Tanggal',
    'ID_Kartu',
    'SKU',
    'Nama_Barang',
    'Gudang',
    'Tipe_Transaksi',
    'No_Referensi',
    'Qty_Masuk',
    'Qty_Keluar',
    'Saldo_Akhir',
    'Operator',
    'Keterangan',
  ];

  const kartuRows = stockCards.length > 0
    ? stockCards.map((sc) => [
        sc.date,
        sc.id,
        sc.sku,
        sc.name,
        sc.warehouse,
        sc.transactionType,
        sc.referenceNo,
        sc.qtyIn,
        sc.qtyOut,
        sc.balanceAfter,
        sc.operator,
        sc.notes || '-',
      ])
    : [
        ['2026-10-13 08:35', 'sc-101', 'EL-001', 'Industrial Barcode Scanner 2D USB', 'Gudang Pusat', 'GR', 'PO-2026-001', 10, 0, 45, 'Nazar Prabowo', 'Good Receipt dari Supplier'],
        ['2026-10-13 09:12', 'sc-102', 'EL-002', 'Thermal Barcode Label Printer 4-inch', 'Gudang Pusat', 'DO', 'DO-2026-088', 0, 2, 18, 'Nazar Prabowo', 'Pengiriman Customer'],
      ];

  const wsKartu = XLSX.utils.aoa_to_sheet([kartuHeaders, ...kartuRows]);
  wsKartu['!cols'] = [
    { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 38 }, { wch: 18 },
    { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsKartu, 'Kartu_Stok');

  // 4. Sheet Opname_Rekonsel
  const opnameHeaders = [
    'ID_Sesi',
    'Tanggal_Opname',
    'Gudang',
    'SKU',
    'Nama_Barang',
    'Stok_Sistem',
    'Stok_Fisik',
    'Selisih_Qty',
    'Status_Rekonsel',
    'Auditor',
    'Catatan',
  ];

  const opnameRows = [
    ['OPN-2026-10-01', '2026-10-13 10:00', 'Gudang Pusat', 'EL-001', 'Industrial Barcode Scanner 2D USB', 45, 45, 0, 'MATCH', 'Hendra Wijaya', 'Sesuai fisik rak A-01-01'],
    ['OPN-2026-10-01', '2026-10-13 10:15', 'Gudang Pusat', 'EL-002', 'Thermal Barcode Label Printer 4-inch', 20, 20, 0, 'MATCH', 'Hendra Wijaya', 'Sesuai fisik rak A-01-02'],
    ['OPN-2026-10-01', '2026-10-13 10:30', 'Gudang Pusat', 'PK-001', 'Stretch Film Wrapping Roll 50cm x 300m', 120, 118, -2, 'KURANG', 'Hendra Wijaya', 'Selisih 2 roll rusak di packing area'],
  ];

  const wsOpname = XLSX.utils.aoa_to_sheet([opnameHeaders, ...opnameRows]);
  wsOpname['!cols'] = [
    { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 38 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsOpname, 'Opname_Rekonsel');

  // Write file
  const fileName = `Database_ScanGudang_WMS_Master_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Downloads a CSV template for a specific sheet name
 */
export function downloadSheetCSV(sheetName: string) {
  const schema = SPREADSHEET_SCHEMAS.find((s) => s.sheetName === sheetName);
  if (!schema) return;

  const headers = schema.columns.map((c) => c.header);
  const sampleRow = schema.columns.map((c) => {
    const val = String(c.example);
    return val.includes(',') ? `"${val}"` : val;
  });

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), sampleRow.join(',')].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Template_${sheetName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Extracts Google Sheet Document ID from full URL
 */
export function extractGoogleSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Parses CSV or TSV string into 2D string array
 */
export function parseCSVToRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',' || char === '\t') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        // ignore CR
      } else if (char === '\n') {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
  }
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }
  return rows;
}

function cleanNumericValue(val: any): number {
  if (val === undefined || val === null || val === '') return 0;
  let str = String(val).trim();
  if (str.includes('#')) return 0;
  if (/^-?\d+,\d{1,3}$/.test(str)) {
    str = str.replace(',', '.');
  } else {
    str = str.replace(/,/g, '');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/**
 * Converts parsed spreadsheet rows into typed InventoryItems
 */
export function convertRowsToInventoryItems(rows: string[][]): InventoryItem[] {
  if (rows.length < 2) return [];

  const headerRow = rows[0].map((h) => String(h || '').toLowerCase().trim());

  const idxBarcode = headerRow.findIndex((h) => h.includes('barcode') || h.includes('kode_barcode'));
  const idxSku = headerRow.findIndex((h) => h.includes('sku') || h.includes('kode_barang') || h.includes('kode'));
  const idxName = headerRow.findIndex((h) => h.includes('nama') || h.includes('item') || h.includes('deskripsi'));
  const idxCategory = headerRow.findIndex((h) => h.includes('kategori') || h.includes('category'));
  const idxUnit = headerRow.findIndex((h) => h.includes('satuan') || h.includes('unit'));
  const idxBin = headerRow.findIndex((h) => h.includes('rak') || h.includes('bin') || h.includes('lokasi'));

  const idxStokPusat = headerRow.findIndex((h) => h.includes('stok') && (h.includes('pusat') || h.includes('pst')));
  const idxStokMeruya = headerRow.findIndex((h) => h.includes('stok') && (h.includes('meruya') || h.includes('mry')));
  const idxStokDenpasar = headerRow.findIndex((h) => h.includes('stok') && (h.includes('denpasar') || h.includes('dps') || h.includes('bali')));
  const idxStokSurabaya = headerRow.findIndex((h) => h.includes('stok') && (h.includes('surabaya') || h.includes('sby')));
  const idxStokGeneric = headerRow.findIndex((h) => (h === 'stok' || h === 'stock' || h.includes('stok_awal')) && !h.includes('min'));

  const idxMinPusat = headerRow.findIndex((h) => h.includes('min') && (h.includes('pusat') || h.includes('pst')));
  const idxMinMeruya = headerRow.findIndex((h) => h.includes('min') && (h.includes('meruya') || h.includes('mry')));
  const idxMinDenpasar = headerRow.findIndex((h) => h.includes('min') && (h.includes('denpasar') || h.includes('dps') || h.includes('bali')));
  const idxMinSurabaya = headerRow.findIndex((h) => h.includes('min') && (h.includes('surabaya') || h.includes('sby')));
  const idxMinGeneric = headerRow.findIndex((h) => (h.includes('min') || h.includes('minimum')) && !h.includes('pusat') && !h.includes('meruya') && !h.includes('denpasar') && !h.includes('surabaya'));

  const items: InventoryItem[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const barcode = String(row[idxBarcode !== -1 ? idxBarcode : 0] || '').trim();
    const sku = String(row[idxSku !== -1 ? idxSku : 1] || '').trim().toUpperCase();
    const name = String(row[idxName !== -1 ? idxName : 2] || '').trim();

    if (!name && !sku) continue;

    const defaultMin = idxMinGeneric !== -1 ? cleanNumericValue(row[idxMinGeneric]) || 5 : 5;
    const minP = idxMinPusat !== -1 ? (cleanNumericValue(row[idxMinPusat]) || defaultMin) : defaultMin;
    const minM = idxMinMeruya !== -1 ? (cleanNumericValue(row[idxMinMeruya]) || defaultMin) : defaultMin;
    const minD = idxMinDenpasar !== -1 ? (cleanNumericValue(row[idxMinDenpasar]) || defaultMin) : defaultMin;
    const minS = idxMinSurabaya !== -1 ? (cleanNumericValue(row[idxMinSurabaya]) || defaultMin) : defaultMin;

    items.push({
      barcode: barcode || (sku ? sku : 'BC-' + Date.now().toString().slice(-6)),
      sku: sku || 'SKU-' + (i + 100),
      name: name || sku || 'Barang Tanpa Nama',
      category: idxCategory !== -1 && row[idxCategory] ? String(row[idxCategory]).trim() : 'Umum',
      unit: idxUnit !== -1 && row[idxUnit] ? String(row[idxUnit]).trim() : 'PCS',
      defaultBin: idxBin !== -1 && row[idxBin] ? String(row[idxBin]).trim().toUpperCase() : 'A-01',
      stock: {
        'Gudang Pusat': cleanNumericValue(idxStokPusat !== -1 ? row[idxStokPusat] : (idxStokGeneric !== -1 ? row[idxStokGeneric] : 0)),
        'Gudang Meruya': cleanNumericValue(idxStokMeruya !== -1 ? row[idxStokMeruya] : 0),
        'Gudang Denpasar': cleanNumericValue(idxStokDenpasar !== -1 ? row[idxStokDenpasar] : 0),
        'Gudang Surabaya': cleanNumericValue(idxStokSurabaya !== -1 ? row[idxStokSurabaya] : 0),
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

  return items;
}

/**
 * Parses raw text copied directly from Google Sheet (tabs or comma separated)
 */
export function parsePastedSpreadsheetText(text: string): InventoryItem[] {
  const rows = parseCSVToRows(text);
  return convertRowsToInventoryItems(rows);
}

/**
 * Pulls inventory from Google Spreadsheet URL or Webhook endpoint
 */
export async function pullInventoryFromGoogleSpreadsheet(
  config: SpreadsheetSyncConfig
): Promise<{ success: boolean; items?: InventoryItem[]; message: string; method?: string }> {
  const sheetId = extractGoogleSheetId(config.spreadsheetUrl);

  // 1. Try Google Sheets Public CSV Export Endpoint
  if (sheetId) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=Master_Barang`;
      const res = await fetch(gvizUrl, { method: 'GET', headers: { Accept: 'text/csv' } });
      if (res.ok) {
        const csvText = await res.text();
        // Check if response is not an HTML login page
        if (!csvText.includes('<!DOCTYPE html>') && !csvText.includes('<html')) {
          const rows = parseCSVToRows(csvText);
          const items = convertRowsToInventoryItems(rows);
          if (items.length > 0) {
            return {
              success: true,
              items,
              method: 'google_sheets_gviz',
              message: `Berhasil menarik ${items.length} data barang langsung dari Google Spreadsheet!`,
            };
          }
        }
      }
    } catch {
      // Proceed to webhook fallback
    }

    // Try alternate standard CSV export URL
    try {
      const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&sheet=Master_Barang`;
      const res = await fetch(exportUrl, { method: 'GET' });
      if (res.ok) {
        const csvText = await res.text();
        if (!csvText.includes('<!DOCTYPE html>') && !csvText.includes('<html')) {
          const rows = parseCSVToRows(csvText);
          const items = convertRowsToInventoryItems(rows);
          if (items.length > 0) {
            return {
              success: true,
              items,
              method: 'google_sheets_export',
              message: `Berhasil menarik ${items.length} data barang dari Google Spreadsheet!`,
            };
          }
        }
      }
    } catch {
      // Proceed to webhook fallback
    }
  }

  // 2. Try Apps Script Webhook GET
  if (config.webhookUrl && config.webhookUrl.startsWith('http')) {
    try {
      const res = await fetch(config.webhookUrl, { method: 'GET' });
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.data) && json.data.length > 0) {
          const items: InventoryItem[] = json.data.map((row: any, idx: number) => {
            const sku = String(row.SKU || row.sku || `SKU-${idx + 100}`).trim().toUpperCase();
            const barcode = String(row.Barcode || row.barcode || sku).trim();
            const minP = cleanNumericValue(row.Min_Stok_Pusat || row.Min_Stok || 10);
            const minM = cleanNumericValue(row.Min_Stok_Meruya || row.Min_Stok || 5);
            const minD = cleanNumericValue(row.Min_Stok_Denpasar || row.Min_Stok || 5);
            const minS = cleanNumericValue(row.Min_Stok_Surabaya || row.Min_Stok || 5);

            return {
              sku,
              barcode,
              name: String(row.Nama_Barang || row.name || sku).trim(),
              category: String(row.Kategori || row.category || 'Umum').trim(),
              unit: String(row.Satuan || row.unit || 'PCS').trim(),
              defaultBin: String(row.Lokasi_Rak || row.binLocation || 'A-01').trim(),
              stock: {
                'Gudang Pusat': cleanNumericValue(row.Stok_Gudang_Pusat),
                'Gudang Meruya': cleanNumericValue(row.Stok_Gudang_Meruya),
                'Gudang Denpasar': cleanNumericValue(row.Stok_Gudang_Denpasar),
                'Gudang Surabaya': cleanNumericValue(row.Stok_Gudang_Surabaya),
              },
              minStock: minP,
              minStockPerWarehouse: {
                'Gudang Pusat': minP,
                'Gudang Meruya': minM,
                'Gudang Denpasar': minD,
                'Gudang Surabaya': minS,
              },
            };
          });

          return {
            success: true,
            items,
            method: 'apps_script_get',
            message: `Berhasil menarik ${items.length} barang via Google Apps Script!`,
          };
        }
      }
    } catch {
      // Handled in return
    }
  }

  return {
    success: false,
    message:
      'Spreadsheet Anda saat ini masih Private (terkunci). Agar WMS bisa menarik data otomatis: Buka Google Sheet > Klik tombol "Bagikan" (Share) di pojok kanan atas > Ubah Akses Umum menjadi "Siapa saja yang memiliki link dapat melihat (Viewer)".',
  };
}
