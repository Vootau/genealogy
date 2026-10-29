import { createContext, type ChangeEvent, type ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronLeft, ChevronRight, FileSearch, ImagePlus, Plus, Search as SearchIcon, ShieldCheck, Trash2, UserRound, Users, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Link, Route, Router as WouterRouter, Switch, useLocation, useRoute } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

type DatePart = { day: string; month: string; year: string };
type Person = {
  id: string;
  name: string;
  birthDate: DatePart;
  deathDate: DatePart;
  isAlive: boolean;
  bio: string;
  photoUrl?: string;
  parents: string[];
  spouses?: string[];
};
type SearchResult = { answer: string; sources: string[] };

const initialPeople: Person[] = [
  { id: 'oleg', name: 'Олег Андреевич Воронцов', birthDate: { day: '03', month: '02', year: '1929' }, deathDate: { day: '', month: '', year: '1998' }, isAlive: false, bio: 'Старший сын Сергея и Марии. В семейном архиве пока нет сведений о его наследниках.', parents: ['sergei', 'maria'] },
  { id: 'konstantsia', name: 'Констанция Андреевна Воронцова', birthDate: { day: '19', month: '05', year: '1933' }, deathDate: { day: '', month: '', year: '2004' }, isAlive: false, bio: 'Дочь Сергея и Марии. В семейном архиве пока нет сведений о её наследниках.', parents: ['sergei', 'maria'] },
  { id: 'alexei', name: 'Алексей Петрович Воронцов', birthDate: { day: '12', month: '03', year: '1931' }, deathDate: { day: '27', month: '11', year: '2008' }, isAlive: false, bio: 'Инженер-строитель, собиратель старых карт и человек редкого терпения. После войны восстановил дом родителей в Костроме. В семье его помнят за тихий смех и привычку записывать всё важное в клетчатую тетрадь.', parents: ['sergei', 'maria'] },
  { id: 'elena', name: 'Елена Михайловна Воронцова', birthDate: { day: '05', month: '09', year: '1935' }, deathDate: { day: '14', month: '02', year: '2012' }, isAlive: false, bio: 'Учительница русского языка. Вела школьный хор и всегда хранила письма в коробке из-под чая.', parents: ['ivan', 'anna'] },
  { id: 'sergei', name: 'Сергей Андреевич Воронцов', birthDate: { day: '08', month: '06', year: '1904' }, deathDate: { day: '19', month: '01', year: '1974' }, isAlive: false, bio: 'Железнодорожник из Ярославской губернии. Умел чинить часы и никогда не опаздывал к вечернему чаю.', parents: [] },
  { id: 'maria', name: 'Мария Ильинична Воронцова', birthDate: { day: '22', month: '10', year: '1908' }, deathDate: { day: '', month: '', year: '1981' }, isAlive: false, bio: 'Работала в библиотеке. По семейному рассказу, именно она научила детей бережно обращаться с книгами.', parents: [] },
  { id: 'ivan', name: 'Иван Фёдорович Климов', birthDate: { day: '17', month: '04', year: '1910' }, deathDate: { day: '', month: '', year: '1980' }, isAlive: false, bio: 'Фотограф-любитель, оставивший после себя около двухсот снимков.', parents: [] },
  { id: 'anna', name: 'Анна Сергеевна Климова', birthDate: { day: '02', month: '12', year: '1913' }, deathDate: { day: '', month: '', year: '1992' }, isAlive: false, bio: 'Берегла семейный сад и знала названия всех трав на лугу.', parents: [] },
  { id: 'mikhail', name: 'Михаил Алексеевич Воронцов', birthDate: { day: '21', month: '07', year: '1962' }, deathDate: { day: '', month: '', year: '' }, isAlive: true, bio: 'Родился в Костроме, сейчас живёт в Санкт-Петербурге. Архитектор, любит деревянные дома и долгие прогулки по набережной.', parents: ['alexei', 'elena'], spouses: ['natalia'] },
  { id: 'natalia', name: 'Наталья Олеговна Воронцова', birthDate: { day: '30', month: '01', year: '1965' }, deathDate: { day: '', month: '', year: '' }, isAlive: true, bio: 'Редактор и хранительница семейных историй. Ведёт этот архив.', parents: [], spouses: ['mikhail'] },
  { id: 'sofia', name: 'Софья Михайловна Воронцова', birthDate: { day: '14', month: '08', year: '1996' }, deathDate: { day: '', month: '', year: '' }, isAlive: true, bio: 'Изучает городскую антропологию. Собирает устные рассказы и старые рецепты.', parents: ['mikhail', 'natalia'] },
];

type ArchiveContextValue = { people: Person[]; updatePerson: (person: Person) => void; addAncestor: (person: Person, parentId: string) => void; addDescendant: (person: Person) => void; addSibling: (person: Person) => void; addSpouse: (person: Person, spouseId: string) => void; deletePerson: (id: string) => void; toast: (message: string) => void };
const ArchiveContext = createContext<ArchiveContextValue | null>(null);
function useArchive() {
  const context = useContext(ArchiveContext);
  if (!context) throw new Error('Archive context is missing');
  return context;
}

