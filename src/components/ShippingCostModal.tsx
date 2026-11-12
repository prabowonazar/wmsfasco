import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  Truck,
  Package,
  Layers,
  MapPin,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { IsometricPackageBox } from './IsometricPackageBox';
import { soundService } from '../utils/audio';

interface ShippingCostModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrigin?: string;
  defaultDestination?: string;
  onProceedToDeliveryOrder?: (data: {
    origin: string;
    destination: string;
    weight: number;
    dimensions: { length: number; width: number; height: number };
    packageType: string;
    estimatedCost: number;
  }) => void;
}

export const ShippingCostModal: React.FC<ShippingCostModalProps> = ({
  isOpen,
  onClose,
  defaultOrigin = 'Senopati, Jakarta Selatan',
  defaultDestination = 'Seturan, Sleman',
  onProceedToDeliveryOrder,
}) => {
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [weight, setWeight] = useState<number>(3);
  const [selectedType, setSelectedType] = useState<'small' | 'cube' | 'flat'>('cube');
  const [dimensions, setDimensions] = useState({ length: 20, width: 20, height: 20 });
  const [showPriceResult, setShowPriceResult] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<'regular' | 'express' | 'cargo'>('regular');

  if (!isOpen) return null;

  // Package types configuration matching mockup
  const packageTypes = [
    { id: 'small' as const, label: 'Small Box', desc: 'Max 2 Kg', size: 'small' as const },
    { id: 'cube' as const, label: 'Medium Cube', desc: 'Max 10 Kg', size: 'cube' as const },
    { id: 'flat' as const, label: 'Flat Box', desc: 'Max 5 Kg', size: 'flat' as const },
  ];

  // Calculate volumetric & weight-based shipping rates
  const volumeWeight = (dimensions.length * dimensions.width * dimensions.height) / 5000;
  const billableWeight = Math.max(weight, volumeWeight);
  const baseRate = 14000; // IDR per kg
  const estimatedRegular = Math.round(billableWeight * baseRate);
  const estimatedExpress = Math.round(billableWeight * baseRate * 1.6);
  const estimatedCargo = Math.round(Math.max(10, billableWeight) * 8500);

  const handleCheckPrice = () => {
    soundService.playSuccessChime();
    setShowPriceResult(true);
  };

  const handlePackageTypeSelect = (type: 'small' | 'cube' | 'flat') => {
    setSelectedType(type);
    if (type === 'small') setDimensions({ length: 15, width: 12, height: 10 });
    if (type === 'cube') setDimensions({ length: 20, width: 20, height: 20 });
    if (type === 'flat') setDimensions({ length: 30, width: 25, height: 8 });
  };

  return (
    <div className="w-full min-h-screen bg-[#1C1D21] text-zinc-100 flex flex-col font-sans select-none animate-in fade-in">
      {/* Top Dark Header (Screen 2 Top) */}
      <div className="px-5 pt-3 pb-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white text-zinc-950 flex items-center justify-center hover:bg-zinc-200 transition-colors shadow-md cursor-pointer shrink-0"
          title="Kembali ke Dashboard"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <h1 className="text-base font-bold text-white tracking-wide">
          Shipping Cost
        </h1>

        <div className="w-10 h-10" />
      </div>

      {/* Details Container (From & To) */}
      <div className="px-5 pb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold text-white">Details</span>
          <span className="text-[11px] text-zinc-400 font-medium">Asal & Tujuan</span>
        </div>

        <div className="bg-[#292B2F] border border-zinc-700/50 rounded-2xl p-4 space-y-3.5 shadow-md">
          {/* Origin */}
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#C6F232] mt-1.5 shrink-0 shadow-[0_0_8px_#C6F232]" />
            <div className="flex-1">
              <span className="text-[11px] text-zinc-400 block font-medium">From</span>
              <input
                type="text"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-[#C6F232]/50 py-0.5"
              />
            </div>
          </div>

          <div className="h-px bg-zinc-700/40 ml-5" />

          {/* Destination */}
          <div className="flex items-start gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
            <div className="flex-1">
              <span className="text-[11px] text-zinc-400 block font-medium">To</span>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full bg-transparent text-sm font-semibold text-white focus:outline-none border-b border-transparent focus:border-[#C6F232]/50 py-0.5"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet White Section (Screen 2 Bottom) */}
      <div className="flex-1 bg-white text-zinc-900 rounded-t-[2.5rem] p-6 shadow-2xl space-y-5 flex flex-col justify-between">
        <div className="space-y-5">
          {/* Drag Pill Handle */}
          <div className="w-12 h-1 bg-zinc-300 rounded-full mx-auto" />

          {/* Weight Input */}
          <div>
            <label className="text-xs font-bold text-zinc-900 block mb-1.5">
              Weight
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0.1"
                step="0.5"
                value={weight}
                onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
                className="w-full bg-[#F3F4F6] border-0 rounded-2xl py-3 px-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C6F232]"
              />
              <span className="absolute right-4 text-xs font-bold text-zinc-500">
                Kg
              </span>
            </div>
          </div>

          {/* Select Type Package */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-zinc-900">
                Select Type Package
              </label>
              <span className="text-[11px] text-zinc-500">3 Pilihan Dimensi</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {packageTypes.map((type) => {
                const isSelected = selectedType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => handlePackageTypeSelect(type.id)}
                    className={`relative p-2.5 rounded-2xl border transition-all flex flex-col items-center justify-between h-28 cursor-pointer ${
                      isSelected
                        ? 'bg-[#24262A] border-[#24262A] text-white shadow-lg ring-2 ring-[#C6F232]/50'
                        : 'bg-[#F9FAFB] border-zinc-200/80 text-zinc-700 hover:border-zinc-300'
                    }`}
                  >
                    {/* Top Right Check Badge for Selected (Matching Mockup) */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#C6F232] text-black flex items-center justify-center text-[10px] font-bold shadow-sm">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Isometric 3D Box Illustration */}
                    <div className="flex-1 flex items-center justify-center my-1">
                      <IsometricPackageBox
                        size={type.size}
                        className="w-16 h-16"
                        hasLabel={true}
                        hasTape={true}
                      />
                    </div>

                    <span className="text-[10px] font-bold truncate max-w-full">
                      {type.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dimension Inputs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-zinc-900">Dimension</label>
              <span className="text-[10px] text-zinc-400 font-mono">P x L x T (Cm)</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="relative flex items-center">
                <input
                  type="number"
                  value={dimensions.length}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, length: parseInt(e.target.value) || 10 })
                  }
                  className="w-full bg-[#F3F4F6] rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C6F232]"
                />
                <span className="absolute right-3 text-[11px] font-semibold text-zinc-500">
                  Cm
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  type="number"
                  value={dimensions.width}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, width: parseInt(e.target.value) || 10 })
                  }
                  className="w-full bg-[#F3F4F6] rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C6F232]"
                />
                <span className="absolute right-3 text-[11px] font-semibold text-zinc-500">
                  Cm
                </span>
              </div>

              <div className="relative flex items-center">
                <input
                  type="number"
                  value={dimensions.height}
                  onChange={(e) =>
                    setDimensions({ ...dimensions, height: parseInt(e.target.value) || 10 })
                  }
                  className="w-full bg-[#F3F4F6] rounded-xl py-2.5 px-3 text-xs font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#C6F232]"
                />
                <span className="absolute right-3 text-[11px] font-semibold text-zinc-500">
                  Cm
                </span>
              </div>
            </div>
          </div>

          {/* Calculated Price Result Card (if checked) */}
          {showPriceResult && (
            <div className="p-3.5 bg-[#F9FAFB] border border-zinc-200 rounded-2xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-900 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-zinc-700" /> Estimasi Tarif Ekspedisi:
                </span>
                <span className="text-[11px] font-mono text-zinc-500">
                  Berat Tagihan: {billableWeight.toFixed(1)} Kg
                </span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedCourier('regular')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedCourier === 'regular'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white border-zinc-200 text-zinc-700'
                  }`}
                >
                  <span className="text-[10px] block opacity-70">Reguler</span>
                  <span className="text-xs font-extrabold text-[#C6F232]">
                    Rp {estimatedRegular.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCourier('express')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedCourier === 'express'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white border-zinc-200 text-zinc-700'
                  }`}
                >
                  <span className="text-[10px] block opacity-70">Express</span>
                  <span className="text-xs font-extrabold text-[#C6F232]">
                    Rp {estimatedExpress.toLocaleString()}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCourier('cargo')}
                  className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                    selectedCourier === 'cargo'
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white border-zinc-200 text-zinc-700'
                  }`}
                >
                  <span className="text-[10px] block opacity-70">Kargo</span>
                  <span className="text-xs font-extrabold text-[#C6F232]">
                    Rp {estimatedCargo.toLocaleString()}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Button: Check Price / Lanjut (Electric Lime pill button) */}
        <div className="pt-2">
          {!showPriceResult ? (
            <button
              type="button"
              onClick={handleCheckPrice}
              className="w-full py-4 bg-[#C6F232] hover:bg-[#B8E62B] active:scale-98 text-zinc-950 font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Check Price</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onProceedToDeliveryOrder) {
                  onProceedToDeliveryOrder({
                    origin,
                    destination,
                    weight: billableWeight,
                    dimensions,
                    packageType: selectedType,
                    estimatedCost:
                      selectedCourier === 'regular'
                        ? estimatedRegular
                        : selectedCourier === 'express'
                        ? estimatedExpress
                        : estimatedCargo,
                  });
                }
                onClose();
              }}
              className="w-full py-4 bg-[#C6F232] hover:bg-[#B8E62B] active:scale-98 text-zinc-950 font-extrabold text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <span>Buat Delivery Order (DO) Sekarang</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
