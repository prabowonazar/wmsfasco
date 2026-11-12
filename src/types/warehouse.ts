export type WarehouseLocation =
  | 'Gudang Pusat'
  | 'Gudang Meruya'
  | 'Gudang Denpasar'
  | 'Gudang Surabaya';

export type UserRole = 'operator' | 'admin' | 'supervisor';

export interface WarehouseUser {
  id: string;
  nik: string;
  name: string;
  role: UserRole;
  pin: string;
  avatar: string;
  phone: string;
}

export interface InventoryItem {
  sku: string;
  barcode: string;
  name: string;
  category: string;
  unit: string;
  defaultBin: string;
  costPrice?: number;
  stock: Record<WarehouseLocation, number>;
  minStock: number;
  minStockPerWarehouse?: Partial<Record<WarehouseLocation, number>>;
}

export function getItemMinStock(item?: InventoryItem | null, warehouse?: WarehouseLocation): number {
  if (!item) return 5;
  if (warehouse && item.minStockPerWarehouse && typeof item.minStockPerWarehouse[warehouse] === 'number') {
    return item.minStockPerWarehouse[warehouse]!;
  }
  if (typeof item.minStock === 'number') {
    return item.minStock;
  }
  return 5;
}

export type ScanLogType =
  | 'general_scan'
  | 'gr'
  | 'do'
  | 'opname'
  | 'mutation_in'
  | 'mutation_out'
  | 'inbound'
  | 'outbound'
  | 'relocation';

export interface ScanLog {
  id: string;
  timestamp: string;
  barcode: string;
  sku: string;
  name: string;
  type: ScanLogType;
  binLocation: string;
  lotNumber?: string;
  quantity: number;
  notes: string;
  operatorId: string;
  operatorName: string;
  warehouse: WarehouseLocation;
  referenceNo?: string;
  syncedToSheet: boolean;
}

export interface OpnameSession {
  id: string;
  code: string;
  title: string;
  warehouse: WarehouseLocation;
  targetBinZone: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAt: string;
  completedAt?: string;
  operatorName: string;
  items: OpnameItemCount[];
  approvedBy?: string;
}

export interface OpnameItemCount {
  sku: string;
  barcode: string;
  name: string;
  binLocation: string;
  systemStock: number;
  physicalCount: number;
  difference: number;
  costPrice?: number;
  lastScannedAt?: string;
  notes?: string;
}

export interface InboundOrder {
  id: string;
  poNumber: string;
  supplier: string;
  orderDate: string;
  warehouse: WarehouseLocation;
  status: 'draft' | 'receiving' | 'completed';
  receivedAt?: string;
  items: InboundItem[];
  suratJalanNumber: string;
  receiverOperator: string;
  notes: string;
}

export interface InboundItem {
  sku: string;
  barcode: string;
  name: string;
  orderedQty: number;
  receivedQty: number;
  unit: string;
  binLocation: string;
}

export interface OutboundOrder {
  id: string;
  doNumber: string;
  destination: string;
  customerName: string;
  orderDate: string;
  warehouse: WarehouseLocation;
  status: 'draft' | 'picking' | 'dispatched';
  dispatchedAt?: string;
  purpose: 'Penjualan' | 'Transfer Cabang' | 'Retur Supplier' | 'Pemakaian Internal';
  driverName: string;
  vehicleNumber: string;
  items: OutboundItem[];
  pickerOperator: string;
  notes: string;
}

export interface OutboundItem {
  sku: string;
  barcode: string;
  name: string;
  requestedQty: number;
  pickedQty: number;
  unit: string;
}

export type StockCardTransactionType =
  | 'GR'
  | 'DO'
  | 'OPNAME_RECONSEL'
  | 'MUTASI_MASUK'
  | 'MUTASI_KELUAR'
  | 'INBOUND'
  | 'OUTBOUND'
  | 'OPNAME_ADJUSTMENT'
  | 'RELOCATION';

export interface StockCardEntry {
  id: string;
  date: string;
  sku: string;
  name: string;
  warehouse: WarehouseLocation;
  referenceNo: string;
  transactionType: StockCardTransactionType;
  qtyIn: number;
  qtyOut: number;
  balanceAfter: number;
  operator: string;
  notes: string;
}

export interface SpreadsheetSyncConfig {
  spreadsheetUrl: string;
  webhookUrl?: string;
  sheetId: string;
  activeSheetName: string;
  autoSync: boolean;
  lastSyncTime?: string;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  queue: SyncQueueItem[];
}

export interface SyncQueueItem {
  id: string;
  type:
    | 'SCAN_LOG'
    | 'GR'
    | 'DO'
    | 'OPNAME'
    | 'MUTASI_MASUK'
    | 'MUTASI_KELUAR'
    | 'BARANG_MASUK'
    | 'BARANG_KELUAR'
    | 'OPNAME_RESULT'
    | string;
  barcode?: string;
  binLocation?: string;
  referenceNo: string;
  sku: string;
  name: string;
  quantity: number;
  warehouse: string;
  operator: string;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
  notes?: string;
}

export interface AccurateItemRecord {
  sku: string;
  name: string;
  category: string;
  unit: string;
  accurateBookQty: number;
  costPerUnit: number;
  lastUpdated: string;
}

export interface AccurateReconciliationResult {
  sku: string;
  name: string;
  unit: string;
  costPerUnit: number;
  accurateQty: number;
  physicalWarehouseQty: number;
  varianceQty: number; // physical - accurate
  varianceValue: number; // varianceQty * costPerUnit
  status: 'MATCH' | 'SURPLUS' | 'DEFICIT';
}