const initials = (name: string) => name.split(' ').slice(0, 2).map((word) => word[0]).join('');
const nameLines = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const surname = words.pop() || 'Без фамилии';
  const firstName = words.shift() || 'Имя не указано';
  return { surname: surname.toUpperCase(), firstName, patronymic: words.join(' ') };
};
const surnameOf = (name: string) => name.trim().split(/\s+/).filter(Boolean).pop() || '';
const formatDate = (date: DatePart, alive: boolean) => {
  const dateText = [date.day, date.month, date.year].filter(Boolean).join('.');
  return alive ? `${dateText || 'Дата не указана'} · сейчас` : `${dateText || 'Дата не указана'}`;
};
type DiagramPosition = { left: number; top: number };
type DiagramLayout = { width: number; height: number; positions: Record<string, DiagramPosition> };
const TREE_CARD_WIDTH = 280;
const TREE_CARD_HEIGHT = 100;

function getFamilyBranchPeople(people: Person[], focusId: string): Person[] {
  const byId = new Map(people.map((person) => [person.id, person]));
  const included = new Set<string>();
  const includePerson = (id: string) => {
    if (byId.has(id)) included.add(id);
  };
  const includeAncestors = (startIds: string[]) => {
    const queue = [...startIds];
    while (queue.length) {
      const id = queue.shift()!;
      if (included.has(id)) continue;
      const person = byId.get(id);
      if (!person) continue;
      included.add(id);
      queue.push(...person.parents);
    }
  };

  includeAncestors([focusId]);
  const focusSpouses = byId.get(focusId)?.spouses || [];
  focusSpouses.forEach(includePerson);
  const descendants = [...focusSpouses, focusId];
  const expanded = new Set<string>();
  while (descendants.length) {
    const id = descendants.shift()!;
    if (expanded.has(id)) continue;
    expanded.add(id);
    const person = byId.get(id);
    if (!person) continue;
    includePerson(id);
    for (const child of people.filter((candidate) => candidate.parents.includes(id))) {
      includePerson(child.id);
      child.parents.forEach(includePerson);
      (child.spouses || []).forEach(includePerson);
      descendants.push(child.id, ...(child.spouses || []));
    }
  }
  return people.filter((person) => included.has(person.id));
}

function familyPartnerIds(person: Person, people: Person[]) {
  const coParents = people
    .filter((child) => child.parents.includes(person.id))
    .flatMap((child) => child.parents.filter((parentId) => parentId !== person.id));
  return [...new Set([...(person.spouses || []), ...coParents])];
}

function buildFullTreeLayout(people: Person[], rootId: string): DiagramLayout {
  const depth = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length) {
    const currentId = queue.shift()!;
    const currentDepth = depth.get(currentId) || 0;
    const current = people.find((person) => person.id === currentId);
    if (!current) continue;
    const relatedIds = [
      ...current.parents,
      ...people.filter((person) => person.parents.includes(currentId)).map((person) => person.id),
      ...(current.spouses || []),
    ];
    relatedIds.forEach((relatedId) => {
      if (!people.some((person) => person.id === relatedId) || depth.has(relatedId)) return;
      const isParent = current.parents.includes(relatedId);
      const isSpouse = (current.spouses || []).includes(relatedId);
      depth.set(relatedId, currentDepth + (isSpouse ? 0 : isParent ? 1 : -1));
      queue.push(relatedId);
    });
  }
  people.forEach((person) => {
    if (!depth.has(person.id)) depth.set(person.id, 0);
  });

  const levels = new Map<number, Person[]>();
  people.forEach((person) => {
    const level = levels.get(depth.get(person.id) || 0) || [];
    level.push(person);
    levels.set(depth.get(person.id) || 0, level);
  });
  const orderedLevels = [...levels.entries()].sort(([a], [b]) => a - b);
  const cardWidth = TREE_CARD_WIDTH;
  const nodeGap = 54;
  const branchGap = 180;
  const rowGap = 58;
  const levelGroups = orderedLevels.map(([depthValue, level]) => {
    const grouped = new Map<string, Person[]>();
    level.forEach((person) => {
      const parentKey = person.parents.filter((parentId) => people.some((candidate) => candidate.id === parentId)).sort().join('|');
      const key = parentKey ? `siblings:${parentKey}` : `person:${person.id}`;
      grouped.set(key, [...(grouped.get(key) || []), person]);
    });
    const siblingGroups = [...grouped.values()];
    const groupIndexByPerson = new Map(siblingGroups.flatMap((group, index) => group.map((person) => [person.id, index] as const)));
    const groupParents = siblingGroups.map((_, index) => index);
    const findGroup = (index: number): number => groupParents[index] === index ? index : (groupParents[index] = findGroup(groupParents[index]));
    people.forEach((person) => {
      const firstGroup = groupIndexByPerson.get(person.id);
      if (firstGroup === undefined) return;
      familyPartnerIds(person, people).forEach((spouseId) => {
        const spouseGroup = groupIndexByPerson.get(spouseId);
        if (spouseGroup !== undefined) groupParents[findGroup(spouseGroup)] = findGroup(firstGroup);
      });
    });
    const mergedGroups = new Map<number, { people: Person[]; originalIndex: number }>();
    siblingGroups.forEach((group, index) => {
      const root = findGroup(index);
      const currentGroup = mergedGroups.get(root) || { people: [], originalIndex: index };
      currentGroup.people.push(...group);
      currentGroup.originalIndex = Math.min(currentGroup.originalIndex, index);
      mergedGroups.set(root, currentGroup);
    });
    return { depth: depthValue, groups: [...mergedGroups.values()] };
  });
  const rowWidth = (groups: { people: Person[] }[]) => groups.reduce((total, group, index) => total + group.people.length * cardWidth + Math.max(0, group.people.length - 1) * nodeGap + (index > 0 ? branchGap : 0), 0);
  const width = Math.max(1280, ...levelGroups.map((level) => rowWidth(level.groups) + 120));
  const height = Math.max(720, orderedLevels.length * TREE_CARD_HEIGHT + Math.max(0, orderedLevels.length - 1) * rowGap + 120);
  const positions: Record<string, DiagramPosition> = {};

  const placeLevels = () => {
    const previousPositions = { ...positions };
    levelGroups.forEach((level, rowIndex) => {
      const sortedGroups = [...level.groups].sort((a, b) => {
        const relatedPosition = (group: { people: Person[]; originalIndex: number }) => {
          const related = group.people.flatMap((member) => people.filter((candidate) => candidate.parents.includes(member.id) || member.parents.includes(candidate.id)));
          const relatedCenters = related.map((person) => previousPositions[person.id]).filter(Boolean).map((position) => position.left + cardWidth / 2);
          return relatedCenters.length ? relatedCenters.reduce((sum, center) => sum + center, 0) / relatedCenters.length : group.originalIndex;
        };
        return relatedPosition(a) - relatedPosition(b) || a.originalIndex - b.originalIndex;
      });
      const levelWidth = rowWidth(sortedGroups);
      let left = (width - levelWidth) / 2;
      sortedGroups.forEach((group) => {
        group.people.forEach((person) => {
          positions[person.id] = { left, top: 56 + rowIndex * (TREE_CARD_HEIGHT + rowGap) };
          left += cardWidth + nodeGap;
        });
        left += branchGap - nodeGap;
      });
    });
  };
  placeLevels();
  for (let pass = 0; pass < 6; pass += 1) placeLevels();
  return { width, height, positions };
}

