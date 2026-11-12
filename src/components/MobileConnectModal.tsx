import React, { useState } from 'react';
import { X, Smartphone, QrCode, Copy, Check, ExternalLink, Camera, Wifi, ShieldCheck } from 'lucide-react';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // The Shared Public URL is accessible without internal Google AI Studio authentication
  const publicSharedUrl = 'https://ais-pre-jkpzzn36yllj7km6wwvuhc-529326938624.asia-southeast1.run.app';
  
  // High quality QR code generator for the shared public URL
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(publicSharedUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(publicSharedUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Buka Aplikasi di HP / Smartphone</h3>
              <p className="text-[11px] text-zinc-400">Scan QR Code atau bagikan link ke browser HP</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Step 1: QR Code Card */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col items-center text-center">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> Cara 1: Scan Kamera HP
            </span>
            <p className="text-xs text-zinc-400 mb-3">
              Arahkan kamera smartphone Anda langsung ke QR code ini untuk membuka aplikasi:
            </p>
            
            {/* QR Image Box */}
            <div className="p-2.5 bg-white rounded-xl shadow-lg border-2 border-amber-500/40 inline-block mb-2">
              <img
                src={qrCodeUrl}
                alt="QR Code Mobile Link"
                className="w-44 h-44 object-contain rounded"
              />
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              Bisa langsung via Kamera Bawaan HP / Google Lens / Browser Chrome
            </span>
          </div>

          {/* Step 2: Direct Link */}
          <div className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" /> Cara 2: Salin URL / Buka di Browser HP
            </span>
            <p className="text-xs text-zinc-400">
              Gunakan URL Publik Resmi di bawah ini (bebas login AI Studio):
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicSharedUrl}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs px-3 py-2 rounded-lg font-mono truncate focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-black" /> Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Salin Link
                  </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-amber-400/90 leading-relaxed bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
              💡 <strong>Jika muncul 403 Forbidden di HP:</strong> Pastikan Anda menggunakan tautan <strong>Shared URL (ais-pre)</strong> di atas atau scan QR di atas, bukan tautan internal editor (ais-dev). Pastikan juga login dengan akun Google Anda jika diminta izin oleh Cloud Run.
            </p>
          </div>

          {/* Tips for HP Experience */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Fitur Khusus Saat Buka di HP:
            </h4>
            <ul className="text-[11px] text-zinc-400 space-y-1.5 list-disc list-inside">
              <li>
                <strong className="text-zinc-200">Kamera Scanner Barcode:</strong> Di tab <em>Inbound</em> atau <em>Outbound</em>, klik tombol kamera untuk scan barcode fisik langsung dengan kamera belakang HP.
              </li>
              <li>
                <strong className="text-zinc-200">Suara Beep & Getar:</strong> HP akan bergetar dan bunyi beep saat barcode berhasil terbaca.
              </li>
              <li>
                <strong className="text-zinc-200">Mode Layar Penuh (PWA / Fullscreen):</strong> Di HP tampilan otomatis menyesuaikan ukuran layar tanpa bingkai desktop.
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-zinc-950 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
