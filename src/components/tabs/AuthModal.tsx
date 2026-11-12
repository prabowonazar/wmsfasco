import React, { useState } from 'react';
import { WarehouseUser } from '../../types/warehouse';
import {
  User,
  Shield,
  Lock,
  LogOut,
  KeyRound,
  CheckCircle2,
  X,
  UserCheck,
  AlertCircle,
  Delete,
} from 'lucide-react';
import { soundService } from '../../utils/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: WarehouseUser[];
  activeUser: WarehouseUser | null;
  onLogin: (user: WarehouseUser) => void;
  onLogout: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  users,
  activeUser,
  onLogin,
  onLogout,
}) => {
  const [selectedUserToLogin, setSelectedUserToLogin] = useState<WarehouseUser | null>(
    activeUser || users[0]
  );
  const [pinInput, setPinInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectUser = (user: WarehouseUser) => {
    setSelectedUserToLogin(user);
    setPinInput('');
    setErrorMsg(null);
  };

  const handleKeypadPress = (digit: string) => {
    if (pinInput.length < 4) {
      const nextPin = pinInput + digit;
      setPinInput(nextPin);
      setErrorMsg(null);

      // Auto-validate if 4 digits
      if (nextPin.length === 4 && selectedUserToLogin) {
        if (nextPin === selectedUserToLogin.pin) {
          soundService.playSuccessChime();
          onLogin(selectedUserToLogin);
          setPinInput('');
          onClose();
        } else {
          soundService.playErrorBuzz();
          setErrorMsg('PIN salah! Coba lagi (default tertera di bawah).');
          setTimeout(() => setPinInput(''), 600);
        }
      }
    }
  };

  const handleDeleteDigit = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleConfirmLogout = () => {
    soundService.playSuccessChime();
    onLogout();
    setPinInput('');
    setSelectedUserToLogin(users[0]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Fase 4: Masuk & Keluar Akun
              </h2>
              <p className="text-[11px] text-zinc-400">Autentikasi Operator & Hak Akses</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Active User Card if logged in */}
          {activeUser ? (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={activeUser.avatar}
                  alt={activeUser.name}
                  className="w-10 h-10 rounded-full border border-amber-500/50 object-cover"
                />
                <div>
                  <h3 className="text-xs font-bold text-white">{activeUser.name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                    <span className="font-mono text-amber-400">{activeUser.nik}</span>
                    <span>·</span>
                    <span className="capitalize text-zinc-300 font-semibold">
                      {activeUser.role}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirmLogout}
                className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800/80 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" /> Keluar
              </button>
            </div>
          ) : (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center text-xs text-amber-300 font-medium">
              Sesi terkunci. Silakan pilih akun dan masukkan PIN 4-digit Anda.
            </div>
          )}

          {/* User selector list */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-zinc-400 block">
              Pilih Akun Operator / Petugas:
            </span>
            <div className="grid grid-cols-1 gap-1.5">
              {users.map((u) => {
                const isSelected = selectedUserToLogin?.id === u.id;
                const isCurrentActive = activeUser?.id === u.id;

                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleSelectUser(u)}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/15 border-amber-500/50 text-white'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-8 h-8 rounded-full border border-zinc-700 object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{u.name}</span>
                          {isCurrentActive && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1 py-0.2 rounded font-mono font-bold">
                              AKTIF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          NIK: {u.nik} · Role: {u.role.toUpperCase()} (PIN: {u.pin})
                        </div>
                      </div>
                    </div>

                    {isSelected && <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Input Dots */}
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-2">
            <span className="text-[11px] text-zinc-400 flex items-center gap-1 font-mono">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" /> MASUKKAN PIN KEAMANAN
            </span>

            <div className="flex gap-3 my-1">
              {[0, 1, 2, 3].map((idx) => {
                const filled = pinInput.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      filled
                        ? 'bg-amber-400 border-amber-400 shadow-[0_0_8px_#f59e0b]'
                        : 'border-zinc-700 bg-zinc-900'
                    }`}
                  />
                );
              })}
            </div>

            {errorMsg && (
              <span className="text-[11px] text-red-400 font-medium text-center">
                {errorMsg}
              </span>
            )}
          </div>

          {/* Touch Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="py-3 bg-zinc-950 hover:bg-zinc-800 active:bg-zinc-700 text-white font-mono text-base font-bold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPinInput('')}
              className="py-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 text-xs font-semibold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
            >
              C
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="py-3 bg-zinc-950 hover:bg-zinc-800 text-white font-mono text-base font-bold rounded-xl border border-zinc-800 transition-colors cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDeleteDigit}
              className="py-3 bg-zinc-950 hover:bg-zinc-800 text-zinc-400 rounded-xl border border-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