function connectionPath(child: DiagramPosition, parent: DiagramPosition) {
  const childCenter = child.left + TREE_CARD_WIDTH / 2;
  const parentCenter = parent.left + TREE_CARD_WIDTH / 2;
  const childBottom = child.top + TREE_CARD_HEIGHT;
  const parentTop = parent.top;
  const midpoint = childBottom + (parentTop - childBottom) / 2;
  return `M ${childCenter} ${childBottom} V ${midpoint} H ${parentCenter} V ${parentTop}`;
}

function spouseConnectionPath(first: DiagramPosition, second: DiagramPosition) {
  const firstIsLeft = first.left < second.left;
  const left = firstIsLeft ? first : second;
  const right = firstIsLeft ? second : first;
  const y = left.top + TREE_CARD_HEIGHT / 2;
  return `M ${left.left + TREE_CARD_WIDTH} ${y} H ${right.left}`;
}

function ToastMessage({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onClose, 3000); return () => window.clearTimeout(timer); }, [message, onClose]);
  return <div className="toast" role="status" data-testid="status-toast">{message}</div>;
}

function Brand() {
  return <Link href="/" className="brand" data-testid="link-brand"><span className="brand-mark" aria-hidden="true" /><span className="brand-name">Родовая память</span></Link>;
}

function PublicNav() {
  return <header className="public-nav page-wrap"><Brand /><div className="nav-actions"><Link href="/search" className="text-link" data-testid="link-public-search">Поиск по архиву</Link><Link href="/login" className="btn btn-primary" data-testid="link-login">Войти в архив <ChevronRight size={15} /></Link></div></header>;
}

function Landing() {
  return <div className="landing">
    <PublicNav />
    <main>
      <section className="hero page-wrap">
        <div>
          <span className="kicker">личный семейный архив</span>
          <h1>Имена, которые <em>остаются.</em></h1>
          <p className="hero-copy">Собирайте историю семьи бережно: даты, голоса, фотографии и связи между поколениями — в одном защищённом месте.</p>
          <div className="hero-actions"><Link href="/login" className="btn btn-primary" data-testid="button-open-archive">Открыть свой архив <ChevronRight size={16} /></Link><Link href="/search" className="btn btn-ghost" data-testid="link-learn-search">Найти в архиве <SearchIcon size={15} /></Link></div>
          <div className="archive-note"><i className="seal" /> Ваши истории остаются только вашими</div>
        </div>
        <div className="tree-preview" aria-label="Предпросмотр семейного дерева" data-testid="visual-tree-preview">
          <div className="preview-lines" />
          <div className="preview-node center"><div className="node-avatar">МВ</div><strong>Михаил Воронцов</strong><small>1962 — сейчас</small></div>
          <div className="preview-node left"><div className="node-avatar">АВ</div><strong>Алексей Воронцов</strong><small>1931 — 2008</small></div>
          <div className="preview-node right"><div className="node-avatar">ЕВ</div><strong>Елена Воронцова</strong><small>1935 — 2012</small></div>
        </div>
      </section>
      <div className="landing-strip"><div className="page-wrap strip-items"><span className="strip-item"><i className="strip-dot" /> 3 поколения уже рядом</span><span className="strip-item"><i className="strip-dot" /> 126 лет семейной истории</span><span className="strip-item"><i className="strip-dot" /> Личный доступ без рекламы</span></div></div>
      <section className="landing-section page-wrap">
        <div><span className="kicker">как это устроено</span><h2>Архив, который говорит человеческим языком.</h2></div>
        <div className="feature-list">
          <div className="feature"><span className="feature-num">01</span><div><h3>Увидеть всю семью</h3><p>Дерево показывает не только имена, но и то, как одна история перетекает в другую.</p></div></div>
          <div className="feature"><span className="feature-num">02</span><div><h3>Сохранить голос каждого</h3><p>Добавляйте заметки и подробные биографии, пока воспоминания ещё рядом.</p></div></div>
          <div className="feature"><span className="feature-num">03</span><div><h3>Находить через смысл</h3><p>Поиск понимает вопросы о событиях, местах и людях — не только точные совпадения.</p></div></div>
        </div>
      </section>
    </main>
    <footer className="landing-footer page-wrap"><span>Родовая память · закрытый семейный архив</span><span>Сделано с уважением к прошлому</span></footer>
  </div>;
}

