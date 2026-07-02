import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Group, EventProposal } from '../types';
import { Users, Plus, UserPlus, FileText, Calendar, Check, X, HelpCircle, Copy, ClipboardCheck } from 'lucide-react';

interface GroupsViewProps {
  user: any;
  setView: (view: string) => void;
  setSelectedGroupId: (id: string) => void;
}

export default function GroupsView({ user, setView, setSelectedGroupId }: GroupsViewProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'join'>('list');

  // Create Group Form
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Join Group Form
  const [groupCode, setGroupCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Selected Group Details
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [copiedId, setCopiedId] = useState(false);

  // New Event Proposal Form
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDesc, setProposalDesc] = useState('');
  const [proposalDate, setProposalDate] = useState('');
  const [proposalStart, setProposalStart] = useState('09:00');
  const [proposalEnd, setProposalEnd] = useState('10:00');
  const [proposing, setProposing] = useState(false);
  const [proposals, setProposals] = useState<EventProposal[]>([]);
  const [loadingProposals, setLoadingProposals] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, [user]);

  const fetchGroups = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const fetchGroupProposals = async (groupId: string) => {
    setLoadingProposals(true);
    try {
      const q = query(
        collection(db, 'eventProposals'),
        where('groupId', '==', groupId)
      );
      const snap = await getDocs(q);
      const list: EventProposal[] = [];
      snap.forEach((d) => {
        list.push(d.data() as EventProposal);
      });
      setProposals(list);
    } catch (err: any) {
      console.error('Erro ao buscar propostas:', err);
      handleFirestoreError(err, OperationType.GET, 'eventProposals');
    } finally {
      setLoadingProposals(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    setCreating(true);

    const newGroupId = 'grp_' + Math.random().toString(36).substring(2, 10);
    const newGroup: Group = {
      id: newGroupId,
      name: groupName,
      description: groupDesc,
      creatorId: user.uid,
      creatorName: user.displayName || 'Usuário',
      members: [user.uid],
      memberDetails: {
        [user.uid]: {
          displayName: user.displayName || 'Usuário',
          email: user.email || '',
          photoURL: user.photoURL || '',
        },
      },
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'groups', newGroupId), newGroup);
      setGroupName('');
      setGroupDesc('');
      await fetchGroups();
      setSelectedGroup(newGroup);
      setActiveTab('list');
    } catch (err: any) {
      console.error('Erro ao criar grupo:', err);
      handleFirestoreError(err, OperationType.CREATE, `groups/${newGroupId}`);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupCode.trim()) return;
    setJoining(true);

    try {
      const docRef = doc(db, 'groups', groupCode.trim());
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        alert('Grupo não encontrado. Verifique o código e tente novamente.');
        setJoining(false);
        return;
      }

      const existingGroup = snap.data() as Group;
      if (existingGroup.members.includes(user.uid)) {
        alert('Você já faz parte deste grupo!');
        setSelectedGroup(existingGroup);
        setActiveTab('list');
        setGroupCode('');
        setJoining(false);
        return;
      }

      const updatedMembers = [...existingGroup.members, user.uid];
      const updatedDetails = {
        ...existingGroup.memberDetails,
        [user.uid]: {
          displayName: user.displayName || 'Usuário',
          email: user.email || '',
          photoURL: user.photoURL || '',
        },
      };

      await updateDoc(docRef, {
        members: updatedMembers,
        memberDetails: updatedDetails,
      });

      setGroupCode('');
      await fetchGroups();
      setSelectedGroup({ ...existingGroup, members: updatedMembers, memberDetails: updatedDetails });
      setActiveTab('list');
    } catch (err: any) {
      console.error('Erro ao entrar no grupo:', err);
      handleFirestoreError(err, OperationType.UPDATE, `groups/${groupCode}`);
    } finally {
      setJoining(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !proposalTitle.trim() || !proposalDate) return;
    setProposing(true);

    const newProposalId = 'prp_' + Math.random().toString(36).substring(2, 10);
    const newProposal: EventProposal = {
      id: newProposalId,
      groupId: selectedGroup.id,
      groupName: selectedGroup.name,
      title: proposalTitle,
      description: proposalDesc,
      proposedDate: proposalDate,
      proposedTimeStart: proposalStart,
      proposedTimeEnd: proposalEnd,
      status: 'pending',
      creatorId: user.uid,
      creatorName: user.displayName || 'Usuário',
      votes: {
        [user.uid]: 'yes', // Auto vote yes by creator
      },
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'eventProposals', newProposalId), newProposal);
      setProposalTitle('');
      setProposalDesc('');
      await fetchGroupProposals(selectedGroup.id);
    } catch (err: any) {
      console.error('Erro ao propor evento:', err);
      handleFirestoreError(err, OperationType.CREATE, `eventProposals/${newProposalId}`);
    } finally {
      setProposing(false);
    }
  };

  const handleVote = async (proposal: EventProposal, voteType: 'yes' | 'no' | 'maybe') => {
    try {
      const docRef = doc(db, 'eventProposals', proposal.id);
      const updatedVotes = {
        ...proposal.votes,
        [user.uid]: voteType,
      };

      await updateDoc(docRef, {
        votes: updatedVotes,
      });

      // Update local state
      setProposals(
        proposals.map((p) => (p.id === proposal.id ? { ...p, votes: updatedVotes } : p))
      );
    } catch (err: any) {
      console.error('Erro ao votar:', err);
      handleFirestoreError(err, OperationType.UPDATE, `eventProposals/${proposal.id}`);
    }
  };

  const handleConfirmProposal = async (proposal: EventProposal) => {
    try {
      // 1. Confirm Proposal
      await updateDoc(doc(db, 'eventProposals', proposal.id), {
        status: 'confirmed',
      });

      // 2. Add to creator's personal calendar
      const personalEventId = 'evt_' + Math.random().toString(36).substring(2, 10);
      await setDoc(doc(db, 'personalEvents', personalEventId), {
        id: personalEventId,
        title: `[Grupo] ${proposal.title}`,
        description: proposal.description || `Reunião confirmada do grupo ${proposal.groupName}`,
        date: proposal.proposedDate,
        startTime: proposal.proposedTimeStart,
        endTime: proposal.proposedTimeEnd,
        userId: user.uid,
        groupId: proposal.groupId,
        createdAt: new Date().toISOString(),
      });

      alert('Proposta confirmada com sucesso! O evento foi adicionado à sua agenda.');
      await fetchGroupProposals(selectedGroup!.id);
    } catch (err: any) {
      console.error('Erro ao confirmar proposta:', err);
      handleFirestoreError(err, OperationType.UPDATE, `eventProposals/${proposal.id}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSelectGroup = (g: Group) => {
    setSelectedGroup(g);
    fetchGroupProposals(g.id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8" id="groups-view">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="groups-main-grid">
        {/* Left column: Group selection/management */}
        <div className="lg:col-span-1 space-y-6" id="groups-nav-col">
          {/* Tabs for switching action */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex gap-2">
            <button
              id="tab-groups-list"
              onClick={() => {
                setActiveTab('list');
                setSelectedGroup(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'list' && !selectedGroup
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Meus Grupos
            </button>
            <button
              id="tab-groups-create"
              onClick={() => {
                setActiveTab('create');
                setSelectedGroup(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'create'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Criar
            </button>
            <button
              id="tab-groups-join"
              onClick={() => {
                setActiveTab('join');
                setSelectedGroup(null);
              }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-xl transition ${
                activeTab === 'join'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Entrar
            </button>
          </div>

          {/* Group Listing */}
          {activeTab === 'list' && (
            <div className="space-y-4" id="groups-list">
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" /> Seus Grupos de Sincronia
              </h2>

              {loading ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin h-6 w-6 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-500">
                  <p className="text-sm font-semibold">Você não está em nenhum grupo.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="mt-3 text-xs font-bold text-brand-600 hover:underline"
                  >
                    Crie um agora mesmo &rarr;
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {groups.map((g) => {
                    const isSelected = selectedGroup?.id === g.id;
                    return (
                      <div
                        key={g.id}
                        id={`group-item-${g.id}`}
                        onClick={() => handleSelectGroup(g)}
                        className={`p-4 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-brand-50 border-brand-300 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{g.name}</h3>
                          <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{g.description || 'Sem descrição'}</p>
                          <div className="flex items-center gap-1 mt-2 text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5 w-max">
                            <span>{g.members.length} {g.members.length === 1 ? 'membro' : 'membros'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Create Group Form */}
          {activeTab === 'create' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="create-group-form">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <Plus className="h-5 w-5 text-brand-600" /> Criar Novo Grupo
              </h2>
              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nome do Grupo</label>
                  <input
                    type="text"
                    required
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ex: Equipe de Marketing, Família, etc."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Defina o propósito deste grupo."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition h-20 resize-none"
                  />
                </div>
                <button
                  id="btn-create-group-submit"
                  type="submit"
                  disabled={creating}
                  className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                >
                  {creating ? 'Criando...' : 'Criar Grupo'}
                </button>
              </form>
            </div>
          )}

          {/* Join Group Form */}
          {activeTab === 'join' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm" id="join-group-form">
              <h2 className="text-lg font-extrabold text-slate-900 mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand-600" /> Entrar em Grupo Existente
              </h2>
              <form onSubmit={handleJoinGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Código do Grupo</label>
                  <input
                    type="text"
                    required
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    placeholder="Ex: grp_abc123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
                <button
                  id="btn-join-group-submit"
                  type="submit"
                  disabled={joining}
                  className="w-full py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
                >
                  {joining ? 'Entrando...' : 'Entrar no Grupo'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right column: Selected Group Details & Meeting Proposals */}
        <div className="lg:col-span-2 space-y-6" id="groups-details-col">
          {selectedGroup ? (
            <div className="space-y-6" id="selected-group-container">
              {/* Group Header Card */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                <div>
                  <span className="text-[10px] font-extrabold text-brand-600 uppercase tracking-wider">Grupo Ativo</span>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">{selectedGroup.name}</h1>
                  <p className="text-slate-500 text-sm mt-1">{selectedGroup.description || 'Sem descrição cadastrada.'}</p>
                  <p className="text-xs text-slate-400 mt-2">Criador: {selectedGroup.creatorName}</p>
                </div>
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Código de Convite</span>
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl w-max">
                    <code className="text-xs font-bold text-slate-700">{selectedGroup.id}</code>
                    <button
                      id="copy-group-id-btn"
                      onClick={() => copyToClipboard(selectedGroup.id)}
                      className="text-slate-400 hover:text-brand-600 transition"
                      title="Copiar código do grupo"
                    >
                      {copiedId ? <ClipboardCheck className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Members grid and New Proposal creator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Members list */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Users className="h-4 w-4 text-brand-600" /> Membros ({selectedGroup.members.length})
                  </h3>
                  <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-none">
                    {Object.entries(selectedGroup.memberDetails || {}).map(([uid, details]: [string, any]) => (
                      <div key={uid} className="flex items-center gap-3">
                        {details.photoURL ? (
                          <img src={details.photoURL} alt={details.displayName} className="h-8 w-8 rounded-full border border-slate-200" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs border border-brand-200">
                            {details.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{details.displayName}</h4>
                          <p className="text-[10px] text-slate-400">{details.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <button
                      id="peek-avail-btn"
                      onClick={() => {
                        setSelectedGroupId(selectedGroup.id);
                        setView('espiar');
                      }}
                      className="w-full py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-xs rounded-xl transition"
                    >
                      Comparar Disponibilidades de Todos &rarr;
                    </button>
                  </div>
                </div>

                {/* Create meeting proposal */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Calendar className="h-4 w-4 text-brand-600" /> Propor Nova Reunião
                  </h3>
                  <form onSubmit={handleCreateProposal} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Título da Proposta</label>
                      <input
                        type="text"
                        required
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                        placeholder="Ex: Alinhamento Semanal"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase">Descrição (Local / Pauta)</label>
                      <input
                        type="text"
                        value={proposalDesc}
                        onChange={(e) => setProposalDesc(e.target.value)}
                        placeholder="Ex: Google Meet"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Data Proposta</label>
                        <input
                          type="date"
                          required
                          value={proposalDate}
                          onChange={(e) => setProposalDate(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Início</label>
                        <input
                          type="time"
                          required
                          value={proposalStart}
                          onChange={(e) => setProposalStart(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">Fim</label>
                        <input
                          type="time"
                          required
                          value={proposalEnd}
                          onChange={(e) => setProposalEnd(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>
                    </div>
                    <button
                      id="btn-proposal-submit"
                      type="submit"
                      disabled={proposing}
                      className="w-full py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                    >
                      {proposing ? 'Propondo...' : 'Lançar Proposta'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Active proposals list */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <FileText className="h-4 w-4 text-brand-600" /> Propostas em Andamento ({proposals.length})
                </h3>

                {loadingProposals ? (
                  <div className="flex justify-center py-6">
                    <svg className="animate-spin h-5 w-5 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : proposals.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">Nenhuma proposta criada para este grupo ainda.</p>
                ) : (
                  <div className="space-y-4">
                    {proposals.map((proposal) => {
                      const yesVotes = Object.values(proposal.votes || {}).filter((v) => v === 'yes').length;
                      const maybeVotes = Object.values(proposal.votes || {}).filter((v) => v === 'maybe').length;
                      const noVotes = Object.values(proposal.votes || {}).filter((v) => v === 'no').length;
                      const totalMembers = selectedGroup.members.length;
                      const userVote = proposal.votes?.[user.uid];

                      return (
                        <div key={proposal.id} id={`proposal-card-${proposal.id}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-slate-800 text-sm">{proposal.title}</h4>
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  proposal.status === 'confirmed'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : proposal.status === 'cancelled'
                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100'
                                }`}
                              >
                                {proposal.status === 'confirmed' ? 'Confirmado' : proposal.status === 'cancelled' ? 'Cancelado' : 'Votação'}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">{proposal.description}</p>
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-600 pt-1">
                              <span>📅 {proposal.proposedDate}</span>
                              <span>⏰ {proposal.proposedTimeStart} - {proposal.proposedTimeEnd}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Criado por: {proposal.creatorName}</p>
                          </div>

                          {/* Vote actions */}
                          <div className="flex flex-col items-end gap-2">
                            {/* Vote counts bar */}
                            <div className="flex items-center gap-1 text-[10px] font-bold">
                              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{yesVotes} Sim</span>
                              <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{maybeVotes} Talvez</span>
                              <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100">{noVotes} Não</span>
                              <span className="text-slate-400">({Object.keys(proposal.votes || {}).length}/{totalMembers} votos)</span>
                            </div>

                            {/* Vote Buttons */}
                            {proposal.status === 'pending' && (
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  id={`vote-yes-${proposal.id}`}
                                  onClick={() => handleVote(proposal, 'yes')}
                                  className={`p-1.5 rounded-lg border transition ${
                                    userVote === 'yes'
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title="Disponível (Sim)"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                                <button
                                  id={`vote-maybe-${proposal.id}`}
                                  onClick={() => handleVote(proposal, 'maybe')}
                                  className={`p-1.5 rounded-lg border transition ${
                                    userVote === 'maybe'
                                      ? 'bg-amber-500 border-amber-500 text-white'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title="Talvez disponível"
                                >
                                  <HelpCircle className="h-4 w-4" />
                                </button>
                                <button
                                  id={`vote-no-${proposal.id}`}
                                  onClick={() => handleVote(proposal, 'no')}
                                  className={`p-1.5 rounded-lg border transition ${
                                    userVote === 'no'
                                      ? 'bg-red-500 border-red-500 text-white'
                                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title="Indisponível (Não)"
                                >
                                  <X className="h-4 w-4" />
                                </button>

                                {/* Creator actions */}
                                {proposal.creatorId === user.uid && (
                                  <button
                                    id={`confirm-proposal-${proposal.id}`}
                                    onClick={() => handleConfirmProposal(proposal)}
                                    className="ml-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition"
                                  >
                                    Confirmar Reunião
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center text-slate-500 h-full flex flex-col justify-center items-center py-20">
              <Users className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700 text-lg">Nenhum Grupo Selecionado</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">Selecione um grupo na lista lateral para ver os membros e gerenciar propostas de sincronização.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
