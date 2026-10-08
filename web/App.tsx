import { useCallback, useEffect, useRef, useState } from 'react';
import type { Metadata, Project } from './model';
import { core } from './engine';
import { api } from './api';
import Projects from './components/Projects';
import Board from './components/Board';
export default function App() {
    const [session, setSession] = useState<{ metadata: Metadata; project: Project } | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState('');
    const sessionRef = useRef(session), flush = useRef<() => Promise<void>>(async () => { }), generation = useRef(0); sessionRef.current = session;
    const route = useCallback(async () => { const generationId = ++generation.current; const match = location.hash.match(/^#board\/([a-f0-9]{32})$/), id = match?.[1]; if (id === sessionRef.current?.metadata.id) { setLoading(false); setError(''); return; } setLoading(true); setError(''); try { await flush.current(); if (generationId !== generation.current) return; if (!id) { sessionRef.current = null; setSession(null); flush.current = async () => { }; return; } const data = await api.open(id); core.validate(data.project); await flush.current(); if (generationId !== generation.current) return; sessionRef.current = data; setSession(data); } catch (e) { if (generationId !== generation.current) return; setError((e as Error).message); history.replaceState(null, '', sessionRef.current ? '#board/' + sessionRef.current.metadata.id : '#domain'); } finally { if (generationId === generation.current) setLoading(false); } }, []);
    useEffect(() => { const change = () => void route(); window.addEventListener('hashchange', change); void route(); return () => window.removeEventListener('hashchange', change); }, [route]);
    const open = (id: string) => { location.hash = '#board/' + id; };
    const isDesktop = typeof window !== 'undefined' && Boolean((window as unknown as { desktopAPI?: { isDesktop: boolean } }).desktopAPI?.isDesktop || (navigator.userAgent && navigator.userAgent.includes('Electron')));
    return <><header className="app-header"><a className="brand" href="#domain"><span className="brand-icon">↯</span><span>Flow Studio<small>استديو Lottie</small></span></a><nav aria-label="التنقل"><a href="#domain" aria-current={!session ? 'page' : undefined}>المشاريع</a><a href="/Flow-Studio.html#docs" target="_blank" rel="noreferrer">دليل الاستخدام ↗</a></nav><span className="local-indicator">{isDesktop ? '● تطبيق سطح المكتب' : '● حفظ على جهازك'}</span></header>{error && <div className="global-error" role="alert">{error}<button onClick={() => void route()}>إعادة المحاولة</button></div>}{loading && <div className="route-progress" role="status">جارٍ فتح مساحة العمل…</div>}{session ? <Board key={session.metadata.id} metadata={session.metadata} initial={session.project} registerFlush={fn => { flush.current = fn; }} /> : <Projects onOpen={open} />}</>;
}