function AuthAside() {
  return <aside className="auth-aside"><Brand /><div className="auth-quote"><p>«Пока мы помним имена, люди остаются рядом.»</p><cite>Из семейной тетради, 1978</cite></div><div className="auth-meta">Закрытый архив для одной семьи</div></aside>;
}

function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState('natalia.vorontsova@example.ru');
  const [password, setPassword] = useState('vorontsova');
  return <div className="auth-page"><AuthAside /><main className="auth-content"><div className="auth-card">
    <span className="kicker">добро пожаловать</span><h1>Войти в архив</h1><p>Продолжите собирать историю своей семьи в тихом, защищённом пространстве.</p>
    <form onSubmit={(event) => { event.preventDefault(); setLocation('/setup-2fa'); }}>
      <div className="form-field"><label htmlFor="email">Электронная почта</label><input id="email" className="form-input" value={email} onChange={(event) => setEmail(event.target.value)} type="email" data-testid="input-email" /></div>
      <div className="form-field"><label htmlFor="password">Пароль</label><input id="password" className="form-input" value={password} onChange={(event) => setPassword(event.target.value)} type="password" data-testid="input-password" /></div>
      <div className="helper-row"><label className="check-label"><input type="checkbox" defaultChecked /> Запомнить меня</label><button type="button" className="text-link">Забыли пароль?</button></div>
      <button className="btn btn-primary" type="submit" data-testid="button-login">Продолжить <ChevronRight size={16} /></button>
    </form>
    <Link href="/" className="auth-back" data-testid="link-back-home"><ChevronLeft size={14} /> Вернуться на главную</Link>
  </div></main></div>;
}

function Setup2FA() {
  const [, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);
  return <div className="auth-page"><AuthAside /><main className="auth-content"><div className="auth-card">
    <span className="kicker">шаг 2 из 2 · защита архива</span><h1>Подтвердите вход</h1><p>Введите шестизначный код из приложения-аутентификатора. Это последний шаг перед архивом.</p>
    <div className="security-panel"><ShieldCheck size={20} /><span>Двухфакторная защита помогает сохранить семейные истории только для вас и близких.</span></div>
    <form onSubmit={(event) => { event.preventDefault(); if (code.length >= 4) { setDone(true); window.setTimeout(() => setLocation('/tree'), 500); } }}>
      <div className="form-field"><label htmlFor="code">Код подтверждения</label><input id="code" className="form-input code-input" inputMode="numeric" maxLength={6} placeholder="000 000" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} data-testid="input-2fa-code" /></div>
      <button className="btn btn-primary" type="submit" data-testid="button-verify-2fa">{done ? <><Check size={16} /> Проверено</> : <>Войти в архив <ChevronRight size={16} /></>}</button>
    </form>
    <button className="auth-back" onClick={() => setLocation('/login')} data-testid="button-back-login"><ChevronLeft size={14} /> Изменить способ входа</button>
  </div></main></div>;
}

function AppSidebar() {
  const [location] = useLocation();
  return <><aside className="sidebar"><Brand /><nav className="sidebar-nav">
    <Link href="/tree" className={`nav-link ${location === '/tree' ? 'active' : ''}`} data-testid="link-tree"><Users size={17} /> Семейное дерево</Link>
    <Link href="/search" className={`nav-link ${location === '/search' ? 'active' : ''}`} data-testid="link-search"><SearchIcon size={17} /> Поиск по архиву</Link>
  </nav><div className="sidebar-spacer" /><div className="archive-status"><div className="status-line"><i /> Архив синхронизирован</div><p>Последнее сохранение: только что</p></div><div className="sidebar-user"><span className="avatar">НВ</span><div><strong>Наталья Воронцова</strong><small>владелец архива</small></div></div></aside><div className="mobile-topbar"><Brand /><nav className="mobile-nav"><Link href="/tree" className={location === '/tree' ? 'active' : ''} data-testid="mobile-link-tree"><Users size={16} /></Link><Link href="/search" className={location === '/search' ? 'active' : ''} data-testid="mobile-link-search"><SearchIcon size={16} /></Link></nav></div></>;
}

function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-layout"><AppSidebar /><main className="main-area">{children}</main></div>;
}

