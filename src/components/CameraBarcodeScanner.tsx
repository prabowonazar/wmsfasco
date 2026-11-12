import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Zap, ZapOff, RefreshCw, Keyboard, QrCode } from 'lucide-react';
import { soundService } from '../utils/audio';

interface CameraBarcodeScannerProps {
  onScan: (decodedText: string) => void;
  isScanning: boolean;
  onClose?: () => void;
  onOpenTestBarcodes?: () => void;
}

export const CameraBarcodeScanner: React.FC<CameraBarcodeScannerProps> = ({
  onScan,
  isScanning,
  onClose,
  onOpenTestBarcodes,
}) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualInput, setManualInput] = useState<string>('');
  const [showManual, setShowManual] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const html5QrCodeRef = useRef<any>(null);
  const scannerContainerId = 'warehouse-qr-reader';

  // Start real camera scanner via Html5Qrcode
  useEffect(() => {
    let isMounted = true;

    async function initScanner() {
      if (!isScanning) {
        stopScanner();
        return;
      }

      setCameraError(null);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (!isMounted) return;

        // Clean up previous instance if any
        if (html5QrCodeRef.current) {
          try {
            await html5QrCodeRef.current.stop();
            html5QrCodeRef.current.clear();
          } catch {
            // ignore
          }
        }

        const scanner = new Html5Qrcode(scannerContainerId);
        html5QrCodeRef.current = scanner;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0,
        };

        await scanner.start(
          { facingMode: facingMode },
          config,
          (decodedText: string) => {
            soundService.playScanBeep();
            onScan(decodedText.trim());
          },
          () => {
            // scan frame failure (normal while scanning frame by frame)
          }
        );

        if (isMounted) {
          setCameraActive(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Camera start issue, falling back or permission prompt:', err);
        setCameraActive(false);
        const errString = String(err?.message || err || '');
        if (errString.includes('NotAllowedError') || errString.includes('Permission')) {
          setCameraError(
            'Izin kamera belum diberikan pada browser HP Anda. Silakan klik ikon gembok / izin di bilah alamat browser lalu izinkan akses Kamera.'
          );
        } else if (errString.includes('NotFoundError')) {
          setCameraError('Kamera tidak terdeteksi pada perangkat ini.');
        } else {
          setCameraError(
            'Kamera tidak dapat diakses atau izin ditolak. Anda dapat menggunakan tombol Test Barcode atau input manual.'
          );
        }
      }
    }

    initScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isScanning, facingMode]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch {
        // ignore
      }
      html5QrCodeRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleToggleTorch = async () => {
    try {
      if (mediaStreamRef.current) {
        const track = mediaStreamRef.current.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as any;
        if (capabilities?.torch) {
          const nextTorch = !torchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
          setTorchOn(nextTorch);
        }
      }
    } catch {
      setTorchOn(!torchOn);
    }
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      soundService.playScanBeep();
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col items-center">
      {/* Scanner Viewport Window */}
      <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden">
        {/* Container for html5-qrcode video */}
        <div id={scannerContainerId} className="w-full h-full object-cover" />

        {/* Laser Reticle & HUD Overlay */}
        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
          {/* Target Reticle Box */}
          <div className="relative w-64 h-36 border-2 border-amber-500/80 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            {/* Corner Markers */}
            <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-amber-400 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-amber-400 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-amber-400 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-amber-400 rounded-br" />

            {/* Animated Laser Beam */}
            <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent shadow-[0_0_12px_#ef4444] animate-pulse" />

            {/* Instruction tag */}
            <span className="absolute -bottom-7 text-[11px] font-mono font-medium tracking-wider text-amber-300 bg-zinc-950/80 px-2 py-0.5 rounded border border-amber-500/30">
              ARAHKAN KE BARCODE / QR
            </span>
          </div>
        </div>

        {/* Camera error or simulator fallback notice */}
        {cameraError && (
          <div className="absolute inset-0 bg-zinc-950/90 flex flex-col items-center justify-center p-6 text-center z-10">
            <CameraOff className="w-10 h-10 text-amber-400 mb-2" />
            <p className="text-xs text-zinc-300 font-medium max-w-xs mb-3">{cameraError}</p>
            <div className="flex gap-2">
              {onOpenTestBarcodes && (
                <button
                  type="button"
                  onClick={onOpenTestBarcodes}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <QrCode className="w-3.5 h-3.5" /> Buka Sampel Barcode
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowManual(true)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Keyboard className="w-3.5 h-3.5" /> Ketik Manual
              </button>
            </div>
          </div>
        )}

        {/* Top Controls Overlay */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
          <button
            type="button"
            onClick={handleSwitchCamera}
            title="Ganti Kamera Depan/Belakang"
            className="p-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg backdrop-blur border border-zinc-700/50 cursor-pointer active:scale-95 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleTorch}
            title="Lampu Senter"
            className={`p-2 rounded-lg backdrop-blur border transition-all cursor-pointer active:scale-95 ${
              torchOn
                ? 'bg-amber-500 text-zinc-950 border-amber-400'
                : 'bg-zinc-900/80 text-zinc-300 hover:text-white border-zinc-700/50'
            }`}
          >
            {torchOn ? <Zap className="w-4 h-4 fill-current" /> : <ZapOff className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Manual barcode input / quick action bar */}
      <div className="w-full p-3 bg-zinc-900/95 border-t border-zinc-800 flex flex-col gap-2">
        <form onSubmit={handleManualSubmit} className="flex gap-2 w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Input barcode manual / serial..."
              className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-500 rounded-lg py-2 pl-3 pr-8 text-xs font-mono text-zinc-100 placeholder:text-zinc-500 focus:outline-none transition-colors"
            />
            {manualInput && (
              <button
                type="button"
                onClick={() => setManualInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!manualInput.trim()}
            className="px-4 py-2 bg-amber-500 disabled:bg-zinc-800 disabled:text-zinc-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
          >
            Input
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-zinc-300 font-mono">2D CMOS SENSOR READY</span>
          </div>

          {onOpenTestBarcodes && (
            <button
              type="button"
              onClick={onOpenTestBarcodes}
              className="text-amber-400 hover:text-amber-300 font-medium underline flex items-center gap-1 cursor-pointer"
            >
              <QrCode className="w-3 h-3" /> Lembar Barcode Sampel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
