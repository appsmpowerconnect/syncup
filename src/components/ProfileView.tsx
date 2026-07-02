import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, WeeklyAvailability, TimeSlot } from '../types';
import { Clock, Check, AlertCircle, Plus, Trash2, Globe } from 'lucide-react';

interface ProfileViewProps {
  user: any;
}

const DAYS_TRANSLATION: { [key: string]: string } = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const INITIAL_AVAILABILITY: WeeklyAvailability = {
  monday: [{ start: '09:00', end: '18:00' }],
  tuesday: [{ start: '09:00', end: '18:00' }],
  wednesday: [{ start: '09:00', end: '18:00' }],
  thursday: [{ start: '09:00', end: '18:00' }],
  friday: [{ start: '09:00', end: '18:00' }],
  saturday: [],
  sunday: [],
};

const COMMON_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Noronha',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'UTC',
];

export default function ProfileView({ user }: ProfileViewProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for adding slots
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [newStart, setNewStart] = useState('09:00');
  const [newEnd, setNewEnd] = useState('18:00');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const docRef = doc(db, 'users', user.uid);
      try {
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          // Initialize profile
          const newProfile: UserProfile = {
            uid: user.uid,
            displayName: user.displayName || 'Usuário',
            email: user.email || '',
            photoURL: user.photoURL || '',
            weeklyAvailability: INITIAL_AVAILABILITY,
            timeZone: 'America/Sao_Paulo',
            createdAt: new Date().toISOString(),
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } catch (err: any) {
        console.error('Erro ao buscar perfil:', err);
        setError('Não foi possível carregar seu perfil.');
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await setDoc(doc(db, 'users', user.uid), profile);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Erro ao salvar perfil:', err);
      setError('Erro ao salvar as alterações no perfil.');
      handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTimezoneChange = (tz: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      timeZone: tz,
    });
  };

  const handleDeleteSlot = (day: keyof WeeklyAvailability, index: number) => {
    if (!profile) return;
    const updatedDaySlots = [...profile.weeklyAvailability[day]];
    updatedDaySlots.splice(index, 1);

    setProfile({
      ...profile,
      weeklyAvailability: {
        ...profile.weeklyAvailability,
        [day]: updatedDaySlots,
      },
    });
  };

  const handleAddSlot = (day: keyof WeeklyAvailability) => {
    if (!profile) return;

    // Basic validation
    if (newStart >= newEnd) {
      alert('O horário de início deve ser anterior ao horário de fim.');
      return;
    }

    const updatedDaySlots = [...profile.weeklyAvailability[day], { start: newStart, end: newEnd }];
    // Sort slots chronologically
    updatedDaySlots.sort((a, b) => a.start.localeCompare(b.start));

    setProfile({
      ...profile,
      weeklyAvailability: {
        ...profile.weeklyAvailability,
        [day]: updatedDaySlots,
      },
    });

    setActiveDay(null); // Close form
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96" id="profile-loading">
        <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" id="profile-view">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="profile-title-bar">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Meu Perfil</h1>
          <p className="text-slate-500 mt-1">Configure seu fuso horário e sua grade de horários disponíveis.</p>
        </div>
        <div className="flex items-center gap-3">
          {success && (
            <span className="flex items-center text-emerald-600 text-sm font-semibold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
              <Check className="h-4 w-4 mr-1.5" /> Salvo com sucesso!
            </span>
          )}
          {error && (
            <span className="flex items-center text-red-600 text-sm font-semibold bg-red-50 px-3 py-1.5 rounded-xl border border-red-100">
              <AlertCircle className="h-4 w-4 mr-1.5" /> {error}
            </span>
          )}
          <button
            id="save-profile-btn"
            onClick={handleSaveProfile}
            disabled={saving}
            className="px-6 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-sm hover:shadow flex items-center gap-2"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="profile-content-grid">
        {/* Left Column: Info and Timezone */}
        <div className="space-y-6 md:col-span-1" id="profile-left-column">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col items-center text-center space-y-2 pb-4 border-b border-slate-100">
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt={profile.displayName} className="h-20 w-20 rounded-full border border-slate-200 shadow-inner" />
              ) : (
                <div className="h-20 w-20 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-2xl border border-brand-200">
                  {profile?.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="font-extrabold text-slate-900 text-lg mt-2">{profile?.displayName}</h3>
              <p className="text-sm text-slate-400">{profile?.email}</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-slate-400" /> Fuso Horário
              </label>
              <select
                id="timezone-select"
                value={profile?.timeZone || 'America/Sao_Paulo'}
                onChange={(e) => handleTimezoneChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Right Column: Weekly Availability Grid */}
        <div className="md:col-span-2 space-y-6" id="profile-right-column">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
              <Clock className="h-5 w-5 text-brand-600" />
              <h2 className="text-lg font-extrabold text-slate-900">Grade de Disponibilidade Semanal</h2>
            </div>

            <div className="space-y-4" id="availability-list">
              {profile &&
                Object.keys(DAYS_TRANSLATION).map((dayKey) => {
                  const day = dayKey as keyof WeeklyAvailability;
                  const slots = profile.weeklyAvailability[day] || [];
                  const isFormOpen = activeDay === day;

                  return (
                    <div key={day} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3" id={`availability-${day}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">
                          {DAYS_TRANSLATION[day]}
                        </span>
                        <button
                          id={`add-slot-btn-${day}`}
                          onClick={() => {
                            setActiveDay(isFormOpen ? null : day);
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700 bg-white border border-brand-200 rounded-lg px-2.5 py-1 hover:bg-brand-50 transition"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      </div>

                      {/* Add Slot Form */}
                      {isFormOpen && (
                        <div className="bg-white p-3 rounded-lg border border-brand-100 grid grid-cols-3 gap-2 items-center" id={`add-form-${day}`}>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Início</label>
                            <input
                              type="time"
                              value={newStart}
                              onChange={(e) => setNewStart(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                            <input
                              type="time"
                              value={newEnd}
                              onChange={(e) => setNewEnd(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                            />
                          </div>
                          <div className="flex justify-end gap-1.5 pt-4">
                            <button
                              id={`cancel-slot-${day}`}
                              onClick={() => setActiveDay(null)}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                            >
                              Cancelar
                            </button>
                            <button
                              id={`confirm-slot-${day}`}
                              onClick={() => handleAddSlot(day)}
                              className="bg-brand-600 hover:bg-brand-700 text-white px-2 py-1.5 rounded font-bold text-xs"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Active slots */}
                      {slots.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhum horário disponível configurado. Indisponível o dia todo.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2" id={`slots-container-${day}`}>
                          {slots.map((slot, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700 shadow-sm hover:border-red-200 hover:bg-red-50/20 transition group"
                            >
                              <span>
                                {slot.start} – {slot.end}
                              </span>
                              <button
                                id={`delete-slot-btn-${day}-${index}`}
                                onClick={() => handleDeleteSlot(day, index)}
                                className="text-slate-400 hover:text-red-600 transition"
                                title="Remover horário"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
