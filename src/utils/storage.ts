import {
  WarehouseUser,
  InventoryItem,
  ScanLog,
  OpnameSession,
  InboundOrder,
  OutboundOrder,
  StockCardEntry,
  SpreadsheetSyncConfig,
  AccurateItemRecord,
  WarehouseLocation,
} from '../types/warehouse';
import {
  INITIAL_USERS,
  INITIAL_INVENTORY,
  INITIAL_SCAN_LOGS,
  INITIAL_OPNAME_SESSION,
  INITIAL_INBOUND_ORDERS,
  INITIAL_OUTBOUND_ORDERS,
  INITIAL_STOCK_CARD_ENTRIES,
  INITIAL_SPREADSHEET_CONFIG,
  INITIAL_ACCURATE_RECORDS,
} from '../data/mockWarehouseData';

const KEYS = {
  USERS: 'scangudang_users',
  ACTIVE_USER: 'scangudang_active_user',
  ACTIVE_WAREHOUSE: 'scangudang_active_warehouse',
  INVENTORY: 'scangudang_inventory',
  SCAN_LOGS: 'scangudang_scan_logs',
  OPNAME_SESSIONS: 'scangudang_opname_sessions',
  ACTIVE_OPNAME_ID: 'scangudang_active_opname_id',
  INBOUND_ORDERS: 'scangudang_inbound_orders',
  OUTBOUND_ORDERS: 'scangudang_outbound_orders',
  STOCK_CARDS: 'scangudang_stock_cards',
  SPREADSHEET_CONFIG: 'scangudang_spreadsheet_config',
  ACCURATE_RECORDS: 'scangudang_accurate_records',
  VIEW_MODE: 'scangudang_view_mode', // 'mobile_frame' | 'responsive'
  SOUND_ENABLED: 'scangudang_sound_enabled',
};

