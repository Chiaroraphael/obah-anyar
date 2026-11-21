import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { Logo } from './ui';
import { Kain } from './Ornamen';
import { useAuth } from '../features/auth/authStore';
import { DAERAH, TARIAN } from '../data/katalog';

const LINKS = [
  { to: '/papan-skor', label: 'Peringkat' },
  { to: '/cara-kerja', label: 'Panduan' },
  { to: '/#sanggar', label: 'Sanggar' },
];

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  const initials = name.split(/[\s._]+/).filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') || '?';
  return <span className="grid place-items-center rounded-full bg-prada font-medium text-nila" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden>{initials}</span>;
}

/** Header: ground malam opak, garis rambut, garis emas 2px pada halaman aktif, panel Tarian berisi daerah. */
export function Navbar() {
  const { status, profile, sanggar, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [panel, setPanel] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverT = useRef<number>();

  useEffect(() => { setOpen(false); setMenu(false); setPanel(false); }, [loc.pathname, loc.hash]);
  useEffect(() => {
    if (!menu && !panel) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent) { if (e.key === 'Escape') { setMenu(false); setPanel(false); } return; }
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
      if (!panelRef.current?.contains(e.target as Node)) setPanel(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [menu, panel]);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);

  const authed = status === 'authed' && profile;
  const menuItems = authed
    ? [
        { to: '/profil', label: 'Profil', icon: 'user' },
        ...(sanggar && sanggar.role !== 'murid' ? [{ to: '/sanggar', label: 'Dasbor sanggar', icon: 'users' }] : []),
        ...(profile.role === 'maestro' || profile.role === 'admin' ? [{ to: '/maestro', label: 'Mode Maestro', icon: 'camera' }] : []),
        ...(profile.role === 'admin' ? [{ to: '/admin', label: 'Admin', icon: 'shield' }] : []),
        { to: '/pengaturan', label: 'Pengaturan', icon: 'settings' },
      ]
    : [];
  const doSignOut = async () => { await signOut(); nav('/'); };
  const tarianAktif = loc.pathname.startsWith('/daerah') || loc.pathname.startsWith('/tarian');
  const openSoon = () => { window.clearTimeout(hoverT.current); hoverT.current = window.setTimeout(() => setPanel(true), 150); };
  const closeSoon = () => { window.clearTimeout(hoverT.current); hoverT.current = window.setTimeout(() => setPanel(false), 120); };

  return (
    <header className="nav-atas sticky top-0 z-[300]">
      <div className="wadah flex items-center gap-6" style={{ height: 'var(--nav)' }}>
        <Logo dark />
        <nav className="hidden items-center lg:flex" aria-label="Utama">
          <div ref={panelRef} className="relative" onMouseEnter={openSoon} onMouseLeave={closeSoon}>
            <button type="button" className="tautan inline-flex min-h-[44px] items-center gap-1 px-3 text-[15px] font-medium"
              aria-expanded={panel} aria-controls="panel-tarian" aria-current={tarianAktif ? 'page' : undefined} onClick={() => setPanel((p) => !p)}>
              Tarian<Icon name="chevron" size={14} className={`transition-transform duration-[200ms] ${panel ? 'rotate-180' : ''}`} />
            </button>
            {panel && (
              <div id="panel-tarian" className="panel-nav absolute left-0 top-full z-[100] mt-3 w-[640px] rounded-kartu border border-white/10 bg-nila-malam p-3">
                <ul className="grid grid-cols-2 gap-1">
                  {DAERAH.map((d) => (
                    <li key={d.id}>
                      <Link to={`/daerah/${d.id}`} className="flex items-center gap-3 rounded-[12px] p-2.5 transition-colors duration-[150ms] hover:bg-white/[0.06]">
                        <Kain id={d.id} className="kain-kecil h-11 w-11 shrink-0 rounded-[10px]" />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-medium text-mori">{d.name}</span>
                          <span className="block truncate text-[13px] text-muted-gelap">{TARIAN.filter((t) => t.region === d.id).map((t) => t.name).join(', ')}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/tarian/pemanasan" className="flex h-full items-center gap-3 rounded-[12px] border border-dashed border-white/15 p-2.5 hover:bg-white/[0.06]">
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px] bg-prada text-nila"><Icon name="play" size={16} /></span>
                      <span className="text-[15px] font-medium text-mori">Pemanasan Dasar</span>
                    </Link>
                  </li>
                </ul>
              </div>
            )}
          </div>
          {LINKS.map((l) => l.to.includes('#') ? (
            <Link key={l.to} to={l.to} className="tautan inline-flex min-h-[44px] items-center px-3 text-[15px] font-medium">{l.label}</Link>
          ) : (
            <NavLink key={l.to} to={l.to} className="tautan inline-flex min-h-[44px] items-center px-3 text-[15px] font-medium">{l.label}</NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {authed ? (
            <div className="relative" ref={menuRef}>
              <button type="button" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-haspopup="menu" className="flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-3 text-mori hover:bg-white/[0.06]">
                <Avatar name={profile.display_name} url={profile.avatar_url} size={34} />
                <span className="max-w-[140px] truncate text-[14px] font-medium">{profile.display_name}</span>
                <Icon name="chevron" size={14} />
              </button>
              {menu && (
                <div role="menu" className="panel-nav absolute right-0 z-[100] mt-3 w-60 rounded-kartu border border-white/10 bg-nila-malam p-1.5">
                  {menuItems.map((m) => (
                    <Link key={m.to} role="menuitem" to={m.to} className="flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-[15px] text-mori hover:bg-white/[0.06]">
                      <Icon name={m.icon} size={18} className="text-muted-gelap" />{m.label}
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-white/10" />
                  <button role="menuitem" type="button" onClick={doSignOut} className="flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 text-[15px] text-mori hover:bg-white/[0.06]">
                    <Icon name="logout" size={18} className="text-muted-gelap" />Keluar
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/masuk" className="tautan inline-flex min-h-[44px] items-center px-3 text-[15px] font-medium">Masuk</Link>
          )}
          <Link to="/tarian/pemanasan" className="tombol-garis-gelap">Mulai latihan</Link>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:hidden">
          <Link to="/tarian/pemanasan" className="tombol-garis-gelap hidden min-h-[44px] px-4 text-[14px] sm:inline-flex">Mulai latihan</Link>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-full text-mori hover:bg-white/[0.06]" aria-expanded={open} aria-controls="menu-hp" aria-label={open ? 'Tutup menu' : 'Buka menu'} onClick={() => setOpen((v) => !v)}>
            <Icon name={open ? 'x' : 'menu'} size={24} />
          </button>
        </div>
      </div>

      {open && (
        <div id="menu-hp" className="fixed inset-x-0 bottom-0 overflow-y-auto bg-nila-malam text-mori lg:hidden" style={{ top: 'var(--nav)' }}>
          <nav className="wadah flex flex-col py-4" aria-label="Utama (HP)">
            <p className="pb-2 pt-2 text-[13px] text-muted-gelap">Tarian per daerah</p>
            {DAERAH.map((d) => (
              <Link key={d.id} to={`/daerah/${d.id}`} className="flex min-h-[56px] items-center gap-3 border-b border-white/10 text-[17px]">
                <Kain id={d.id} className="kain-kecil h-8 w-8 shrink-0 rounded-[8px]" />{d.name}
              </Link>
            ))}
            {[{ to: '/tarian/pemanasan', label: 'Pemanasan Dasar' }, ...LINKS].map((l) => (
              <Link key={l.to} to={l.to} className="flex min-h-[56px] items-center border-b border-white/10 text-[17px]">{l.label}</Link>
            ))}
            {authed ? (
              <>
                {menuItems.map((m) => (
                  <Link key={m.to} to={m.to} className="flex min-h-[56px] items-center gap-3 border-b border-white/10 text-[17px]"><Icon name={m.icon} size={18} className="text-muted-gelap" />{m.label}</Link>
                ))}
                <button type="button" onClick={doSignOut} className="flex min-h-[56px] items-center gap-3 text-left text-[17px]"><Icon name="logout" size={18} className="text-muted-gelap" />Keluar</button>
              </>
            ) : (
              <Link to="/masuk" className="flex min-h-[56px] items-center border-b border-white/10 text-[17px]">Masuk</Link>
            )}
            <Link to="/tarian/pemanasan" className="tombol-utama mt-6 min-h-[48px] w-full">Mulai latihan</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function Footer() {
  return (
    <footer className="bg-nila-malam text-mori">
      <div className="wadah grid gap-12 py-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo dark aksara />
          <p className="mt-5 max-w-[34ch] text-[16px] text-muted-gelap">Belajar tari daerah di depan kamera, dengan contoh gerak dari maestro sanggar.</p>
        </div>
        <nav aria-label="Tarian per daerah" className="md:col-span-4">
          <h2 className="font-sans text-[15px] font-medium tracking-normal">Tarian per daerah</h2>
          <ul className="mt-4 grid grid-cols-2 gap-x-6">
            {DAERAH.map((d) => (
              <li key={d.id}>
                <Link to={`/daerah/${d.id}`} className="flex min-h-[44px] items-center gap-2.5 text-[15px] text-mori/85 hover:text-mori">
                  <Kain id={d.id} className="kain-kecil h-5 w-5 shrink-0 rounded-[5px]" />{d.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <FooterCol title="Belajar" links={[['/tarian/pemanasan', 'Pemanasan Dasar'], ['/papan-skor', 'Peringkat'], ['/cara-kerja', 'Panduan dan privasi']]} />
        <FooterCol title="Sanggar" links={[['/#sanggar', 'Untuk sanggar'], ['/maestro', 'Mode Maestro'], ['/syarat', 'Syarat'], ['/privasi', 'Privasi']]} />
      </div>
      <div className="border-t border-white/10">
        <div className="wadah flex flex-col gap-1 py-6 text-[14px] text-muted-gelap sm:flex-row sm:justify-between">
          <span>Obah Anyar, {new Date().getFullYear()}</span>
          <span>Video kamera pelajar tidak pernah keluar dari perangkat.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div className="md:col-span-2">
      <h2 className="font-sans text-[15px] font-medium tracking-normal">{title}</h2>
      <ul className="mt-4">
        {links.map(([to, label]) => (
          <li key={to}><Link to={to} className="inline-flex min-h-[44px] items-center text-[15px] text-mori/85 hover:text-mori">{label}</Link></li>
        ))}
      </ul>
    </div>
  );
}
