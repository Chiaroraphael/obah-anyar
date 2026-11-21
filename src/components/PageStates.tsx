import { Link } from 'react-router-dom';
import { Icon } from './Icon';

function StatePage({ code, title, body, icon, children }: { code: string; title: string; body: string; icon: string; children?: React.ReactNode }) {
  return (
    <main className="wadah grid min-h-[60vh] place-items-center py-16">
      <div className="max-w-md text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-kartu bg-nila text-prada motif-kawung" style={{ ['--kawung-opasitas' as string]: 0.18 }}><Icon name={icon} size={28} /></span>
        <p className="mt-6 label-kecil text-soga">{code}</p>
        <h1 className="mt-2 text-[30px]">{title}</h1>
        <p className="mt-3 text-[16px] text-muted">{body}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">{children ?? <Link to="/" className="tombol-utama">Kembali ke beranda</Link>}</div>
      </div>
    </main>
  );
}

export const NotFoundPage = () => <StatePage code="404" icon="flag" title="Halaman tidak ditemukan" body="Alamatnya mungkin salah ketik, atau halamannya sudah dipindah." />;
export const ForbiddenPage = ({ reason }: { reason?: string }) => (
  <StatePage code="403" icon="lock" title="Akses ditolak" body={reason ?? 'Akunmu tidak punya izin membuka halaman ini.'} />
);
export const ServerErrorPage = () => (
  <StatePage code="Galat server" icon="alert" title="Ada yang tidak beres" body="Server sedang bermasalah. Coba lagi beberapa saat lagi.">
    <button type="button" className="tombol-utama" onClick={() => location.reload()}><Icon name="refresh" size={18} />Muat ulang</button>
    <Link to="/" className="tombol-garis">Ke beranda</Link>
  </StatePage>
);
export const PendingSanggarPage = () => (
  <StatePage code="Menunggu verifikasi admin" icon="clock" title="Sanggarmu sedang ditinjau" body="Mode Maestro terbuka setelah admin Obah Anyar memverifikasi sanggarmu. Kami kirim email begitu selesai.">
    <Link to="/sanggar" className="tombol-utama">Lihat status sanggar</Link>
    <Link to="/" className="tombol-garis">Ke beranda</Link>
  </StatePage>
);
