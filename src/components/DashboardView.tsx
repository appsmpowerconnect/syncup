import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PersonalEvent, Group, EventProposal } from '../types';
import { Calendar, Users, Eye, ArrowRight, Clock, Check, HelpCircle, X, CheckSquare, PlusCircle } from 'lucide-react';

interface DashboardViewProps {
  user: any;
  setView: (view: string) => void;
  setSelectedGroupId: (id: string) => void;
}

export default function DashboardView({ user, setView, setSelectedGroupId }: DashboardViewProps) {
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingProposals, setPendingProposals] = useState<EventProposal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user's personal events
      const eventQuery = query(
        collection(db, 'personalEvents'),
        where('userId', '==', user.uid)
      );
      const eventSnap = await getDocs(eventQuery);
      const eventList: PersonalEvent[] = [];
      eventSnap.forEach((d) => {
        eventList.push(d.data() as PersonalEvent);
      });
      // Sort chronologically and take next 3
      eventList.sort((a, b) => {
        const dComp = a.date.localeCompare(b.date);
        if (dComp !== 0) return dComp;
        return a.startTime.localeCompare(b.startTime);
      });
      setEvents(eventList.slice(0, 3));

      // 2. Fetch user's groups
      const groupQuery = query(
        collection(db, 'groups'),
        where('members', 'array-contains', user.uid)
      );
      const groupSnap = await getDocs(groupQuery);
      const groupList: Group[] = [];
      groupSnap.forEach((d) => {
        groupList.push(d.data() as Group);
      });
      setGroups(groupList);

      // 3. Fetch pending proposals in these groups
      if (groupList.length > 0) {
        const groupIds = groupList.map((g) => g.id);
        const proposalQuery = query(
          collection(db, 'eventProposals'),
          where('groupId', 'in', groupIds)
        );
        const proposalSnap = await getDocs(proposalQuery);
        const proposalList: EventProposal[] = [];
        proposalSnap.forEach((d) => {
          const prop = d.data() as EventProposal;
          // Filter proposals where user hasn't voted yet AND status is pending
          if (prop.status === 'pending' && !prop.votes?.[user.uid]) {
            proposalList.push(prop);
          }
        });
        setPendingProposals(proposalList);
      } else {
        setPendingProposals([]);
      }
    } catch (err: any) {
      console.error('Erro ao buscar dados do Painel:', err);
      // Fail gracefully or handle
    } finally {
      setLoading(false);
    }
  };

  const handleVoteFromDashboard = async (proposal: EventProposal, voteType: 'yes' | 'no' | 'maybe') => {
    try {
      const docRef = doc(db, 'eventProposals', proposal.id);
      const updatedVotes = {
        ...proposal.votes,
        [user.uid]: voteType,
      };

      await updateDoc(docRef, {
        votes: updatedVotes,
      });

      // Remove from local list as they voted
      setPendingProposals(pendingProposals.filter((p) => p.id !== proposal.id));
    } catch (err: any) {
      console.error('Erro ao votar:', err);
      handleFirestoreError(err, OperationType.UPDATE, `eventProposals/${proposal.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96" id="dashboard-loading">
        <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8" id="dashboard-view">
      {/* Greeting Banner */}
      <div className="bg-gradient-to-r from-brand-600 to-indigo-600 text-white p-6 sm:p-8 rounded-3xl shadow-lg border border-brand-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" id="dashboard-banner">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Olá, {user.displayName || 'Usuário'}!
          </h1>
          <p className="text-brand-100 text-sm mt-1">
            Seja bem-vindo de volta ao SyncUp. Vamos sincronizar suas agendas hoje?
          </p>
        </div>
        <button
          id="btn-banner-espiar"
          onClick={() => setView('espiar')}
          className="flex items-center gap-1 bg-white hover:bg-brand-50 text-brand-700 font-bold px-4 py-2.5 rounded-xl text-xs transition shadow"
        >
          Espiar Horários Livres <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Numerical Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6" id="dashboard-highlights">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Grupos de Sincronia</span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">{groups.length}</span>
          </div>
          <div className="p-3 bg-brand-50 text-brand-600 rounded-2xl">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Eventos Agendados</span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">{events.length}</span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Votos Pendentes</span>
            <span className="text-3xl font-black text-slate-900 mt-1 block">{pendingProposals.length}</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <CheckSquare className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="dashboard-bento">
        {/* Next events list */}
        <div className="lg:col-span-2 space-y-6" id="dashboard-left-bento">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Clock className="h-5 w-5 text-brand-600" /> Próximos Compromissos
              </h2>
              <button
                id="view-all-agenda"
                onClick={() => setView('agenda')}
                className="text-xs font-bold text-brand-600 hover:underline"
              >
                Ver tudo &rarr;
              </button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-10 text-slate-400 italic text-sm">
                Nenhum compromisso marcado para os próximos dias.
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((evt) => (
                  <div
                    key={evt.id}
                    id={`dash-event-${evt.id}`}
                    className="p-4 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-200 flex justify-between items-center transition"
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">{evt.title}</h4>
                      {evt.description && <p className="text-xs text-slate-500 line-clamp-1">{evt.description}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-brand-600 block">{evt.startTime} – {evt.endTime}</span>
                      <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{evt.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Votes Section */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-lg font-extrabold text-slate-900">Votação de Reuniões Pendente</h2>
              <p className="text-xs text-slate-500 mt-0.5">Diga aos grupos se você está disponível para estas propostas de horários.</p>
            </div>

            {pendingProposals.length === 0 ? (
              <div className="text-center py-8 text-slate-400 italic text-sm">
                Tudo em dia! Sem propostas pendentes para votar.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    id={`dash-prop-vote-${proposal.id}`}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <span className="text-[9px] font-extrabold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {proposal.groupName}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">{proposal.title}</h4>
                      <p className="text-xs text-slate-500 font-semibold mt-1">📅 {proposal.proposedDate} • ⏰ {proposal.proposedTimeStart} - {proposal.proposedTimeEnd}</p>
                    </div>

                    <div className="flex items-center gap-1.5" id={`vote-actions-${proposal.id}`}>
                      <button
                        id={`dash-vote-yes-${proposal.id}`}
                        onClick={() => handleVoteFromDashboard(proposal, 'yes')}
                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 rounded-lg transition"
                        title="Estou disponível (Sim)"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </button>
                      <button
                        id={`dash-vote-maybe-${proposal.id}`}
                        onClick={() => handleVoteFromDashboard(proposal, 'maybe')}
                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200 rounded-lg transition"
                        title="Talvez disponível"
                      >
                        <HelpCircle className="h-4.5 w-4.5" />
                      </button>
                      <button
                        id={`dash-vote-no-${proposal.id}`}
                        onClick={() => handleVoteFromDashboard(proposal, 'no')}
                        className="p-2 bg-white border border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg transition"
                        title="Indisponível (Não)"
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick action menu */}
        <div className="lg:col-span-1 space-y-6" id="dashboard-right-bento">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3">Atalhos de Sincronia</h3>
            <div className="grid grid-cols-1 gap-3" id="quick-actions-list">
              <button
                id="qa-set-avail"
                onClick={() => setView('profile')}
                className="w-full p-4 bg-slate-50 hover:bg-brand-50/50 rounded-2xl border border-slate-200 hover:border-brand-200 text-left transition flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Definir Disponibilidade</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Configure suas horas livres semanais.</p>
                </div>
                <Clock className="h-5 w-5 text-brand-600" />
              </button>

              <button
                id="qa-create-group"
                onClick={() => setView('groups')}
                className="w-full p-4 bg-slate-50 hover:bg-brand-50/50 rounded-2xl border border-slate-200 hover:border-brand-200 text-left transition flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Gerenciar Grupos</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Crie ou participe de equipes.</p>
                </div>
                <Users className="h-5 w-5 text-brand-600" />
              </button>

              <button
                id="qa-espiar-group"
                onClick={() => setView('espiar')}
                className="w-full p-4 bg-slate-50 hover:bg-brand-50/50 rounded-2xl border border-slate-200 hover:border-brand-200 text-left transition flex items-center justify-between"
              >
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Espiar Calendários</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Compare e encontre o horário ideal.</p>
                </div>
                <Eye className="h-5 w-5 text-brand-600" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
