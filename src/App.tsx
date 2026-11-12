import React, { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  WarehouseLocation,
  WarehouseUser,
  InventoryItem,
  ScanLog,
  OpnameSession,
  InboundOrder,
  OutboundOrder,
  StockCardEntry,
  StockCardTransactionType,
  SpreadsheetSyncConfig,
  AccurateItemRecord,
  SyncQueueItem,
  getItemMinStock,
} from './types/warehouse';
import { StorageService } from './utils/storage';
import { soundService } from './utils/audio';

import { HeaderNav } from './components/HeaderNav';
import { BottomNavBar, AppTab } from './components/BottomNavBar';
import { MobileFrame } from './components/MobileFrame';
import { BarcodeHelperModal } from './components/BarcodeHelperModal';
import { MobileConnectModal } from './components/MobileConnectModal';
import { AuthModal } from './components/tabs/AuthModal';

import { ScanLogTab } from './components/tabs/ScanLogTab';
import { StockOpnameTab } from './components/tabs/StockOpnameTab';
import { InboundTab } from './components/tabs/InboundTab';
import { OutboundTab } from './components/tabs/OutboundTab';
import { StockCardTab } from './components/tabs/StockCardTab';
import { SyncSpreadsheetTab } from './components/tabs/SyncSpreadsheetTab';
import { AccurateReconciliationTab } from './components/tabs/AccurateReconciliationTab';

