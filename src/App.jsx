import { useState } from 'react';
import { useAuth } from './hooks/useAuth.js';
import { useReadingData } from './hooks/useReadingData.js';
import { isSupabaseConfigured } from './supabaseClient.js';
import LoginPage from './pages/LoginPage.jsx';
import ShelfPage from './pages/ShelfPage.jsx';
import BookDetailPage from './pages/BookDetailPage.jsx';
import RecordsPage from './pages/RecordsPage.jsx';
import MissionsArchivePage from './pages/MissionsArchivePage.jsx';
import TogetherPage from './pages/TogetherPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import MyPage from './pages/MyPage.jsx';
import NavBar from './components/NavBar.jsx';
import AddBookDialog from './components/AddBookDialog.jsx';

export default function App() {
  const { user, profile, loading, signIn, signUp, signOut, updateNickname, updateAvatar, reloadProfile } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="center-screen">
        <div className="blueprint auth-card" style={{ textAlign: 'left' }}>
          <h3>설정이 필요해요</h3>
          <p style={{ fontSize: 14 }}>
            <code>.env.example</code>을 복사해 <code>.env.local</code>을 만들고
            Supabase 프로젝트의 URL과 anon key를 채워주세요. 자세한 방법은 README.md를 참고하세요.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="center-screen">불러오는 중...</div>;
  }

  if (!user) {
    return <LoginPage onSignIn={signIn} onSignUp={signUp} />;
  }

  return (
    <AppShell
      user={user} profile={profile} onLogout={signOut} onProfileChanged={reloadProfile}
      onUpdateNickname={updateNickname} onUpdateAvatar={updateAvatar}
    />
  );
}

function AppShell({ user, profile, onLogout, onProfileChanged, onUpdateNickname, onUpdateAvatar }) {
  const [screen, setScreen] = useState('shelf');
  const [activeBookId, setActiveBookId] = useState(null);
  const [activeTag, setActiveTag] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const {
    books, records, questions, missions, pageLogs,
    addBook, addBooksBulk, updateBook, updateRating, deleteBook, setBookProgress, addRecord, deleteRecord,
    saveQuestionAnswer, updateQuestion, deleteQuestion, addMissions, toggleMission, deleteMission,
    shareRecord, shareQuestion, shareMission, shareBook,
  } = useReadingData(user.id);

  const nickname = profile?.nickname || user.email?.split('@')[0] || '독서가';
  const isAdmin = !!profile?.is_admin;

  const openBook = (id) => { setActiveBookId(id); setScreen('detail'); };
  const openTag = (tag) => { setActiveTag(tag || null); setScreen('tags'); };
  const navigate = (key) => { setScreen(key); if (key === 'tags') setActiveTag(null); };

  const activeBook = books.find((b) => b.id === activeBookId) || null;

  return (
    <div className="app-shell">
      <NavBar
        screen={screen}
        nickname={nickname}
        isAdmin={isAdmin}
        onNavigate={navigate}
        onOpenAddDialog={() => setShowAddDialog(true)}
        onLogout={onLogout}
      />
      <div className="container">
        {screen === 'shelf' && (
          <ShelfPage books={books} onOpenBook={openBook} />
        )}

        {screen === 'detail' && activeBook && (
          <BookDetailPage
            userId={user.id}
            book={activeBook}
            records={records}
            questions={questions}
            missions={missions}
            profile={profile}
            onAiUsed={onProfileChanged}
            onBack={() => setScreen('shelf')}
            onSetProgress={setBookProgress}
            onAddRecord={addRecord}
            onDeleteRecord={deleteRecord}
            onSaveQuestion={saveQuestionAnswer}
            onUpdateQuestion={updateQuestion}
            onDeleteQuestion={deleteQuestion}
            onAddMissions={addMissions}
            onToggleMission={toggleMission}
            onDeleteMission={deleteMission}
            onOpenTag={openTag}
            onGoMissionsArchive={() => setScreen('missions')}
            onUpdateBook={updateBook}
            onDeleteBook={deleteBook}
            onShareRecord={shareRecord}
            onShareQuestion={shareQuestion}
            onShareMission={shareMission}
            onShareBook={shareBook}
            onUpdateRating={updateRating}
          />
        )}

        {screen === 'together' && (
          <TogetherPage userId={user.id} nickname={nickname} />
        )}

        {screen === 'tags' && (
          <RecordsPage records={records} books={books} pageLogs={pageLogs} onOpenBook={openBook} activeTag={activeTag} onSelectTag={setActiveTag} />
        )}

        {screen === 'missions' && (
          <MissionsArchivePage missions={missions} books={books} onOpenBook={openBook} onToggle={toggleMission} />
        )}

        {screen === 'mypage' && (
          <MyPage
            userId={user.id} profile={profile} books={books}
            onUpdateNickname={onUpdateNickname} onUpdateAvatar={onUpdateAvatar} onImportBooks={addBooksBulk}
          />
        )}

        {screen === 'admin' && isAdmin && <AdminPage />}
      </div>

      {showAddDialog && (
        <AddBookDialog
          userId={user.id}
          onClose={() => setShowAddDialog(false)}
          onSubmit={async (payload) => { await addBook(payload); setShowAddDialog(false); }}
        />
      )}
    </div>
  );
}