function PersonNode({ person, selected, onSelect, onDelete, onAddAncestor, onAddDescendant, onAddSibling, onAddSpouse, position }: { person: Person; selected: boolean; onSelect: () => void; onDelete: () => void; onAddAncestor: () => void; onAddDescendant: () => void; onAddSibling: () => void; onAddSpouse: () => void; position?: { left: string | number; top: string | number } }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = (event: PointerEvent) => {
      if (nodeRef.current && !nodeRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', closeMenu);
    return () => document.removeEventListener('pointerdown', closeMenu);
  }, [menuOpen]);
  const { surname, firstName, patronymic } = nameLines(person.name);
  return <div ref={nodeRef} className={`person-node ${selected ? 'selected' : ''}`} style={position} onClick={() => { onSelect(); setMenuOpen(true); }} data-testid={`card-person-${person.id}`}>
    <div className="node-card-grid"><div className={`node-avatar ${person.photoUrl ? 'has-photo' : 'placeholder'}`}>{person.photoUrl ? <img src={person.photoUrl} alt="" /> : <span>{initials(person.name)}</span>}</div><div className="node-copy"><strong className="node-surname">{surname}</strong><span className="node-first-name">{firstName}</span><span className="node-patronymic">{patronymic || '—'}</span></div></div>
    {menuOpen && <div className="node-action-menu" onClick={(event) => event.stopPropagation()}>
      <Link href={`/person/${person.id}`} className="node-action" onClick={() => setMenuOpen(false)} data-testid={`button-open-person-${person.id}`}><UserRound size={14} /> Открыть карточку</Link>
      <button className="node-action" onClick={() => { onAddAncestor(); setMenuOpen(false); }} data-testid={`button-add-ancestor-${person.id}`}><ArrowUp size={14} /> Добавить предков</button>
      <button className="node-action" onClick={() => { onAddDescendant(); setMenuOpen(false); }} data-testid={`button-add-descendant-${person.id}`}><ArrowDown size={14} /> Добавить наследников</button>
      <button className="node-action" onClick={() => { onAddSibling(); setMenuOpen(false); }} data-testid={`button-add-sibling-${person.id}`}><Users size={14} /> Добавить брата/сестру</button>
      <button className="node-action" onClick={() => { onAddSpouse(); setMenuOpen(false); }} data-testid={`button-add-spouse-${person.id}`}><Users size={14} /> Добавить супруга/супругу</button>
      <button className="node-action node-action-danger" onClick={() => { onDelete(); setMenuOpen(false); }} data-testid={`button-delete-person-${person.id}`}><Trash2 size={14} /> Удалить</button>
    </div>}
  </div>;
}

type RelativeMode = 'ancestor' | 'descendant' | 'sibling' | 'spouse';

function AddRelativeModal({ person, mode, onClose, onAdd }: { person: Person; mode: RelativeMode; onClose: () => void; onAdd: (data: { name: string; year: string; bio: string }) => void }) {
  const [name, setName] = useState('');
  const [year, setYear] = useState('');
  const [bio, setBio] = useState('');
  const isAncestor = mode === 'ancestor';
  const isSibling = mode === 'sibling';
  const isSpouse = mode === 'spouse';
  const title = isAncestor ? 'Добавить предка' : isSibling ? 'Добавить брата или сестру' : isSpouse ? 'Добавить супруга или супругу' : 'Добавить наследника';
  const description = isAncestor
    ? `Добавьте человека, который был родителем для ${person.name}.`
    : isSibling
      ? `Новый человек будет добавлен в одну ветвь с ${person.name}.`
      : isSpouse
        ? `Новый человек будет связан с ${person.name} как супруг или супруга.`
      : `Добавьте человека, который является наследником для ${person.name}.`;
  return <div className="modal-backdrop" role="dialog" aria-modal="true"><div className="modal-card content-card"><div className="modal-head"><div><span className="kicker">новая связь</span><h2 className="display-font">{title}</h2></div><button className="btn btn-ghost btn-icon" onClick={onClose} data-testid="button-close-add"><X size={18} /></button></div><p className="muted">{description}</p><div className="form-field"><label htmlFor="relative-name">{isAncestor || isSpouse ? 'Имя и фамилия' : 'Имя'}</label><input id="relative-name" className="form-input" placeholder={isAncestor ? 'Например, Пётр Иванович Воронцов' : isSpouse ? 'Например, Наталья Иванова' : 'Например, Олег'} value={name} onChange={(event) => setName(event.target.value)} data-testid="input-relative-name" /></div><div className="form-field"><label htmlFor="relative-year">Год рождения</label><input id="relative-year" className="form-input" placeholder="1898" value={year} onChange={(event) => setYear(event.target.value)} data-testid="input-relative-year" /></div><div className="form-field"><label htmlFor="relative-bio">Короткая заметка</label><textarea id="relative-bio" className="form-input" rows={3} placeholder="Что уже известно..." value={bio} onChange={(event) => setBio(event.target.value)} data-testid="input-relative-bio" /></div><button className="btn btn-primary" disabled={!name.trim()} onClick={() => onAdd({ name, year, bio })} data-testid={`button-submit-${mode}`}><Plus size={16} /> Добавить в дерево</button></div></div>;
}

