import { useState } from 'react';
import AnnualView from './AnnualView.jsx';
import CalendarView from './CalendarView.jsx';
import TagsPage from './TagsPage.jsx';

export default function RecordsPage({ records, books, pageLogs, onOpenBook, activeTag, onSelectTag }) {
  // 태그를 클릭해서 들어온 경우(활성 태그가 이미 있는 경우)에는 태그 모음 화면으로 바로 진입
  const [view, setView] = useState(activeTag ? 'tags' : 'annual');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 22 }}>
        <h2 style={{ margin: 0 }}>기록 모아보기</h2>
        <div className="seg">
          <label className="seg-opt">
            <input type="radio" name="recordsView" checked={view === 'annual'} onChange={() => setView('annual')} />
            연간기록
          </label>
          <label className="seg-opt">
            <input type="radio" name="recordsView" checked={view === 'calendar'} onChange={() => setView('calendar')} />
            캘린더
          </label>
          <label className="seg-opt">
            <input type="radio" name="recordsView" checked={view === 'tags'} onChange={() => setView('tags')} />
            태그 모음
          </label>
        </div>
      </div>

      {view === 'annual' && <AnnualView records={records} books={books} pageLogs={pageLogs} />}
      {view === 'calendar' && <CalendarView records={records} books={books} onOpenBook={onOpenBook} />}
      {view === 'tags' && (
        <TagsPage
          records={records} books={books} onOpenBook={onOpenBook}
          activeTag={activeTag} onSelectTag={onSelectTag} noHeading
        />
      )}
    </div>
  );
}
