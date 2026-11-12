import React, { useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  MapPin,
  Truck,
  CheckCircle2,
  Clock,
  Phone,
  Home,
  Navigation,
  ShieldCheck,
  ChevronRight,
  Share2,
} from 'lucide-react';
import { soundService } from '../utils/audio';

interface LiveTrackingMapViewProps {
  onBack: () => void;
  trackingNumber?: string;
  activeWarehouse?: string;
  destination?: string;
  onCallDriver?: () => void;
}

export const LiveTrackingMapView: React.FC<LiveTrackingMapViewProps> = ({
  onBack,
  trackingNumber = '#TKP01-EUFD24C',
  activeWarehouse = 'Gudang Pusat, Yogyakarta',
  destination = 'Condong Catur, Yogyakarta',
  onCallDriver,
}) => {
  const [activeSegment, setActiveSegment] = useState<'tracking' | 'shipping'>('tracking');
  const [courierLocation, setCourierLocation] = useState({ x: 260, y: 140 });

  return (
    <div className="relative w-full min-h-screen bg-[#F0F2F5] text-zinc-900 flex flex-col font-sans select-none overflow-hidden animate-in fade-in">
      {/* Map View Background (Screen 3 Top) */}
      <div className="relative h-[48vh] w-full bg-[#E5E9EC] overflow-hidden">
        {/* Vector SVG Map Grids & Streets */}
        <svg
          viewBox="0 0 400 350"
          className="w-full h-full object-cover"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Land Blocks / Urban Grids */}
          <rect x="0" y="0" width="400" height="350" fill="#E8EBEE" />
          <path d="M-20 60 L120 40 L160 120 L-20 140 Z" fill="#DEE3E8" />
          <path d="M180 30 L320 20 L350 90 L190 110 Z" fill="#DEE3E8" />
          <path d="M30 180 L180 160 L190 280 L20 290 Z" fill="#DEE3E8" />
          <path d="M220 160 L380 140 L390 260 L230 270 Z" fill="#DEE3E8" />

          {/* Park Green Areas */}
          <path d="M50 80 Q90 60 110 100 T60 120 Z" fill="#D3E6D0" />
          <path d="M250 180 Q300 160 320 210 T260 230 Z" fill="#D3E6D0" />

          {/* Secondary Light Streets */}
          <path d="M-20 100 L420 80" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M-20 220 L420 200" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M120 -20 L140 370" stroke="#FFFFFF" strokeWidth="6" />
          <path d="M280 -20 L300 370" stroke="#FFFFFF" strokeWidth="7" />
          <path d="M60 150 L200 130 L210 240" stroke="#FFFFFF" strokeWidth="5" />

          {/* Street Name Typography (Matching Screenshot: "Jalan R...", "SD Negeri Johar Baru", "Pasar Johar") */}
          <text
            x="330"
            y="65"
            transform="rotate(65 330,65)"
            fill="#8E99A4"
            fontSize="9"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Jalan Raya Seturan
          </text>
          <text
            x="240"
            y="170"
            transform="rotate(-25 240,170)"
            fill="#8E99A4"
            fontSize="8"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            SD Negeri Condong Catur 03
          </text>
          <text
            x="245"
            y="265"
            transform="rotate(-22 245,265)"
            fill="#8E99A4"
            fontSize="8.5"
            fontWeight="600"
            fontFamily="sans-serif"
          >
            Pasar Tradisional Sleman
          </text>

          {/* Main Delivery Polyline Route (Bold Dark Gray / Charcoal matching mockup) */}
          <path
            d="M-10 180 Q60 170 120 160 L240 145 L255 145 L320 130 L320 80 L335 75"
            fill="none"
            stroke="#1C1D21"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Route Start Point (Warehouse) */}
          <circle cx="20" cy="177" r="5" fill="#C6F232" stroke="#1C1D21" strokeWidth="2" />

          {/* Delivery Van / Courier Pin (Mid Route with Lime badge) */}
          <g transform="translate(245, 130)">
            <circle cx="15" cy="15" r="14" fill="#C6F232" stroke="#1C1D21" strokeWidth="2.5" />
            <path
              d="M9 16 L12 11 L18 11 L20 14 L22 14 L22 18 L8 18 L8 16 Z"
              fill="#1C1D21"
            />
            <circle cx="11" cy="18" r="1.8" fill="#C6F232" stroke="#1C1D21" strokeWidth="1" />
            <circle cx="19" cy="18" r="1.8" fill="#C6F232" stroke="#1C1D21" strokeWidth="1" />
          </g>

          {/* Destination Pin (Home icon inside Dark Circle with Lime Ring - matching mockup) */}
          <g transform="translate(325, 60)">
            <circle cx="15" cy="15" r="16" fill="#1C1D21" stroke="#C6F232" strokeWidth="3" />
            {/* House Icon */}
            <path
              d="M9 17 L15 11 L21 17 L21 21 L9 21 Z"
              fill="#C6F232"
            />
          </g>
        </svg>

        {/* Floating Top Controls */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Target GPS Locate Button (Right side matching mockup) */}
          <button
            type="button"
            onClick={() => {
              soundService.playSuccessChime();
              setCourierLocation({ x: 260, y: 140 });
            }}
            className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-lg hover:bg-zinc-100 transition-colors cursor-pointer"
            title="Pusatkan Lokasi Kurir"
          >
            <Crosshair className="w-5 h-5 stroke-[2]" />
          </button>
        </div>
      </div>

      {/* Bottom Sheet Drawer (Screen 3 Bottom - Dark Charcoal Sheet) */}
      <div className="flex-1 bg-[#1C1D21] text-white rounded-t-[2.5rem] p-6 shadow-2xl flex flex-col justify-between -mt-6 z-10 space-y-4">
        {/* Drag Pill */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto -mt-2" />

        {/* Segmented Pills Tab (Tracking Detail vs Shipping Detail) */}
        <div className="flex items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveSegment('tracking')}
            className={`px-5 py-2.5 rounded-full text-xs transition-all cursor-pointer ${
              activeSegment === 'tracking'
                ? 'bg-[#C6F232] text-zinc-950 font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            Tracking Detail
          </button>

          <button
            type="button"
            onClick={() => setActiveSegment('shipping')}
            className={`px-5 py-2.5 rounded-full text-xs transition-all cursor-pointer ${
              activeSegment === 'shipping'
                ? 'bg-[#C6F232] text-zinc-950 font-extrabold shadow-md'
                : 'text-zinc-400 hover:text-white font-medium'
            }`}
          >
            Shipping Detail
          </button>
        </div>

        {activeSegment === 'tracking' ? (
          <div className="space-y-4">
            {/* Tracking ID Header */}
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                Tracking ID
              </span>
              <h2 className="text-base font-extrabold text-white tracking-wide mt-0.5">
                {trackingNumber}
              </h2>
            </div>

            {/* Current Location */}
            <div>
              <span className="text-[11px] text-zinc-400 block font-medium">
                Current Location
              </span>
              <p className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-[#C6F232]" />
                {destination}
              </p>
            </div>

            {/* Timeline Steps (Matching Mockup exactly) */}
            <div className="space-y-4 pt-1">
              {/* Step 1: Arrived */}
              <div className="flex items-start gap-3 relative">
                {/* Connecting Line */}
                <div className="absolute left-[7px] top-[18px] bottom-[-16px] w-[2px] bg-zinc-700" />

                <div className="w-4 h-4 rounded-full bg-[#C6F232] flex items-center justify-center mt-0.5 shrink-0 shadow-[0_0_8px_#C6F232]">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                </div>

                <div className="flex-1 flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">
                      The order has arrived at its destination
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Received by Casey Kaspol (Gudang Staff)
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium shrink-0 ml-2">
                    February 14, 23
                  </span>
                </div>
              </div>

              {/* Step 2: Shipped */}
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center mt-0.5 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                </div>

                <div className="flex-1 flex items-start justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200 leading-tight">
                      Order has been shipped.
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Your order is in the process of being sent by the courier.
                    </p>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-medium shrink-0 ml-2">
                    February 10, 23
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Shipping Detail Segment */
          <div className="space-y-3 bg-[#24262A] p-4 rounded-2xl border border-zinc-700/50 text-xs">
            <div className="flex justify-between pb-2 border-b border-zinc-700/40">
              <span className="text-zinc-400">Ekspedisi:</span>
              <span className="font-bold text-white">JNE Express Regular</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-zinc-700/40">
              <span className="text-zinc-400">No. Surat Jalan (DO):</span>
              <span className="font-mono text-[#C6F232] font-bold">DO-2026-088</span>
            </div>
            <div className="flex justify-between pb-2 border-b border-zinc-700/40">
              <span className="text-zinc-400">Estimasi Tiba:</span>
              <span className="font-bold text-white">Hari Ini, 14:30 WIB</span>
            </div>
            <div className="flex justify-between items-center pt-1">
              <span className="text-zinc-400">Kurir Pengantar:</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">Bambang S.</span>
                <button
                  type="button"
                  onClick={() => {
                    soundService.playSuccessChime();
                    if (onCallDriver) onCallDriver();
                  }}
                  className="p-1.5 bg-[#C6F232] text-black rounded-lg hover:bg-[#B8E62B] transition-colors cursor-pointer"
                  title="Hubungi Kurir"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onBack}
            className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-98 text-white font-bold text-xs rounded-2xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-zinc-700"
          >
            <span>Kembali ke Home Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