function TreePage() {
  const { people, addAncestor, addDescendant, addSibling, addSpouse, deletePerson, toast } = useArchive();
  const [selectedId, setSelectedId] = useState('sofia');
  const [viewMode, setViewMode] = useState<'branch' | 'all'>('branch');
  const [addMode, setAddMode] = useState<RelativeMode | null>(null);
  const [scale, setScale] = useState(1);
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const selected = people.find((person) => person.id === selectedId) || people[0];
  const branchPeople = useMemo(() => getFamilyBranchPeople(people, selected.id), [people, selected.id]);
  const visiblePeople = viewMode === 'all' ? people : branchPeople;
  const layout = useMemo(() => buildFullTreeLayout(visiblePeople, selected.id), [visiblePeople, selected.id]);
  const selectedSpouses = selected.spouses || [];
  const existingSharedChild = people.find((person) => person.parents.includes(selected.id) && person.parents.some((parentId) => selectedSpouses.includes(parentId)));
  const descendantParents = existingSharedChild?.parents || [selected.id, ...selectedSpouses.slice(0, 1)];
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const viewport = treeScrollRef.current;
      const position = layout.positions[selected.id];
      if (!viewport || !position) return;
      viewport.scrollLeft = Math.max(0, position.left + TREE_CARD_WIDTH / 2 - viewport.clientWidth / 2);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [layout.positions, selected.id, viewMode]);
  const selectPerson = (personId: string) => {
    setSelectedId(personId);
    setViewMode('branch');
  };
  const handleDelete = (person: Person) => {
    if (window.confirm(`Удалить ${person.name} из архива?`)) {
      deletePerson(person.id);
      toast('Запись удалена из дерева');
    }
  };
  return <AppShell><div className="main-content">
     <div className="page-header"><div><span className="kicker">семья воронцовых</span><h1>Семейное дерево</h1><p>{viewMode === 'all' ? 'Все семейные ветви собраны вместе.' : `Ветка семьи: ${selected.name}. Кликните на супруга или супругу, чтобы перейти к их дереву.`}</p></div><div className="header-actions"><Link href={`/person/${selected.id}`} className="btn btn-soft" data-testid="button-open-person"><UserRound size={15} /> Открыть карточку</Link><button className="btn btn-primary" onClick={() => setAddMode('ancestor')} data-testid="button-add-ancestor"><Plus size={16} /> Добавить предка</button></div></div>
    <div className="stats-row"><div className="content-card stat-card"><span className="kicker">людей в архиве</span><span className="stat-number">{people.length}</span><p>три поколения семьи</p></div><div className="content-card stat-card"><span className="kicker">самая ранняя дата</span><span className="stat-number">1904</span><p>Сергей Андреевич</p></div><div className="content-card stat-card"><span className="kicker">связей</span><span className="stat-number">{people.reduce((sum, person) => sum + person.parents.length, 0)}</span><p>между людьми</p></div></div>
      <div className="full-tree-toolbar tree-archive-toolbar"><div className="crumb"><BookOpen size={14} /> Архив / <strong>Воронцовы</strong> / {viewMode === 'all' ? 'Все вместе' : 'Дерево человека'}</div><div className="tree-toolbar-right"><div className="tree-view-toggle" role="group" aria-label="Режим отображения дерева"><button className={viewMode === 'branch' ? 'active' : ''} onClick={() => setViewMode('branch')} data-testid="button-tree-branch">Дерево человека</button><button className={viewMode === 'all' ? 'active' : ''} onClick={() => setViewMode('all')} data-testid="button-tree-all">Все вместе</button></div><span><strong>{visiblePeople.length}</strong> из {people.length} записей · <span className="mono">↑ ↓ ← →</span></span><div className="zoom-tools"><button onClick={() => setScale((value) => Math.min(1.18, value + .06))} aria-label="Увеличить" data-testid="button-zoom-in"><ZoomIn size={15} /></button><button onClick={() => setScale(1)} aria-label="Сбросить масштаб" data-testid="button-reset-zoom"><span className="mono" style={{ fontSize: 9 }}>{Math.round(scale * 100)}%</span></button><button onClick={() => setScale((value) => Math.max(.86, value - .06))} aria-label="Уменьшить" data-testid="button-zoom-out"><ZoomOut size={15} /></button></div></div></div>
      <div className="full-tree-scroll" ref={treeScrollRef} tabIndex={0} autoFocus onKeyDown={(event) => { const amount = 90; if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.currentTarget.scrollBy({ top: event.key === 'ArrowUp' ? -amount : event.key === 'ArrowDown' ? amount : 0, left: event.key === 'ArrowLeft' ? -amount : event.key === 'ArrowRight' ? amount : 0, behavior: 'smooth' }); } }} data-testid="tree-workspace">
       <div className="full-tree-stage-shell" style={{ width: layout.width * scale, height: layout.height * scale }}><div className="full-tree-stage" style={{ width: layout.width, height: layout.height, transform: `scale(${scale})`, transformOrigin: 'top left', transition: 'transform .3s ease' }}>
          <svg className="full-tree-links" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
            {visiblePeople.flatMap((person) => person.parents.map((parentId) => { const childPosition = layout.positions[person.id]; const parentPosition = layout.positions[parentId]; if (!childPosition || !parentPosition) return null; return <path key={`parent-${person.id}-${parentId}`} className="tree-link" d={connectionPath(childPosition, parentPosition)} />; }))}
            {visiblePeople.flatMap((person) => (person.spouses || []).filter((spouseId) => person.id.localeCompare(spouseId) < 0).map((spouseId) => { const firstPosition = layout.positions[person.id]; const spousePosition = layout.positions[spouseId]; if (!firstPosition || !spousePosition) return null; return <path key={`spouse-${person.id}-${spouseId}`} className="spouse-link" d={spouseConnectionPath(firstPosition, spousePosition)} />; }))}
          </svg>
          {visiblePeople.map((person) => <PersonNode key={person.id} person={person} selected={person.id === selectedId} onSelect={() => selectPerson(person.id)} onDelete={() => handleDelete(person)} onAddAncestor={() => setAddMode('ancestor')} onAddDescendant={() => setAddMode('descendant')} onAddSibling={() => setAddMode('sibling')} onAddSpouse={() => setAddMode('spouse')} position={layout.positions[person.id]} />)}
       </div></div>
      </div><div className="full-tree-help"><span>Нажмите карточку супруга или супруги, чтобы открыть их ветвь.</span><span className="tree-legend"><i className="legend-parent-line" /> родитель — ребёнок <i className="legend-spouse-line" /> супруги</span><span>Стрелки клавиатуры прокручивают схему.</span></div>
      {addMode && <AddRelativeModal person={selected} mode={addMode} onClose={() => setAddMode(null)} onAdd={({ name, year, bio }) => {
        const enteredName = name.trim();
        const fullName = (addMode === 'descendant' || addMode === 'sibling') && enteredName.split(/\s+/).length === 1 ? `${enteredName} ${surnameOf(selected.name)}` : enteredName;
        const parents = addMode === 'ancestor' || addMode === 'spouse' ? [] : addMode === 'sibling' ? selected.parents : descendantParents;
        const newPerson: Person = { id: `person-${Date.now()}`, name: fullName, birthDate: { day: '', month: '', year }, deathDate: { day: '', month: '', year: '' }, isAlive: false, bio: bio || 'Пока нет заметки об этом человеке.', parents };
        if (addMode === 'ancestor') addAncestor(newPerson, selected.id);
        else if (addMode === 'sibling') addSibling(newPerson);
        else if (addMode === 'spouse') addSpouse(newPerson, selected.id);
        else addDescendant(newPerson);
        setSelectedId(newPerson.id);
        setAddMode(null);
        toast(addMode === 'ancestor' ? 'Предок добавлен в архив' : addMode === 'sibling' ? 'Брат или сестра добавлены в архив' : addMode === 'spouse' ? 'Супруг или супруга связаны с архивом' : 'Наследник добавлен в архив');
      }} />}
  </div></AppShell>;
}