export class StorageService {
  private static getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage full or quota exceeded
    }
  }

  // Users
  static getUsers(): WarehouseUser[] {
    const users = this.getItem<WarehouseUser[]>(KEYS.USERS, INITIAL_USERS);
    return users.map((u) => (u.name === 'Budi Santoso' ? { ...u, name: 'Nazar Prabowo' } : u));
  }

  static getActiveUser(): WarehouseUser {
    const user = this.getItem<WarehouseUser>(KEYS.ACTIVE_USER, INITIAL_USERS[0]);
    if (user && user.name === 'Budi Santoso') {
      const updated = { ...user, name: 'Nazar Prabowo' };
      this.setItem(KEYS.ACTIVE_USER, updated);
      return updated;
    }
    return user;
  }

  static setActiveUser(user: WarehouseUser): void {
    this.setItem(KEYS.ACTIVE_USER, user);
  }

  // Active Warehouse
  static getActiveWarehouse(): WarehouseLocation {
    return this.getItem(KEYS.ACTIVE_WAREHOUSE, 'Gudang Pusat');
  }

  static setActiveWarehouse(warehouse: WarehouseLocation): void {
    this.setItem(KEYS.ACTIVE_WAREHOUSE, warehouse);
  }

  // Inventory
  static getInventory(): InventoryItem[] {
    const DB_REV_KEY = 'scangudang_inventory_rev';
    const CURRENT_REV = 'rev_20261112_branch_min_v2';
    const currentStoredRev = typeof window !== 'undefined' ? localStorage.getItem(DB_REV_KEY) : null;

    if (currentStoredRev !== CURRENT_REV) {
      // Direct update to latest uploaded spreadsheet master data
      this.setItem(KEYS.INVENTORY, INITIAL_INVENTORY);
      if (typeof window !== 'undefined') {
        localStorage.setItem(DB_REV_KEY, CURRENT_REV);
      }
      return INITIAL_INVENTORY;
    }

    const stored = this.getItem<InventoryItem[]>(KEYS.INVENTORY, INITIAL_INVENTORY);
    if (!stored || stored.length === 0) return INITIAL_INVENTORY;

    // Check if stored has the user's real uploaded items (e.g. ACCL-, CHML-, BELT-)
    const hasRealItems = stored.some((i) => i.sku.startsWith('ACCL-') || i.sku.startsWith('CHML-') || i.sku.startsWith('BELT-'));
    if (!hasRealItems && INITIAL_INVENTORY.length > 50) {
      // Overwrite old dummy items with the user's real 990+ products
      this.setItem(KEYS.INVENTORY, INITIAL_INVENTORY);
      return INITIAL_INVENTORY;
    }

    const existingSkus = new Set(stored.map((i) => i.sku));
    const missing = INITIAL_INVENTORY.filter((i) => !existingSkus.has(i.sku));
    let result = missing.length > 0 ? [...stored, ...missing] : stored;

    // Check if items need minStockPerWarehouse migration
    const needsMigration = result.some((i) => !i.minStockPerWarehouse);
    if (needsMigration) {
      const initialMap = new Map(INITIAL_INVENTORY.map((it) => [it.sku, it]));
      result = result.map((item) => {
        if (!item.minStockPerWarehouse) {
          const fromInit = initialMap.get(item.sku);
          const base = item.minStock || 5;
          return {
            ...item,
            minStockPerWarehouse: fromInit?.minStockPerWarehouse || {
              'Gudang Pusat': base,
              'Gudang Meruya': Math.max(3, Math.floor(base * 0.5) || 5),
              'Gudang Denpasar': Math.max(3, Math.floor(base * 0.5) || 5),
              'Gudang Surabaya': Math.max(5, Math.floor(base * 0.7) || 5),
            },
          };
        }
        return item;
      });
      this.setItem(KEYS.INVENTORY, result);
    } else if (missing.length > 0) {
      this.setItem(KEYS.INVENTORY, result);
    }

    return result;
  }

  static resetToMasterSpreadsheet(): InventoryItem[] {
    this.setItem(KEYS.INVENTORY, INITIAL_INVENTORY);
    return INITIAL_INVENTORY;
  }

  static saveInventory(items: InventoryItem[]): void {
    this.setItem(KEYS.INVENTORY, items);
  }

  // Scan Logs
  static getScanLogs(): ScanLog[] {
    return this.getItem(KEYS.SCAN_LOGS, INITIAL_SCAN_LOGS);
  }

  static saveScanLogs(logs: ScanLog[]): void {
    this.setItem(KEYS.SCAN_LOGS, logs);
  }

  // Opname
  static getOpnameSessions(): OpnameSession[] {
    return this.getItem(KEYS.OPNAME_SESSIONS, [INITIAL_OPNAME_SESSION]);
  }

  static saveOpnameSessions(sessions: OpnameSession[]): void {
    this.setItem(KEYS.OPNAME_SESSIONS, sessions);
  }

  // Inbound Orders
  static getInboundOrders(): InboundOrder[] {
    return this.getItem(KEYS.INBOUND_ORDERS, INITIAL_INBOUND_ORDERS);
  }

  static saveInboundOrders(orders: InboundOrder[]): void {
    this.setItem(KEYS.INBOUND_ORDERS, orders);
  }

  // Outbound Orders
  static getOutboundOrders(): OutboundOrder[] {
    return this.getItem(KEYS.OUTBOUND_ORDERS, INITIAL_OUTBOUND_ORDERS);
  }

  static saveOutboundOrders(orders: OutboundOrder[]): void {
    this.setItem(KEYS.OUTBOUND_ORDERS, orders);
  }

  // Stock Cards
  static getStockCards(): StockCardEntry[] {
    return this.getItem(KEYS.STOCK_CARDS, INITIAL_STOCK_CARD_ENTRIES);
  }

  static saveStockCards(entries: StockCardEntry[]): void {
    this.setItem(KEYS.STOCK_CARDS, entries);
  }

  // Spreadsheet Config
  static getSpreadsheetConfig(): SpreadsheetSyncConfig {
    return this.getItem(KEYS.SPREADSHEET_CONFIG, INITIAL_SPREADSHEET_CONFIG);
  }

  static saveSpreadsheetConfig(config: SpreadsheetSyncConfig): void {
    this.setItem(KEYS.SPREADSHEET_CONFIG, config);
  }

  // Accurate Records
  static getAccurateRecords(): AccurateItemRecord[] {
    return this.getItem(KEYS.ACCURATE_RECORDS, INITIAL_ACCURATE_RECORDS);
  }

  static saveAccurateRecords(records: AccurateItemRecord[]): void {
    this.setItem(KEYS.ACCURATE_RECORDS, records);
  }

  // View Mode
  static getViewMode(): 'mobile_frame' | 'responsive' {
    return this.getItem(KEYS.VIEW_MODE, 'mobile_frame');
  }

  static setViewMode(mode: 'mobile_frame' | 'responsive'): void {
    this.setItem(KEYS.VIEW_MODE, mode);
  }

  // Sound
  static getSoundEnabled(): boolean {
    return this.getItem(KEYS.SOUND_ENABLED, true);
  }

  static setSoundEnabled(val: boolean): void {
    this.setItem(KEYS.SOUND_ENABLED, val);
  }

  // Reset to Factory Default Data
  static resetAll(): void {
    if (typeof window === 'undefined') return;
    localStorage.clear();
    this.saveInventory(INITIAL_INVENTORY);
    this.saveScanLogs(INITIAL_SCAN_LOGS);
    this.saveOpnameSessions([INITIAL_OPNAME_SESSION]);
    this.saveInboundOrders(INITIAL_INBOUND_ORDERS);
    this.saveOutboundOrders(INITIAL_OUTBOUND_ORDERS);
    this.saveStockCards(INITIAL_STOCK_CARD_ENTRIES);
    this.saveSpreadsheetConfig(INITIAL_SPREADSHEET_CONFIG);
    this.saveAccurateRecords(INITIAL_ACCURATE_RECORDS);
    this.setActiveUser(INITIAL_USERS[0]);
    this.setActiveWarehouse('Gudang Pusat');
  }
}
