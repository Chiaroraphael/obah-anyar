import type { ReactNode, RefObject } from 'react';
import { Icon } from './Icon';
import type { CameraPhase } from '../features/practice/usePoseCamera';
import type { Readiness } from '../pose/tracker';
import { READINESS_TEXT } from '../pose/tracker';

interface Props {
  videoRef: RefObject<HTMLVideoElement>;
  canvasRef: RefObject<HTMLCanvasElement>;
  phase: CameraPhase;
  ready: Readiness;
  onStart: () => void;
  errorText?: string | null;
  /** chip & elemen tambahan di atas video */
  overlay?: ReactNode;
  className?: string;
  label?: string;
}

/** Panel kamera "Kamu": video cermin + kerangka berwarna + kondisi kamera. */
export function CameraStage({ videoRef, canvasRef, phase, ready, onStart, errorText, overlay, className = '', label = 'Kamu' }: Props) {
  return (
    <div className={`relative overflow-hidden rounded-kartu bg-black/40 ring-1 ring-white/10 ${className}`}>
      <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover -scale-x-100" aria-label="Pratinjau kamera (cermin). Video tidak dikirim ke mana pun." />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <span className="absolute left-3 top-3 chip bg-nila-malam/70 text-mori backdrop-blur">{label}</span>
      {phase === 'ready' && overlay}
      {phase !== 'ready' && <CameraState phase={phase} onStart={onStart} errorText={errorText} />}
      {phase === 'ready' && ready !== 'siap' && (
        <div className="absolute inset-x-3 bottom-3 flex items-center gap-2 rounded-[10px] bg-nila-malam/85 px-4 py-3 text-[14px] font-semibold text-mori backdrop-blur" role="status" aria-live="polite">
          <Icon name="alert" size={18} className="text-hampir shrink-0" />
          {READINESS_TEXT[ready]}
        </div>
      )}
    </div>
  );
}

function CameraState({ phase, onStart, errorText }: { phase: CameraPhase; onStart: () => void; errorText?: string | null }) {
  const box = (icon: string, title: string, body: ReactNode, action?: ReactNode, spin = false) => (
    <div className="absolute inset-0 grid place-items-center p-6 text-center motif-kawung" style={{ ['--kawung-opasitas' as string]: 0.06 }} role="status" aria-live="polite">
      <div className="max-w-xs">
        <span className={`mx-auto grid h-14 w-14 place-items-center rounded-full bg-white/5 text-prada ${spin ? 'denyut' : ''}`}><Icon name={icon} size={26} /></span>
        <h3 className="mt-4 text-[18px] text-mori">{title}</h3>
        <div className="mt-1.5 text-[14px] text-muted-gelap">{body}</div>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
  switch (phase) {
    case 'idle':
      return box('camera', 'Nyalakan kamera', 'Berdiri sekitar 2 meter dari layar. Video hanya diproses di perangkatmu.', <button type="button" className="tombol-utama" onClick={onStart}><Icon name="camera" size={18} />Nyalakan kamera</button>);
    case 'loading-model':
      return box('refresh', 'Memuat model AI pose… sekali saja', 'Setelah ini model tersimpan di perangkat dan latihan bisa dibuka lebih cepat, bahkan offline.', undefined, true);
    case 'requesting':
      return box('camera', 'Izinkan akses kamera', 'Pilih "Izinkan" pada jendela izin peramban.', undefined, true);
    case 'denied':
      return box('eye-off', 'Izin kamera ditolak', 'Buka pengaturan situs di peramban (ikon gembok di bilah alamat), izinkan Kamera, lalu coba lagi.', <button type="button" className="tombol-utama" onClick={onStart}><Icon name="refresh" size={18} />Coba lagi</button>);
    case 'notfound':
      return box('camera', 'Kamera tidak ditemukan', 'Pastikan kamera terpasang dan tidak sedang dipakai aplikasi lain.', <button type="button" className="tombol-garis-gelap" onClick={onStart}><Icon name="refresh" size={18} />Cari lagi</button>);
    case 'insecure':
      return box('lock', 'Butuh koneksi aman (HTTPS)', 'Kamera hanya bisa dipakai di alamat https:// atau localhost.');
    default:
      return box('alert', 'Model AI gagal dimuat', <>Periksa koneksi internet untuk pemuatan pertama.{errorText && <span className="mt-2 block text-[12px] opacity-70">{errorText.slice(0, 120)}</span>}</>, <button type="button" className="tombol-utama" onClick={onStart}><Icon name="refresh" size={18} />Muat ulang model</button>);
  }
}