function PersonPage() {
  const { people, updatePerson, toast } = useArchive();
  const [, params] = useRoute('/person/:id');
  const [, setLocation] = useLocation();
  const person = people.find((item) => item.id === params?.id) || people[0];
  const [draft, setDraft] = useState(person);
  const [saveState, setSaveState] = useState<'saved' | 'saving'>('saved');
  useEffect(() => { setDraft(person); }, [person.id]);
  useEffect(() => { if (JSON.stringify(draft) === JSON.stringify(person)) return; setSaveState('saving'); const timer = window.setTimeout(() => { updatePerson(draft); setSaveState('saved'); }, 650); return () => window.clearTimeout(timer); }, [draft]);
  const updateDate = (field: 'birthDate' | 'deathDate', key: keyof DatePart, value: string) => setDraft((current) => ({ ...current, [field]: { ...current[field], [key]: value } }));
  const handlePhoto = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) { setDraft((current) => ({ ...current, photoUrl: URL.createObjectURL(file) })); toast('Фотография добавлена'); } };
  return <AppShell><div className="main-content"><div className="page-header"><div><button className="btn btn-ghost" onClick={() => setLocation('/tree')} data-testid="button-back-tree"><ChevronLeft size={15} /> Вернуться к дереву</button><h1 style={{ marginTop: 18 }}>Карточка человека</h1></div><div className="save-status" style={{ marginTop: 0, paddingTop: 0, border: 0 }}><span className="save-dot" style={{ background: saveState === 'saving' ? 'hsl(var(--accent))' : undefined }} /> {saveState === 'saving' ? 'Сохраняем изменения…' : 'Все изменения сохранены'}</div></div>
    <div className="bio-layout"><aside className="content-card profile-card"><div className="profile-photo">{draft.photoUrl ? <img src={draft.photoUrl} alt={draft.name} data-testid="img-person-photo" /> : <div className="photo-placeholder"><ImagePlus size={25} /><span>Нет фотографии</span></div>}<label className="btn" style={{ padding: 0 }}><span style={{ position: 'absolute', inset: 0, cursor: 'pointer' }} /><span className="btn-soft" style={{ padding: '8px 10px', borderRadius: 8, fontSize: 10 }}>Добавить фото</span><input type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} data-testid="input-person-photo" /></label></div><h2>{draft.name}</h2><p>{formatDate(draft.birthDate, draft.isAlive)}</p><div className="save-status"><span className="save-dot" /> Личная запись</div></aside>
      <section className="content-card bio-card"><h1>Биография</h1><div className="form-field"><label htmlFor="person-name">Имя и фамилия</label><input id="person-name" className="form-input" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} data-testid="input-person-name" /></div><div className="field-grid"><div className="form-field"><label>Дата рождения</label><div className="date-grid"><input className="form-input" placeholder="День" value={draft.birthDate.day} onChange={(event) => updateDate('birthDate', 'day', event.target.value)} data-testid="input-birth-day" /><input className="form-input" placeholder="Месяц" value={draft.birthDate.month} onChange={(event) => updateDate('birthDate', 'month', event.target.value)} data-testid="input-birth-month" /><input className="form-input" placeholder="Год" value={draft.birthDate.year} onChange={(event) => updateDate('birthDate', 'year', event.target.value)} data-testid="input-birth-year" /></div></div><div className="form-field"><label>Дата смерти</label><div className="date-grid"><input className="form-input" placeholder="День" value={draft.deathDate.day} onChange={(event) => updateDate('deathDate', 'day', event.target.value)} disabled={draft.isAlive} data-testid="input-death-day" /><input className="form-input" placeholder="Месяц" value={draft.deathDate.month} onChange={(event) => updateDate('deathDate', 'month', event.target.value)} disabled={draft.isAlive} data-testid="input-death-month" /><input className="form-input" placeholder="Год" value={draft.deathDate.year} onChange={(event) => updateDate('deathDate', 'year', event.target.value)} disabled={draft.isAlive} data-testid="input-death-year" /></div></div></div><div className="switch-row"><div className="switch-copy"><strong>Человек жив</strong><span>Дата смерти будет скрыта, пока переключатель включён.</span></div><button className={`switch ${draft.isAlive ? 'on' : ''}`} onClick={() => setDraft({ ...draft, isAlive: !draft.isAlive })} aria-label="Переключить статус жизни" data-testid="switch-alive"><span /></button></div><div className="form-field"><label htmlFor="person-bio">История и заметки</label><textarea id="person-bio" className="form-input bio-textarea" value={draft.bio} onChange={(event) => setDraft({ ...draft, bio: event.target.value })} placeholder="Расскажите, что важно сохранить…" data-testid="textarea-person-bio" /></div></section>
    </div></div></AppShell>;
}

