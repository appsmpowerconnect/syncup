import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { UserProfile, WeeklyAvailability } from './types';

// Components
import Header from './components/Header';
import AuthView from './components/AuthView';
import DashboardView from './components/DashboardView';
import AgendaView from './components/AgendaView';
import GroupsView from './components/GroupsView';
import EspiarView from './components/EspiarView';
import ProfileView from './components/ProfileView';

const INITIAL_AVAILABILITY: WeeklyAvailability = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [],
  sunday: [],
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentView, setView] = useState<string>('dashboard');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (currentUser) {
        setProfileLoading(true);
        const docRef = doc(db, 'users', currentUser.uid);
        try {
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          } else {
            // Document does not exist; create a default profile
            const defaultProfile: UserProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Usuário do SyncUp',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              weeklyAvailability: INITIAL_AVAILABILITY,
              timeZone: 'America/Sao_Paulo',
              createdAt: new Date().toISOString(),
            };
            await setDoc(docRef, defaultProfile);
            setProfile(defaultProfile);
          }
        } catch (err) {
          console.error('Erro ao verificar perfil do usuário:', err);
          // Don't crash the app, fallback to basic profile info from Google Auth
          setProfile({
            uid: currentUser.uid,
            displayName: currentUser.displayName || 'Usuário',
            email: currentUser.email || '',
            photoURL: currentUser.photoURL || '',
            weeklyAvailability: INITIAL_AVAILABILITY,
            timeZone: 'America/Sao_Paulo',
            createdAt: new Date().toISOString(),
          });
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <DashboardView
            user={user}
            setView={setView}
            setSelectedGroupId={(id) => {
              setSelectedGroupId(id);
              setView('groups');
            }}
          />
        );
      case 'agenda':
        return <AgendaView user={user} />;
      case 'groups':
        return (
          <GroupsView
            user={user}
            setView={setView}
            setSelectedGroupId={(id) => {
              setSelectedGroupId(id);
              setView('espiar');
            }}
          />
        );
      case 'espiar':
        return (
          <EspiarView
            user={user}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
          />
        );
      case 'profile':
        return <ProfileView user={user} />;
      default:
        return (
          <DashboardView
            user={user}
            setView={setView}
            setSelectedGroupId={(id) => {
              setSelectedGroupId(id);
              setView('groups');
            }}
          />
        );
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center" id="app-loading">
        <div className="space-y-4 text-center">
          <svg className="animate-spin h-10 w-10 text-brand-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm font-bold text-slate-500">Iniciando SyncUp...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col" id="syncup-app-root">
      <Header currentView={currentView} setView={setView} user={user} />
      <main className="flex-grow py-6" id="syncup-main">
        {renderView()}
      </main>
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-400 font-semibold" id="syncup-footer">
        SyncUp &copy; 2026 • Sincronia Inteligente de Calendários
      </footer>
    </div>
  );
}
