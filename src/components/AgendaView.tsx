import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PersonalEvent } from '../types';
import { Calendar, Clock, Plus, Trash2, CalendarCheck, FileText, ChevronRight } from 'lucide-react';

interface AgendaViewProps {
  user: any;
}

export default function AgendaView({ user }: AgendaViewProps) {
  const [events, setEvents] = useState<PersonalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Event Form
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [adding, setAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'personalEvents'),
        where('userId', '==', user.uid)
      );
      const snap = await getDocs(q);
      const list: PersonalEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as PersonalEvent);
      });
      // Sort events chronologically (date then start time)
      list.sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;
        return a.startTime.localeCompare(b.startTime);
      });
      setEvents(list);
    } catch (err: any) {
      console.error('Erro ao buscar eventos:', err);
      handleFirestoreError(err, OperationType.GET, 'personalEvents');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;
    setAdding(true);

    const newEventId = 'evt_' + Math.random().toString(36).substring(2, 10);
    const newEvent: PersonalEvent = {
      id: newEventId,
      title,
      description: desc,
      date,
      startTime: start,
      endTime: end,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'personalEvents', newEventId), newEvent);
      setTitle('');
      setDesc('');
      setShowAddForm(false);
      await fetchEvents();
    } catch (err: any) {
      console.error('Erro ao salvar evento:', err);
      handleFirestoreError(err, OperationType.CREATE, `personalEvents/${newEventId}`);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Deseja realmente remover este compromisso?')) return;
    try {
      await deleteDoc(doc(db, 'personalEvents', eventId));
      setEvents(events.filter((e) => e.id !== eventId));
    } catch (err: any) {
      console.error('Erro ao remover compromisso:', err);
      handleFirestoreError(err, OperationType.DELETE, `personalEvents/${eventId}`);
    }
  };

  // Group events by date
  const groupedEvents: { [date: string]: PersonalEvent[] } = {};
  events.forEach((evt) => {
    if (!groupedEvents[evt.date]) {
      groupedEvents[evt.date] = [];
    }
    groupedEvents[evt.date].push(evt);
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8" id="agenda-view">
      <div className="flex justify-between items-center" id="agenda-title-bar">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Minha Agenda</h1>
          <p className="text-slate-500 mt-1">Gerencie seus compromissos e veja as reuniões de grupo confirmadas.</p>
        </div>
        <button
          id="toggle-add-event-btn"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white font-bold rounded-xl hover:bg-brand-700 transition shadow-sm"
        >
          <Plus className="h-4 w-4" /> Novo Compromisso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8" id="agenda-content">
        {/* Add Event Form Panel */}
        {showAddForm && (
          <div className="md:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-max space-y-4" id="add-event-panel">
            <h3 className="font-extrabold text-slate-900 border-b border-slate-100 pb-3">Novo Evento</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Mentoria, Almoço de negócios"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Descrição</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Ex: Google Meet link, pauta da reunião"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition h-20 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Data</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Início</label>
                  <input
                    type="time"
                    required
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Fim</label>
                  <input
                    type="time"
                    required
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-brand-500 focus:outline-none transition"
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  id="cancel-add-event"
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 text-center text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  id="submit-add-event"
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2 text-center text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl transition"
                >
                  {adding ? 'Salvando...' : 'Adicionar'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Timeline Event List */}
        <div className={`${showAddForm ? 'md:col-span-2' : 'md:col-span-3'} space-y-6`} id="agenda-timeline">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <svg className="animate-spin h-8 w-8 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-500 shadow-sm flex flex-col justify-center items-center py-20">
              <CalendarCheck className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-extrabold text-slate-700 text-lg">Sem compromissos marcados</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-sm">Você está livre! Seus eventos pessoais ou reuniões confirmadas aparecerão aqui.</p>
              <button
                id="empty-state-add-event"
                onClick={() => setShowAddForm(true)}
                className="mt-4 px-4 py-2 bg-brand-50 text-brand-700 font-bold text-xs rounded-xl hover:bg-brand-100 transition"
              >
                Criar Primeiro Compromisso &rarr;
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(groupedEvents).map((dateStr) => (
                <div key={dateStr} className="space-y-3" id={`group-date-${dateStr}`}>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2 sticky top-16 bg-slate-50 py-2">
                    <Calendar className="h-4 w-4 text-brand-600" />
                    {new Date(dateStr + 'T00:00:00').toLocaleDateString('pt-BR', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {groupedEvents[dateStr].map((evt) => (
                      <div
                        key={evt.id}
                        id={`event-item-${evt.id}`}
                        className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 transition flex justify-between items-center"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-brand-50 text-brand-600 rounded-lg">
                              <Clock className="h-4 w-4" />
                            </span>
                            <span className="text-xs font-extrabold text-brand-700">
                              {evt.startTime} – {evt.endTime}
                            </span>
                            {evt.groupId && (
                              <span className="text-[9px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Grupo
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">{evt.title}</h4>
                          {evt.description && <p className="text-xs text-slate-500">{evt.description}</p>}
                        </div>

                        <button
                          id={`delete-event-${evt.id}`}
                          onClick={() => handleDeleteEvent(evt.id)}
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition"
                          title="Excluir compromisso"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