function SearchPage() {
  const { people } = useArchive();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const askSearch = () => { if (!query.trim()) return; setLoading(true); setResult(null); window.setTimeout(() => { const lower = query.toLowerCase(); const matches = people.filter((person) => `${person.name} ${person.bio}`.toLowerCase().includes(lower)); const sourceIds = matches.length ? matches.slice(0, 3).map((person) => person.id) : ['alexei', 'elena', 'mikhail']; setResult({ answer: matches.length ? `В архиве найдено ${matches.length} ${matches.length === 1 ? 'упоминание' : 'упоминания'} по запросу «${query}». Эти записи помогут продолжить исследование семейной истории.` : `Точного совпадения для «${query}» пока нет. Попробуйте поискать по имени, городу или семейному событию.`, sources: sourceIds }); setLoading(false); }, 900); };
  const sourcePeople = result?.sources.map((id) => people.find((person) => person.id === id)).filter(Boolean) as Person[] | undefined;
  return <AppShell><div className="main-content"><div className="page-header"><div><span className="kicker">смысловой поиск</span><h1>Спросить архив</h1><p>Ищите по именам, местам, событиям и семейным воспоминаниям.</p></div></div><div className="search-bar"><SearchIcon size={17} className="search-icon" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') askSearch(); }} placeholder="Например: где жил Алексей после войны?" data-testid="input-search-query" /><button className="btn btn-primary" onClick={askSearch} data-testid="button-run-search">Найти</button></div>{loading && <div className="content-card answer-card" style={{ marginTop: 20 }} data-testid="search-loading"><div className="loading-lines"><div className="skeleton short" /><div className="skeleton wide" /><div className="skeleton wide" /><div className="skeleton short" /></div></div>}{!loading && !result && <div className="content-card search-empty" style={{ marginTop: 20 }}><div className="search-mark"><FileSearch size={23} /></div><h2>Архив готов к вопросам</h2><p>Попробуйте спросить о человеке, который жил в Костроме, или найдите все упоминания фотографий.</p></div>}{result && <div className="content-card answer-card" data-testid="search-result"><span className="kicker">ответ архива</span><h2>Вот что удалось найти</h2><p className="answer">{result.answer}</p>{sourcePeople && <div className="sources"><div className="sources-title">Связанные записи</div><div className="source-list">{sourcePeople.map((person) => <button className="source-person" key={person.id} onClick={() => setLocation(`/person/${person.id}`)} data-testid={`link-search-source-${person.id}`}><span className="avatar">{initials(person.name)}</span><span><strong>{person.name}</strong><small>{formatDate(person.birthDate, person.isAlive)}</small></span></button>)}</div></div>}</div>}</div></AppShell>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function Router() {
  return <RoutedErrorBoundary><Switch><Route path="/" component={Landing} /><Route path="/login" component={Login} /><Route path="/setup-2fa" component={Setup2FA} /><Route path="/tree" component={TreePage} /><Route path="/person/:id" component={PersonPage} /><Route path="/search" component={SearchPage} /><Route component={NotFound} /></Switch></RoutedErrorBoundary>;
}

const queryClient = new QueryClient();

function App() {
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [toastMessage, setToastMessage] = useState('');
  const toast = (message: string) => setToastMessage(message);
  const updatePerson = (person: Person) => setPeople((current) => current.map((item) => item.id === person.id ? person : item));
  const addAncestor = (person: Person, parentId: string) => setPeople((current) => current.map((item) => item.id === parentId ? { ...item, parents: [...item.parents, person.id] } : item).concat(person));
  const insertIntoBranch = (current: Person[], person: Person) => {
    const branchKey = person.parents.slice().sort().join('|');
    if (!branchKey) return current.concat(person);
    const firstBranchIndex = current.findIndex((item) => item.parents.slice().sort().join('|') === branchKey);
    return firstBranchIndex < 0 ? current.concat(person) : [...current.slice(0, firstBranchIndex), person, ...current.slice(firstBranchIndex)];
  };
  const addDescendant = (person: Person) => setPeople((current) => insertIntoBranch(current, person));
  const addSibling = (person: Person) => setPeople((current) => insertIntoBranch(current, person));
  const addSpouse = (person: Person, spouseId: string) => setPeople((current) => {
    const updated = current.map((item) => item.id === spouseId
      ? { ...item, spouses: [...new Set([...(item.spouses || []), person.id])] }
      : item);
    return insertIntoBranch(updated, { ...person, spouses: [...new Set([...(person.spouses || []), spouseId])] });
  });
  const deletePerson = (id: string) => setPeople((current) => current.filter((person) => person.id !== id).map((person) => ({ ...person, parents: person.parents.filter((parentId) => parentId !== id) })));
  const contextValue = useMemo(() => ({ people, updatePerson, addAncestor, addDescendant, addSibling, addSpouse, deletePerson, toast }), [people]);
  return <QueryClientProvider client={queryClient}><TooltipProvider><ArchiveContext.Provider value={contextValue}><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></ArchiveContext.Provider></TooltipProvider>{toastMessage && <ToastMessage message={toastMessage} onClose={() => setToastMessage('')} />}</QueryClientProvider>;
}

export default App;