export default function App() {
  // Application Data States initialized from localStorage
  const [users] = useState<WarehouseUser[]>(StorageService.getUsers());
  const [activeUser, setActiveUser] = useState<WarehouseUser | null>(
    StorageService.getActiveUser()
  );
  const [activeWarehouse, setActiveWarehouse] = useState<WarehouseLocation>(
    StorageService.getActiveWarehouse()
  );

  const [inventory, setInventory] = useState<InventoryItem[]>(StorageService.getInventory());
  const [scanLogs, setScanLogs] = useState<ScanLog[]>(StorageService.getScanLogs());
  const [opnameSessions, setOpnameSessions] = useState<OpnameSession[]>(
    StorageService.getOpnameSessions()
  );
  const [inboundOrders, setInboundOrders] = useState<InboundOrder[]>(
    StorageService.getInboundOrders()
  );
  const [outboundOrders, setOutboundOrders] = useState<OutboundOrder[]>(
    StorageService.getOutboundOrders()
  );
  const [stockCards, setStockCards] = useState<StockCardEntry[]>(
    StorageService.getStockCards()
  );
  const [spreadsheetConfig, setSpreadsheetConfig] = useState<SpreadsheetSyncConfig>(
    StorageService.getSpreadsheetConfig()
  );
  const [accurateRecords, setAccurateRecords] = useState<AccurateItemRecord[]>(
    StorageService.getAccurateRecords()
  );

  // UI state
  const [activeTab, setActiveTab] = useState<AppTab>('scan_log');
  const [viewMode, setViewMode] = useState<'mobile_frame' | 'responsive'>(
    StorageService.getViewMode()
  );
  const [soundEnabled, setSoundEnabled] = useState<boolean>(StorageService.getSoundEnabled());

  // Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBarcodeHelperOpen, setIsBarcodeHelperOpen] = useState(false);
  const [isMobileConnectOpen, setIsMobileConnectOpen] = useState(false);
  const [externalBarcodeToScan, setExternalBarcodeToScan] = useState<string | null>(null);

  // Sync sound service preference
  useEffect(() => {
    soundService.setSoundEnabled(soundEnabled);
    StorageService.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

  // Persist states
  const handleUpdateWarehouse = (wh: WarehouseLocation) => {
    setActiveWarehouse(wh);
    StorageService.setActiveWarehouse(wh);
  };

  const handleToggleViewMode = () => {
    const next = viewMode === 'mobile_frame' ? 'responsive' : 'mobile_frame';
    setViewMode(next);
    StorageService.setViewMode(next);
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  const handleResetFactoryData = () => {
    const confirmReset = window.confirm(
      'Apakah Anda ingin me-reset semua data gudang ke data bawaan awal?'
    );
    if (!confirmReset) return;

    StorageService.resetAll();
    setInventory(StorageService.getInventory());
    setScanLogs(StorageService.getScanLogs());
    setOpnameSessions(StorageService.getOpnameSessions());
    setInboundOrders(StorageService.getInboundOrders());
    setOutboundOrders(StorageService.getOutboundOrders());
    setStockCards(StorageService.getStockCards());
    setSpreadsheetConfig(StorageService.getSpreadsheetConfig());
    setAccurateRecords(StorageService.getAccurateRecords());
    setActiveUser(StorageService.getActiveUser());
    setActiveWarehouse(StorageService.getActiveWarehouse());
    soundService.playSuccessChime();
  };

  // Auth Handlers (Fase 4)
  const handleLogin = (user: WarehouseUser) => {
    setActiveUser(user);
    StorageService.setActiveUser(user);
    setIsAuthModalOpen(false);
  };

  const handleLogout = () => {
    setActiveUser(null);
    setIsAuthModalOpen(true);
  };

  // Scan Log Handlers (Fase 1)
  const handleSaveScanLog = (newLog: ScanLog) => {
    const updatedLogs = [newLog, ...scanLogs];
    setScanLogs(updatedLogs);
    StorageService.saveScanLogs(updatedLogs);

    // 1. Connect directly to Kartu Stok & Inventory if GR, DO, or Mutasi
    const isGR = newLog.type === 'gr' || newLog.type === 'inbound';
    const isDO = newLog.type === 'do' || newLog.type === 'outbound';
    const isMutasiMasuk = newLog.type === 'mutation_in';
    const isMutasiKeluar = newLog.type === 'mutation_out' || newLog.type === 'relocation';

    if (isGR || isDO || isMutasiMasuk || isMutasiKeluar) {
      const isIncoming = isGR || isMutasiMasuk;
      const qtyIn = isIncoming ? newLog.quantity : 0;
      const qtyOut = isIncoming ? 0 : newLog.quantity;
      const transType: StockCardTransactionType = isGR
        ? 'GR'
        : isMutasiMasuk
        ? 'MUTASI_MASUK'
        : isDO
        ? 'DO'
        : 'MUTASI_KELUAR';

      let newBalance = 0;
      let matchedFound = false;

      // Update Inventory
      const updatedInventory = inventory.map((inv) => {
        if (inv.sku === newLog.sku || inv.barcode === newLog.barcode) {
          matchedFound = true;
          const currentQty = inv.stock[newLog.warehouse] || 0;
          newBalance = isIncoming
            ? currentQty + newLog.quantity
            : Math.max(0, currentQty - newLog.quantity);
          return {
            ...inv,
            stock: {
              ...inv.stock,
              [newLog.warehouse]: newBalance,
            },
          };
        }
        return inv;
      });

      // If item was not in inventory (e.g. newly scanned item), add it to inventory
      let finalInventory = updatedInventory;
      if (!matchedFound) {
        newBalance = isIncoming ? newLog.quantity : 0;
        const newItem: InventoryItem = {
          sku: newLog.sku,
          barcode: newLog.barcode,
          name: newLog.name,
          category: 'Penerimaan Langsung (GR)',
          unit: 'Pcs',
          defaultBin: newLog.binLocation || 'A-01-01',
          stock: {
            'Gudang Pusat': newLog.warehouse === 'Gudang Pusat' ? newBalance : 0,
            'Gudang Meruya': newLog.warehouse === 'Gudang Meruya' ? newBalance : 0,
            'Gudang Denpasar': newLog.warehouse === 'Gudang Denpasar' ? newBalance : 0,
            'Gudang Surabaya': newLog.warehouse === 'Gudang Surabaya' ? newBalance : 0,
          },
          minStock: 10,
        };
        finalInventory = [newItem, ...updatedInventory];
      }

      setInventory(finalInventory);
      StorageService.saveInventory(finalInventory);

      // Create & Add Stock Card Entry
      const newCardEntry: StockCardEntry = {
        id: 'sc-scan-' + Date.now(),
        date: newLog.timestamp.slice(0, 16),
        sku: newLog.sku,
        name: newLog.name,
        warehouse: newLog.warehouse,
        referenceNo: newLog.referenceNo || newLog.barcode,
        transactionType: transType,
        qtyIn,
        qtyOut,
        balanceAfter: newBalance,
        operator: newLog.operatorName || activeUser?.name || 'Nazar Prabowo',
        notes: newLog.notes || (isGR ? 'Scan Barang Masuk (GR)' : isDO ? 'Scan Barang Keluar (DO)' : 'Scan Mutasi Gudang'),
      };

      const updatedCards = [newCardEntry, ...stockCards];
      setStockCards(updatedCards);
      StorageService.saveStockCards(updatedCards);
    }

    // Queue for spreadsheet
    const queueItem: SyncQueueItem = {
      id: 'q-' + Date.now(),
      type: (newLog.type || 'GR').toUpperCase(),
      barcode: newLog.barcode,
      binLocation: newLog.binLocation,
      referenceNo: newLog.referenceNo || newLog.barcode,
      sku: newLog.sku,
      name: newLog.name,
      quantity: newLog.quantity,
      warehouse: newLog.warehouse,
      operator: newLog.operatorName,
      timestamp: newLog.timestamp,
      notes: newLog.notes,
      status: spreadsheetConfig.autoSync ? 'synced' : 'pending',
    };

    const updatedQueue = [queueItem, ...spreadsheetConfig.queue];
    const updatedConfig = {
      ...spreadsheetConfig,
      queue: updatedQueue,
      lastSyncTime: spreadsheetConfig.autoSync
        ? new Date().toISOString().replace('T', ' ').slice(0, 19)
        : spreadsheetConfig.lastSyncTime,
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);
  };

  const handleDeleteScanLog = (id: string) => {
    const updated = scanLogs.filter((l) => l.id !== id);
    setScanLogs(updated);
    StorageService.saveScanLogs(updated);
  };

  // Stock Opname Handlers (Fase 1)
  const handleSaveOpnameSessions = (sessions: OpnameSession[]) => {
    setOpnameSessions(sessions);
    StorageService.saveOpnameSessions(sessions);
  };

  const handleApplyOpnameAdjustment = (session: OpnameSession) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 1. Update Inventory stock
    const updatedInventory = inventory.map((inv) => {
      const counted = session.items.find((it) => it.sku === inv.sku);
      if (counted && counted.lastScannedAt) {
        return {
          ...inv,
          stock: {
            ...inv.stock,
            [session.warehouse]: counted.physicalCount,
          },
        };
      }
      return inv;
    });
    setInventory(updatedInventory);
    StorageService.saveInventory(updatedInventory);

    // 2. Generate stock card entries for variances
    const newCardEntries: StockCardEntry[] = [];
    session.items.forEach((item) => {
      if (item.difference !== 0) {
        newCardEntries.push({
          id: 'sc-opn-' + Date.now() + '-' + item.sku,
          date: now,
          sku: item.sku,
          name: item.name,
          warehouse: session.warehouse,
          referenceNo: session.code,
          transactionType: 'OPNAME_ADJUSTMENT',
          qtyIn: item.difference > 0 ? item.difference : 0,
          qtyOut: item.difference < 0 ? Math.abs(item.difference) : 0,
          balanceAfter: item.physicalCount,
          operator: activeUser?.name || 'Supervisor',
          notes: `Hasil Opname Fisik: Selisih ${item.difference > 0 ? '+' : ''}${item.difference} (${item.notes || 'Penyesuaian'})`,
        });
      }
    });

    const updatedStockCards = [...newCardEntries, ...stockCards];
    setStockCards(updatedStockCards);
    StorageService.saveStockCards(updatedStockCards);

    // 3. Mark session completed
    const updatedSessions = opnameSessions.map((s) =>
      s.id === session.id
        ? {
            ...s,
            status: 'completed' as const,
            completedAt: now,
            approvedBy: activeUser?.name || 'Supervisor Gudang',
          }
        : s
    );
    setOpnameSessions(updatedSessions);
    StorageService.saveOpnameSessions(updatedSessions);

    // 4. Queue spreadsheet sync
    const queueItem: SyncQueueItem = {
      id: 'q-opn-' + Date.now(),
      type: 'OPNAME_RESULT',
      referenceNo: session.code,
      sku: 'ALL_BATCH',
      name: session.title,
      quantity: session.items.reduce((acc, it) => acc + Math.abs(it.difference), 0),
      warehouse: session.warehouse,
      operator: activeUser?.name || 'Supervisor',
      timestamp: now,
      status: spreadsheetConfig.autoSync ? 'synced' : 'pending',
    };
    const updatedConfig = {
      ...spreadsheetConfig,
      queue: [queueItem, ...spreadsheetConfig.queue],
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);

    confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
    alert(`Hasil opname ${session.code} berhasil diterapkan ke Saldo Stok dan Kartu Stok!`);
  };

  // Inbound Handlers (Fase 2)
  const handleSaveInboundOrders = (orders: InboundOrder[]) => {
    setInboundOrders(orders);
    StorageService.saveInboundOrders(orders);
  };

  const handleConfirmInboundReceipt = (order: InboundOrder) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 1. Update inventory
    const updatedInventory = inventory.map((inv) => {
      const receivedLine = order.items.find((it) => it.sku === inv.sku);
      if (receivedLine && receivedLine.receivedQty > 0) {
        const currentQty = inv.stock[order.warehouse] || 0;
        return {
          ...inv,
          stock: {
            ...inv.stock,
            [order.warehouse]: currentQty + receivedLine.receivedQty,
          },
        };
      }
      return inv;
    });
    setInventory(updatedInventory);
    StorageService.saveInventory(updatedInventory);

    // 2. Generate stock card entries
    const newCardEntries: StockCardEntry[] = [];
    order.items.forEach((item) => {
      if (item.receivedQty > 0) {
        const matched = updatedInventory.find((i) => i.sku === item.sku);
        const bal = matched ? matched.stock[order.warehouse] : item.receivedQty;

        newCardEntries.push({
          id: 'sc-in-' + Date.now() + '-' + item.sku,
          date: now,
          sku: item.sku,
          name: item.name,
          warehouse: order.warehouse,
          referenceNo: order.poNumber,
          transactionType: 'INBOUND',
          qtyIn: item.receivedQty,
          qtyOut: 0,
          balanceAfter: bal,
          operator: activeUser?.name || order.receiverOperator,
          notes: `Penerimaan dari ${order.supplier} (SJ: ${order.suratJalanNumber})`,
        });
      }
    });

    const updatedCards = [...newCardEntries, ...stockCards];
    setStockCards(updatedCards);
    StorageService.saveStockCards(updatedCards);

    // 3. Mark PO completed
    const updatedOrders = inboundOrders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: 'completed' as const,
            receivedAt: now,
          }
        : o
    );
    setInboundOrders(updatedOrders);
    StorageService.saveInboundOrders(updatedOrders);

    // 4. Add to sync queue
    const queueItems: SyncQueueItem[] = order.items.map((it) => ({
      id: 'q-in-' + Date.now() + '-' + it.sku,
      type: 'BARANG_MASUK',
      referenceNo: order.poNumber,
      sku: it.sku,
      name: it.name,
      quantity: it.receivedQty,
      warehouse: order.warehouse,
      operator: activeUser?.name || order.receiverOperator,
      timestamp: now,
      status: spreadsheetConfig.autoSync ? 'synced' : 'pending',
    }));

    const updatedConfig = {
      ...spreadsheetConfig,
      queue: [...queueItems, ...spreadsheetConfig.queue],
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    alert(`Barang Masuk untuk ${order.poNumber} berhasil diselesaikan & stok bertambah!`);
  };

  // Outbound Handlers (Fase 2)
  const handleSaveOutboundOrders = (orders: OutboundOrder[]) => {
    setOutboundOrders(orders);
    StorageService.saveOutboundOrders(orders);
  };

  const handleConfirmOutboundDispatch = (order: OutboundOrder) => {
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    // 1. Update inventory
    const updatedInventory = inventory.map((inv) => {
      const pickedLine = order.items.find((it) => it.sku === inv.sku);
      if (pickedLine && pickedLine.pickedQty > 0) {
        const currentQty = inv.stock[order.warehouse] || 0;
        return {
          ...inv,
          stock: {
            ...inv.stock,
            [order.warehouse]: Math.max(0, currentQty - pickedLine.pickedQty),
          },
        };
      }
      return inv;
    });
    setInventory(updatedInventory);
    StorageService.saveInventory(updatedInventory);

    // 2. Generate stock card entries
    const newCardEntries: StockCardEntry[] = [];
    order.items.forEach((item) => {
      if (item.pickedQty > 0) {
        const matched = updatedInventory.find((i) => i.sku === item.sku);
        const bal = matched ? matched.stock[order.warehouse] : 0;

        newCardEntries.push({
          id: 'sc-out-' + Date.now() + '-' + item.sku,
          date: now,
          sku: item.sku,
          name: item.name,
          warehouse: order.warehouse,
          referenceNo: order.doNumber,
          transactionType: 'OUTBOUND',
          qtyIn: 0,
          qtyOut: item.pickedQty,
          balanceAfter: bal,
          operator: activeUser?.name || order.pickerOperator,
          notes: `Pengeluaran ${order.purpose} ke ${order.destination} (${order.driverName})`,
        });
      }
    });

    const updatedCards = [...newCardEntries, ...stockCards];
    setStockCards(updatedCards);
    StorageService.saveStockCards(updatedCards);

    // 3. Mark DO as dispatched
    const updatedOrders = outboundOrders.map((o) =>
      o.id === order.id
        ? {
            ...o,
            status: 'dispatched' as const,
            dispatchedAt: now,
          }
        : o
    );
    setOutboundOrders(updatedOrders);
    StorageService.saveOutboundOrders(updatedOrders);

    // 4. Add to sync queue
    const queueItems: SyncQueueItem[] = order.items.map((it) => ({
      id: 'q-out-' + Date.now() + '-' + it.sku,
      type: 'BARANG_KELUAR',
      referenceNo: order.doNumber,
      sku: it.sku,
      name: it.name,
      quantity: itemToQuantity(it.pickedQty),
      warehouse: order.warehouse,
      operator: activeUser?.name || order.pickerOperator,
      timestamp: now,
      status: spreadsheetConfig.autoSync ? 'synced' : 'pending',
    }));

    function itemToQuantity(qty: number) {
      return qty;
    }

    const updatedConfig = {
      ...spreadsheetConfig,
      queue: [...queueItems, ...spreadsheetConfig.queue],
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    alert(`Barang Keluar untuk ${order.doNumber} berhasil dikonfirmasi & stok berkurang!`);
  };

  // Spreadsheet Sync Handlers (Fase 3)
  const handleUpdateSpreadsheetConfig = (cfg: SpreadsheetSyncConfig) => {
    setSpreadsheetConfig(cfg);
    StorageService.saveSpreadsheetConfig(cfg);
  };

  const handlePushQueueToSheet = () => {
    const updatedQueue = spreadsheetConfig.queue.map((q) => ({
      ...q,
      status: 'synced' as const,
    }));
    const updatedConfig: SpreadsheetSyncConfig = {
      ...spreadsheetConfig,
      queue: updatedQueue,
      lastSyncTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      status: 'connected',
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);

    // Also mark scan logs as synced
    const updatedLogs = scanLogs.map((l) => ({ ...l, syncedToSheet: true }));
    setScanLogs(updatedLogs);
    StorageService.saveScanLogs(updatedLogs);

    confetti({ particleCount: 40, spread: 50, origin: { y: 0.5 } });
  };

  // Manual Stock Card Mutation Handler
  const handleManualStockMutation = (mutation: {
    sku: string;
    transactionType:
      | 'GR'
      | 'DO'
      | 'MUTASI_MASUK'
      | 'MUTASI_KELUAR'
      | 'INBOUND'
      | 'OUTBOUND'
      | 'OPNAME_ADJUSTMENT'
      | 'OPNAME_RECONSEL';
    referenceNo: string;
    notes: string;
    qtyIn: number;
    qtyOut: number;
    warehouse: WarehouseLocation;
    date: string;
  }) => {
    // 1. Update inventory stock
    const updatedInventory = inventory.map((inv) => {
      if (inv.sku === mutation.sku) {
        const cur = inv.stock[mutation.warehouse] || 0;
        const newBalance = Math.max(0, cur + mutation.qtyIn - mutation.qtyOut);
        return {
          ...inv,
          stock: {
            ...inv.stock,
            [mutation.warehouse]: newBalance,
          },
        };
      }
      return inv;
    });
    setInventory(updatedInventory);
    StorageService.saveInventory(updatedInventory);

    // 2. Add Stock Card Entry
    const matched = updatedInventory.find((i) => i.sku === mutation.sku);
    const newBalance = matched ? matched.stock[mutation.warehouse] : 0;
    const newEntry: StockCardEntry = {
      id: 'sc-man-' + Date.now(),
      date: mutation.date,
      sku: mutation.sku,
      name: matched?.name || mutation.sku,
      warehouse: mutation.warehouse,
      referenceNo: mutation.referenceNo,
      transactionType: mutation.transactionType,
      qtyIn: mutation.qtyIn,
      qtyOut: mutation.qtyOut,
      balanceAfter: newBalance,
      operator: activeUser?.name || 'Operator Gudang',
      notes: mutation.notes,
    };
    const updatedCards = [...stockCards, newEntry];
    setStockCards(updatedCards);
    StorageService.saveStockCards(updatedCards);

    // 3. Queue Spreadsheet Sync
    const queueItem: SyncQueueItem = {
      id: 'q-sc-' + Date.now(),
      type: mutation.qtyIn > 0 ? 'BARANG_MASUK' : 'BARANG_KELUAR',
      referenceNo: mutation.referenceNo,
      sku: mutation.sku,
      name: matched?.name || mutation.sku,
      quantity: mutation.qtyIn > 0 ? mutation.qtyIn : mutation.qtyOut,
      warehouse: mutation.warehouse,
      operator: activeUser?.name || 'Operator Gudang',
      timestamp: mutation.date,
      status: spreadsheetConfig.autoSync ? 'synced' : 'pending',
    };
    const updatedConfig = {
      ...spreadsheetConfig,
      queue: [queueItem, ...spreadsheetConfig.queue],
    };
    setSpreadsheetConfig(updatedConfig);
    StorageService.saveSpreadsheetConfig(updatedConfig);
  };

  // Accurate Handlers (Fase 3)
  const handleUpdateAccurateRecords = (records: AccurateItemRecord[]) => {
    setAccurateRecords(records);
    StorageService.saveAccurateRecords(records);
  };

  // Barcode helper tap handler
  const handleSelectBarcodeFromHelper = (barcode: string) => {
    setExternalBarcodeToScan(barcode);
  };

  // Hardware scan button simulation (cycles through available barcodes)
  const handleHardwareScanTrigger = () => {
    const randomItem = inventory[Math.floor(Math.random() * inventory.length)];
    if (randomItem) {
      setExternalBarcodeToScan(randomItem.barcode);
    }
  };

  const pendingSyncCount = spreadsheetConfig.queue.filter((q) => q.status === 'pending').length;

  // Items reaching or dropping below minimum threshold in active warehouse
  const lowStockCount = useMemo(() => {
    return inventory.filter(
      (item) => (item.stock[activeWarehouse] || 0) <= getItemMinStock(item, activeWarehouse)
    ).length;
  }, [inventory, activeWarehouse]);

  return (
    <MobileFrame
      viewMode={viewMode}
      onHardwareScanTrigger={handleHardwareScanTrigger}
    >
      {/* Sticky Header */}
      <HeaderNav
        activeWarehouse={activeWarehouse}
        onChangeWarehouse={handleUpdateWarehouse}
        activeUser={activeUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenBarcodeHelper={() => setIsBarcodeHelperOpen(true)}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onResetFactoryData={handleResetFactoryData}
        lowStockCount={lowStockCount}
        onOpenStockCard={() => setActiveTab('stock_card')}
        onOpenMobileConnect={() => setIsMobileConnectOpen(true)}
      />

      {/* Main Tab Viewport */}
      <main className="flex-1 p-3 pb-24 overflow-y-auto">
        {activeTab === 'scan_log' && (
          <ScanLogTab
            inventory={inventory}
            scanLogs={scanLogs}
            onSaveScanLog={handleSaveScanLog}
            onDeleteScanLog={handleDeleteScanLog}
            activeWarehouse={activeWarehouse}
            activeUser={activeUser || users[0]}
            onOpenTestBarcodes={() => setIsBarcodeHelperOpen(true)}
            externalBarcodeToScan={externalBarcodeToScan}
            onClearExternalBarcode={() => setExternalBarcodeToScan(null)}
            onNavigateToInbound={() => setActiveTab('inbound')}
            onNavigateToOutbound={() => setActiveTab('outbound')}
            onNavigateToOpname={() => setActiveTab('opname')}
            onNavigateToStockCard={() => setActiveTab('stock_card')}
          />
        )}

        {activeTab === 'opname' && (
          <StockOpnameTab
            inventory={inventory}
            opnameSessions={opnameSessions}
            onSaveOpnameSessions={handleSaveOpnameSessions}
            activeWarehouse={activeWarehouse}
            activeUser={activeUser || users[0]}
            onOpenTestBarcodes={() => setIsBarcodeHelperOpen(true)}
            onApplyOpnameAdjustment={handleApplyOpnameAdjustment}
            externalBarcodeToScan={externalBarcodeToScan}
            onClearExternalBarcode={() => setExternalBarcodeToScan(null)}
          />
        )}

        {activeTab === 'inbound' && (
          <InboundTab
            inventory={inventory}
            inboundOrders={inboundOrders}
            onSaveInboundOrders={handleSaveInboundOrders}
            onConfirmInboundReceipt={handleConfirmInboundReceipt}
            activeWarehouse={activeWarehouse}
            activeUser={activeUser || users[0]}
            onOpenTestBarcodes={() => setIsBarcodeHelperOpen(true)}
            externalBarcodeToScan={externalBarcodeToScan}
            onClearExternalBarcode={() => setExternalBarcodeToScan(null)}
          />
        )}

        {activeTab === 'outbound' && (
          <OutboundTab
            inventory={inventory}
            outboundOrders={outboundOrders}
            onSaveOutboundOrders={handleSaveOutboundOrders}
            onConfirmOutboundDispatch={handleConfirmOutboundDispatch}
            activeWarehouse={activeWarehouse}
            activeUser={activeUser || users[0]}
            onOpenTestBarcodes={() => setIsBarcodeHelperOpen(true)}
            externalBarcodeToScan={externalBarcodeToScan}
            onClearExternalBarcode={() => setExternalBarcodeToScan(null)}
          />
        )}

        {activeTab === 'stock_card' && (
          <StockCardTab
            inventory={inventory}
            stockCards={stockCards}
            activeWarehouse={activeWarehouse}
            onChangeWarehouse={handleUpdateWarehouse}
            onAddManualMutation={handleManualStockMutation}
          />
        )}

        {activeTab === 'sync' && (
          <SyncSpreadsheetTab
            config={spreadsheetConfig}
            onUpdateConfig={handleUpdateSpreadsheetConfig}
            onPushQueueToSheet={handlePushQueueToSheet}
            onUpdateInventory={(updatedItems) => {
              setInventory(updatedItems);
              StorageService.saveInventory(updatedItems);
            }}
            inventory={inventory}
            scanLogs={scanLogs}
            stockCards={stockCards}
          />
        )}

        {activeTab === 'accurate' && (
          <AccurateReconciliationTab
            inventory={inventory}
            accurateRecords={accurateRecords}
            onUpdateAccurateRecords={handleUpdateAccurateRecords}
            activeWarehouse={activeWarehouse}
          />
        )}
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <BottomNavBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        pendingSyncCount={pendingSyncCount}
      />

      {/* Global Modals */}
      <BarcodeHelperModal
        isOpen={isBarcodeHelperOpen}
        onClose={() => setIsBarcodeHelperOpen(false)}
        items={inventory}
        onSelectBarcode={handleSelectBarcodeFromHelper}
        activeWarehouse={activeWarehouse}
        onSaveNewItem={(newItem) => {
          const updated = [newItem, ...inventory.filter((i) => i.sku !== newItem.sku && i.barcode !== newItem.barcode)];
          setInventory(updated);
          StorageService.saveInventory(updated);
        }}
        onImportItems={(importedItems, replaceAll) => {
          let updated: InventoryItem[];
          if (replaceAll) {
            updated = importedItems;
          } else {
            const existingSkus = new Set(importedItems.map((i) => i.sku));
            const existingBarcodes = new Set(importedItems.map((i) => i.barcode));
            const preserved = inventory.filter(
              (i) => !existingSkus.has(i.sku) && !existingBarcodes.has(i.barcode)
            );
            updated = [...importedItems, ...preserved];
          }
          setInventory(updated);
          StorageService.saveInventory(updated);
        }}
        onDeleteItem={(sku) => {
          const updated = inventory.filter((i) => i.sku !== sku);
          setInventory(updated);
          StorageService.saveInventory(updated);
        }}
        onOpenSpreadsheetTab={() => {
          setIsBarcodeHelperOpen(false);
          setActiveTab('sync');
        }}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        users={users}
        activeUser={activeUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />

      <MobileConnectModal
        isOpen={isMobileConnectOpen}
        onClose={() => setIsMobileConnectOpen(false)}
      />
    </MobileFrame>
  );
}
