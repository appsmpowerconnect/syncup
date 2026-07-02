import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Group, UserProfile, WeeklyAvailability, TimeSlot } from '../types';
import { Eye, Users, Calendar, AlertCircle, HelpCircle, Check, Info } from 'lucide-react';

interface EspiarViewProps {
  user: any;
  selectedGroupId: string | null;
  setSelectedGroupId: (id: string | null) => void;
}

const DAYS_TRANSLATION: { [key: string]: string } = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

// 1-hour slots from 08:00 to 20:00
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function EspiarView({ user, selectedGroupId, setSelectedGroupId }: EspiarViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [membersProfiles, setMembersProfiles] = useState<UserProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
      const match = groups.find((g) => g.id === selectedGroupId);
      if (match) {
        setActiveGroup(match);
        fetchMembersProfiles(match);
      }
    }
  }, [selectedGroupId, groups]);

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      const q = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      const snap = await getDocs(q);
      const list: Group[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Group);
      });
      setGroups(list);
    } catch (err: any) {
      console.error('Erro ao buscar grupos:', err);
      handleFirestoreError(err, OperationType.GET, 'groups');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMembersProfiles = async (group: Group) => {
    setLoadingProfiles(true);
    try {
      const profilesList: UserProfile[] = [];
      // Query profiles of all members
      for (const uid of group.members) {
        const docRef = doc(db, 'users', uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          profilesList.push(snap.data() as UserProfile);
        }
      }
      setMembersProfiles(profilesList);
    } catch (err: any) {
      console.error('Erro ao buscar perfis dos membros:', err);
      handleFirestoreError(err, OperationType.GET, 'users');
    } finally {
      setLoadingProfiles(false);
    }
  };

  const handleGroupSelectChange = (groupId: string) => {
    if (!groupId) {
      setActiveGroup(null);
      setSelectedGroupId(null);
      setMembersProfiles([]);
      return;
    }
    const match = groups.find((g) => g.id === groupId);
    if (match) {
      setActiveGroup(match);
      setSelectedGroupId(groupId);
      fetchMembersProfiles(match);
    }
  };

  // Check if a user is available at a specific day & hour slot (HH:MM)
  const isUserAvailable = (profile: UserProfile, day: string, hourStr: string) => {
    const dayKey = day as keyof WeeklyAvailability;
    const slots = profile.weeklyAvailability?.[dayKey] || [];

    // Parse current hour slot
    const [h, m] = hourStr.split(':').map(Number);
    const slotMinutes = h * 60 + m;

    return slots.some((s) => {
      const [startH, startM] = s.start.split(':').map(Number);
      const [endH, endM] = s.end.split(':').map(Number);
      const startMin = startH * 60 + startM;
      const endMin = endH * 60 + endM;

      return slotMinutes >= startMin && slotMinutes < endMin;
    });
  };

  // Get overlap counts for all slots
  const getOverlapStats = () => {
    const totalMembers = membersProfiles.length;
    if (totalMembers === 0) return null;

    const stats: { [day: string]: { [time: string]: { count: number; users: string[] } } } = {};

    Object.keys(DAYS_TRANSLATION).forEach((day) => {
      stats[day] = {};
      TIME_SLOTS.forEach((time) => {
        const availableUsers: string[] = [];
        membersProfiles.forEach((profile) => {
          if (isUserAvailable(profile, day, time)) {
            availableUsers.push(profile.displayName);
          }
        });
        stats[day][time] = {
          count: availableUsers.length,
          users: availableUsers,
        };
      });
    });

    return stats;
  };

  const stats = getOverlapStats();

  // Find the absolute best common sync windows (where density of availability is highest)
  const getBestSyncWindows = () => {
    if (!stats || membersProfiles.length === 0) return [];

    const windows: { day: string; time: string; count: number; percent: number; users: string[] }[] = [];

    Object.entries(stats).forEach(([day, times]) => {
      Object.entries(times).forEach(([time, data]) => {
        const percent = Math.round((data.count / membersProfiles.length) * 100);
        if (percent >= 50) { // Highlight slots with at least 50% availability
          windows.push({
            day,
            time,
            count: data.count,
            percent,
            users: data.users,
          });
        }
      });
    });

    // Sort by percentage/count descending
    windows.sort((a, b) => b.percent - a.percent);
    return windows.slice(0, 5); // return top 5
  };

  const bestWindows = getBestSyncWindows();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8" id="espiar-view">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="espiar-title-bar">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Eye className="h-7 w-7 text-brand-600" /> Espiar Disponibilidade
          </h1>
          <p className="text-slate-500 mt-1">Veja onde as agendas da sua equipe se sobrepõem e marque reuniões no melhor horário comum.</p>
        </div>

        {/* Dropdown to select active group */}
        <div className="w-full md:w-64" id="group-selector">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Selecione o Grupo</label>
          <select
            id="group-espiar-select"
            value={activeGroup?.id || ''}
            onChange={(e) => handleGroupSelectChange(e.target.value)}
            disabled={loadingGroups}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-brand-500 focus:outline-none shadow-sm transition"
          >
            <option value="">-- Escolha um Grupo --</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} ({g.members.length} membros)
              </option>
            ))}
          </select>
        </div>
      </div>

      {!activeGroup ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm flex flex-col justify-center items-center py-20">
          <Eye className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="font-extrabold text-slate-700 text-lg">Selecione um grupo para espiar</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">Para visualizar o mapa de sobreposição de horários, escolha um dos seus grupos no menu acima.</p>
        </div>
      ) : loadingProfiles ? (
        <div className="flex justify-center items-center h-64">
          <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      ) : membersProfiles.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm flex flex-col justify-center items-center py-20">
          <AlertCircle className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="font-extrabold text-slate-700 text-lg">Nenhum membro configurado</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm">Os membros deste grupo ainda não completaram ou salvaram seus perfis com disponibilidade.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="espiar-content">
          {/* Overlap Heat Map Grid */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4" id="espiar-heatmap-panel">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Mapa de Calor de Disponibilidade</h2>
              <p className="text-xs text-slate-500 mt-0.5">Cores mais escuras representam maior quantidade de membros disponíveis simultaneamente.</p>
            </div>

            {/* Heat map visual grid */}
            <div className="overflow-x-auto scrollbar-none" id="heatmap-scrollable">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr>
                    <th className="py-2 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-200 w-24">Dia / Hora</th>
                    {TIME_SLOTS.map((time) => (
                      <th key={time} className="py-2 px-2 text-center text-xs font-bold text-slate-400 border-b border-slate-200">
                        {time}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stats &&
                    Object.entries(DAYS_TRANSLATION).map(([dayKey, dayLabel]) => (
                      <tr key={dayKey} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-xs font-bold text-slate-700 border-b border-slate-100 bg-slate-50">{dayLabel}</td>
                        {TIME_SLOTS.map((time) => {
                          const slotData = stats[dayKey]?.[time] || { count: 0, users: [] };
                          const total = membersProfiles.length;
                          const ratio = slotData.count / total;

                          // Color classes based on availability density
                          let bgClass = 'bg-white';
                          let textClass = 'text-slate-400';

                          if (ratio > 0.8) {
                            bgClass = 'bg-brand-600';
                            textClass = 'text-white font-bold';
                          } else if (ratio > 0.5) {
                            bgClass = 'bg-brand-400';
                            textClass = 'text-white font-bold';
                          } else if (ratio > 0.2) {
                            bgClass = 'bg-brand-100';
                            textClass = 'text-brand-800 font-semibold';
                          } else if (ratio > 0) {
                            bgClass = 'bg-brand-50/50';
                            textClass = 'text-brand-600';
                          }

                          return (
                            <td
                              key={time}
                              className={`p-1 border-b border-slate-100 text-center transition-all ${bgClass}`}
                              title={`${slotData.count}/${total} disponíveis: ${slotData.users.join(', ')}`}
                            >
                              <div className={`text-xs h-8 w-8 mx-auto rounded-lg flex items-center justify-center ${textClass}`}>
                                {slotData.count}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Legend info */}
            <div className="flex items-center gap-6 pt-4 text-xs font-semibold text-slate-500 border-t border-slate-100">
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-brand-600 rounded-md"></span> Excelente (80%+)</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-brand-400 rounded-md"></span> Bom (50%-80%)</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-brand-100 rounded-md"></span> Parcial (20%-50%)</span>
              <span className="flex items-center gap-1.5"><span className="h-3.5 w-3.5 bg-white border border-slate-200 rounded-md"></span> Sem disponibilidade</span>
            </div>
          </div>

          {/* Golden Windows list */}
          <div className="lg:col-span-1 space-y-6" id="espiar-recommendations">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                  ⭐ Horários de Ouro
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">As melhores janelas comuns identificadas para o grupo.</p>
              </div>

              {bestWindows.length === 0 ? (
                <div className="bg-slate-50 p-4 rounded-xl text-center text-slate-500 text-xs">
                  <Info className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                  Nenhuma sobreposição de horário com mais de 50% de adesão encontrada. Redefina ou adicione mais horários no perfil.
                </div>
              ) : (
                <div className="space-y-3">
                  {bestWindows.map((win, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-brand-200 transition space-y-2"
                      id={`golden-window-${idx}`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-1 rounded-lg border border-brand-100 uppercase">
                          {DAYS_TRANSLATION[win.day]} • {win.time}
                        </span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                          {win.percent}%
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        <span className="font-bold text-slate-700">Disponíveis ({win.count}):</span> {win.users.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
