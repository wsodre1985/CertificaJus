import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Printer, User, Hash, Calendar, Clock, Loader2, CheckCircle2, Download, Users, RefreshCw, Trash2, Pencil, Save, X } from 'lucide-react';
import { motion } from 'motion/react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { CertificateData } from '../types';
import { extractDataFromImage } from '../services/geminiService';
import { CertificatePreview } from '../components/CertificatePreview';
import { supabase } from '../services/supabaseClient';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'individual' | 'lote'>('individual');
  
  // ==========================================
  // ESTADO: MODO INDIVIDUAL
  // ==========================================
  const [data, setData] = useState<CertificateData>({
    nome: '',
    cpf: '',
    numeroProcesso: '',
    dataAudiencia: '',
    horaAudiencia: '',
    dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
  });

  const [loading, setLoading] = useState<{ id: boolean; warrant: boolean; pdf: boolean }>({ 
    id: false, 
    warrant: false,
    pdf: false
  });
  const [status, setStatus] = useState<{ id: string; warrant: string }>({ id: '', warrant: '' });

  // ==========================================
  // ESTADO: MODO EM LOTE
  // ==========================================
  const [jurados, setJurados] = useState<any[]>([]);
  const [selectedJurados, setSelectedJurados] = useState<string[]>([]);
  const [loadingJurados, setLoadingJurados] = useState(false);
  const [batchData, setBatchData] = useState({
    numeroProcesso: '',
    dataAudiencia: '',
    horaAudiencia: ''
  });
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const batchContainerRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // LÓGICA: SUPABASE & FILA EM LOTE
  // ==========================================
  const fetchJurados = async () => {
    setLoadingJurados(true);
    try {
      const { data: records, error } = await supabase
        .from('jurados')
        .select('*')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setJurados(records || []);
    } catch (err) {
      console.error("Erro ao buscar fila de jurados:", err);
    } finally {
      setLoadingJurados(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'lote') {
      fetchJurados();
    }
  }, [activeTab]);

  const toggleSelectJurado = (id: string) => {
    setSelectedJurados(prev => 
      prev.includes(id) ? prev.filter(jId => jId !== id) : [...prev, id]
    );
  };

  const handleBatchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setBatchData(prev => ({ ...prev, [name]: value }));
  };

  const handleDownloadBatchPDF = async () => {
    if (selectedJurados.length === 0) return;
    if (!batchContainerRef.current) return;

    setGeneratingBatch(true);

    const opt = {
      margin: 0,
      filename: `Certidoes_Lote_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(batchContainerRef.current).save();
      // Mantém na fila, apenas marca como impresso para dar o destaque visual
      await supabase.from('jurados').update({ processado: true }).in('id', selectedJurados);
      fetchJurados();
    } catch (error) {
      console.error("Erro ao gerar PDF em lote:", error);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const deleteJurado = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Tem certeza que deseja remover este jurado da fila?')) return;
    try {
      await supabase.from('jurados').delete().eq('id', id);
      setSelectedJurados(prev => prev.filter(j => j !== id));
      fetchJurados();
    } catch (err) {
      console.error(err);
    }
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ nome: '', cpf: '' });

  const startEdit = (jurado: any, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingId(jurado.id);
    setEditData({ nome: jurado.nome, cpf: jurado.cpf });
  };

  const saveEdit = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    try {
      await supabase.from('jurados').update({ nome: editData.nome, cpf: editData.cpf }).eq('id', id);
      setEditingId(null);
      fetchJurados();
    } catch (err) {
      console.error(err);
    }
  };


  // ==========================================
  // LÓGICA: MODO INDIVIDUAL
  // ==========================================
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prev => ({ ...prev, [name]: value }));
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'id' | 'warrant') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(prev => ({ ...prev, [type]: true }));
    setStatus(prev => ({ ...prev, [type]: 'Processando documento...' }));

    try {
      const base64 = await readFileAsBase64(file);
      const extracted = await extractDataFromImage(base64, type, file.type);

      if (type === 'id') {
        setData(prev => ({
          ...prev,
          nome: extracted.nome || '',
          cpf: extracted.cpf || ''
        }));
        setStatus(prev => ({ ...prev, id: extracted.nome ? 'Dados extraídos com sucesso!' : 'Documento lido, mas dados não encontrados.' }));
      } else {
        setData(prev => ({
          ...prev,
          numeroProcesso: extracted.numeroProcesso || '',
          dataAudiencia: extracted.dataAudiencia || '',
          horaAudiencia: extracted.horaAudiencia || ''
        }));
        setStatus(prev => ({ ...prev, warrant: extracted.numeroProcesso ? 'Dados extraídos com sucesso!' : 'Documento lido, mas dados não encontrados.' }));
      }
    } catch (error) {
      console.error("Erro no OCR:", error);
      setStatus(prev => ({ ...prev, [type]: 'Erro ao processar documento.' }));
    } finally {
      setLoading(prev => ({ ...prev, [type]: false }));
      setTimeout(() => setStatus(prev => ({ ...prev, [type]: '' })), 3000);
    }
  };

  useEffect(() => {
    if (activeTab === 'lote') return; // Desativa colagem no modo lote

    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (!file) continue;

          setLoading(prev => ({ ...prev, id: true, warrant: true }));
          setStatus(prev => ({ ...prev, id: 'Processando colagem...', warrant: 'Processando colagem...' }));

          try {
            const base64 = await readFileAsBase64(file);
            const mimeType = file.type || "image/png";
            
            const [idResult, warrantResult] = await Promise.all([
              extractDataFromImage(base64, 'id', mimeType).catch(() => ({})),
              extractDataFromImage(base64, 'warrant', mimeType).catch(() => ({}))
            ]);

            setData(prev => {
              const newData = { ...prev };
              if (idResult.nome || idResult.cpf) {
                newData.nome = idResult.nome || '';
                newData.cpf = idResult.cpf || '';
              }
              if (warrantResult.numeroProcesso || warrantResult.dataAudiencia || warrantResult.horaAudiencia) {
                newData.numeroProcesso = warrantResult.numeroProcesso || '';
                newData.dataAudiencia = warrantResult.dataAudiencia || '';
                newData.horaAudiencia = warrantResult.horaAudiencia || '';
              }
              return newData;
            });

            setStatus(prev => ({ 
              ...prev, 
              id: idResult.nome ? 'Dados de ID extraídos!' : '', 
              warrant: warrantResult.numeroProcesso ? 'Dados de processo extraídos!' : '' 
            }));
          } catch (error) {
            console.error("Erro ao processar colagem:", error);
          } finally {
            setLoading(prev => ({ ...prev, id: false, warrant: false }));
            setTimeout(() => setStatus(prev => ({ ...prev, id: '', warrant: '' })), 3000);
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTab]);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('certificate-to-print');
    if (!element) return;

    setLoading(prev => ({ ...prev, pdf: true }));

    const opt = {
      margin: 0,
      filename: `Certidao_${data.nome.replace(/\s+/g, '_') || 'Comparecimento'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(element).save();
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  // ==========================================
  // RENDERIZAÇÃO
  // ==========================================
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans print:bg-white relative">
      {/* Container Oculto para Lote (Usado apenas para PDF) */}
      <div style={{ display: 'none' }}>
        <div ref={batchContainerRef}>
          {selectedJurados.map((id, index) => {
            const jurado = jurados.find(j => j.id === id);
            if (!jurado) return null;
            return (
              <div key={id} style={{ pageBreakAfter: index < selectedJurados.length - 1 ? 'always' : 'auto' }}>
                <CertificatePreview 
                  mode="lote"
                  data={{
                    nome: jurado.nome,
                    cpf: jurado.cpf,
                    numeroProcesso: batchData.numeroProcesso,
                    dataAudiencia: batchData.dataAudiencia,
                    horaAudiencia: batchData.horaAudiencia,
                    dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
                  }} 
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Header */}
      <header className="bg-white border-b border-stone-200 py-6 px-8 flex items-center justify-between sticky top-0 z-10 print:hidden">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg text-white">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">CertificaJus</h1>
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Gerador de Certidões Judiciais</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl mx-auto absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'individual' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <User size={16} /> Individual
          </button>
          <button
            onClick={() => setActiveTab('lote')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'lote' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            <Users size={16} /> Em Lote
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'individual' && (
            <>
              <button 
                onClick={() => setData({
                  nome: '', cpf: '', numeroProcesso: '', dataAudiencia: '', horaAudiencia: '',
                  dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
                })}
                className="text-stone-500 hover:text-stone-800 text-sm font-medium px-4 py-2 transition-colors print:hidden"
              >
                Limpar
              </button>
              <button 
                onClick={handleDownloadPDF}
                disabled={loading.pdf || (!data.nome && !data.numeroProcesso)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {loading.pdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                <span>Salvar PDF</span>
              </button>
            </>
          )}

          {activeTab === 'lote' && (
            <button 
              onClick={handleDownloadBatchPDF}
              disabled={generatingBatch || selectedJurados.length === 0}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {generatingBatch ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              <span>Salvar Lote ({selectedJurados.length})</span>
            </button>
          )}

          <button 
            onClick={() => window.print()}
            disabled={activeTab === 'lote'} // Lote é gerado apenas via PDF
            className={`flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-sm active:scale-95 ${activeTab === 'lote' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-800'}`}
          >
            <Printer size={18} />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 lg:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* =====================================================
            COLUNA ESQUERDA: CONTROLES
            ===================================================== */}
        <div className="space-y-8 print:hidden">
          
          {activeTab === 'individual' ? (
            // CONTROLES MODO INDIVIDUAL (Original)
            <>
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                  <Upload size={20} className="text-emerald-600" /> Upload de Documentos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ID Upload */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-stone-600 mb-2">RG / CPF</label>
                    <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors relative group cursor-pointer">
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'id')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {loading.id ? (
                        <div className="flex flex-col items-center py-4"><Loader2 className="animate-spin text-emerald-600 mb-2" size={24} /><span className="text-xs text-stone-500">Analisando...</span></div>
                      ) : (
                        <div className="flex flex-col items-center py-4"><User className="text-stone-400 group-hover:text-emerald-500 mb-2" size={24} /><span className="text-xs text-stone-500">Clique/Arraste RG</span></div>
                      )}
                    </div>
                    {status.id && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-6 left-0 right-0 text-[10px] text-center text-emerald-600 font-medium">{status.id}</motion.div>}
                  </div>
                  {/* Warrant Upload */}
                  <div className="relative">
                    <label className="block text-sm font-semibold text-stone-600 mb-2">Mandado / Intimação</label>
                    <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors relative group cursor-pointer">
                      <input type="file" accept="image/*,application/pdf" onChange={(e) => handleFileUpload(e, 'warrant')} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                      {loading.warrant ? (
                        <div className="flex flex-col items-center py-4"><Loader2 className="animate-spin text-emerald-600 mb-2" size={24} /><span className="text-xs text-stone-500">Analisando...</span></div>
                      ) : (
                        <div className="flex flex-col items-center py-4"><FileText className="text-stone-400 group-hover:text-emerald-500 mb-2" size={24} /><span className="text-xs text-stone-500">Clique/Arraste Mandado</span></div>
                      )}
                    </div>
                    {status.warrant && <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="absolute -bottom-6 left-0 right-0 text-[10px] text-center text-emerald-600 font-medium">{status.warrant}</motion.div>}
                  </div>
                </div>
              </section>

              <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                <h2 className="text-lg font-bold mb-6">Dados da Certidão</h2>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="nome" value={data.nome} onChange={handleInputChange} placeholder="Nome do comparecente" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF</label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="cpf" value={data.cpf} onChange={handleInputChange} placeholder="000.000.000-00" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº do Processo</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                      <input type="text" name="numeroProcesso" value={data.numeroProcesso} onChange={handleInputChange} placeholder="0000000-00.0000.0.00.0000" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Data da Audiência</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="dataAudiencia" value={data.dataAudiencia} onChange={handleInputChange} placeholder="DD/MM/AAAA" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="horaAudiencia" value={data.horaAudiencia} onChange={handleInputChange} placeholder="HH:MM" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex gap-4">
                <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">Dica de Uso</h3>
                  <p className="text-xs text-emerald-700 mt-1 leading-relaxed">Você pode colar um print (Ctrl+V) ou anexar um PDF para extrair automaticamente os dados do documento da pessoa.</p>
                </div>
              </div>
            </>
          ) : (
            // ==========================================
            // CONTROLES MODO LOTE
            // ==========================================
            <>
              <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold flex items-center gap-2 text-stone-800">
                    <Users size={20} className="text-emerald-600" /> Fila de Pessoas (Jurados)
                  </h2>
                  <button onClick={fetchJurados} disabled={loadingJurados} className="p-2 bg-stone-100 text-stone-500 rounded-lg hover:bg-stone-200 transition-colors">
                    <RefreshCw size={18} className={loadingJurados ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="bg-stone-50 border border-stone-200 rounded-xl overflow-hidden min-h-[220px] max-h-[350px] overflow-y-auto">
                  {loadingJurados ? (
                    <div className="flex flex-col items-center justify-center p-8 h-full space-y-3">
                      <Loader2 className="animate-spin text-emerald-600" size={24} />
                      <span className="text-sm text-stone-500">Buscando cadastros...</span>
                    </div>
                  ) : jurados.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 h-full text-center space-y-2">
                      <Users className="text-stone-300" size={32} />
                      <span className="text-sm text-stone-500">Nenhum jurado pendente na fila.</span>
                    </div>
                  ) : (
                    <div className="divide-y divide-stone-200">
                      {jurados.map((jurado) => {
                         const isSelected = selectedJurados.includes(jurado.id);
                         const isEditing = editingId === jurado.id;
                         
                         return (
                           <div key={jurado.id} className={`flex items-center justify-between p-3 border-b border-stone-100 transition-colors ${isSelected ? 'bg-emerald-50' : 'hover:bg-stone-50'}`}>
                             <label className="flex items-center gap-4 flex-1 cursor-pointer min-w-0">
                               <div className="flex items-center justify-center w-5 h-5 rounded border border-stone-300 bg-white shadow-sm overflow-hidden flex-shrink-0 relative">
                                 <input type="checkbox" checked={isSelected} onChange={() => toggleSelectJurado(jurado.id)} className="opacity-0 absolute" />
                                 {isSelected && <div className="absolute inset-0 bg-emerald-500 flex items-center justify-center"><CheckCircle2 size={14} className="text-white" /></div>}
                               </div>
                               
                               {isEditing ? (
                                 <div className="flex flex-col gap-2 flex-1 mr-4" onClick={e => e.preventDefault()}>
                                   <input 
                                     type="text" 
                                     value={editData.nome} 
                                     onChange={(e) => setEditData({...editData, nome: e.target.value})} 
                                     className="w-full text-sm font-bold p-1 border border-stone-300 rounded" 
                                     placeholder="Nome completo"
                                   />
                                   <input 
                                     type="text" 
                                     value={editData.cpf} 
                                     onChange={(e) => setEditData({...editData, cpf: e.target.value})} 
                                     className="w-full text-xs text-stone-500 p-1 border border-stone-300 rounded" 
                                     placeholder="CPF"
                                   />
                                 </div>
                               ) : (
                                 <div className="flex flex-col overflow-hidden">
                                   <span className={`text-sm font-bold truncate flex items-center gap-2 ${jurado.processado ? 'text-stone-400 italic' : 'text-stone-800'}`}>
                                     {jurado.nome}
                                     {jurado.processado && <span className="text-[10px] bg-stone-200 text-stone-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1"><Printer size={10} /> Impresso</span>}
                                   </span>
                                   <span className={`text-xs ${jurado.processado ? 'text-stone-300' : 'text-stone-500'}`}>{jurado.cpf}</span>
                                 </div>
                               )}
                             </label>
                             
                             <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                               {isEditing ? (
                                 <>
                                   <button aria-label="Cancelar" onClick={(e) => { e.preventDefault(); setEditingId(null); }} className="p-1.5 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-200 transition-colors"><X size={16} /></button>
                                   <button aria-label="Salvar" onClick={(e) => saveEdit(jurado.id, e)} className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg transition-colors"><Save size={16} /></button>
                                 </>
                               ) : (
                                 <>
                                   <button aria-label="Editar" onClick={(e) => startEdit(jurado, e)} className="p-1.5 text-stone-400 hover:text-blue-600 rounded-lg hover:bg-stone-200 transition-colors"><Pencil size={16} /></button>
                                   <button aria-label="Excluir" onClick={(e) => deleteJurado(jurado.id, e)} className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg hover:bg-stone-200 transition-colors"><Trash2 size={16} /></button>
                                 </>
                               )}
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between text-sm">
                  <div className="text-stone-500">
                    <span className="font-bold text-emerald-600">{selectedJurados.length}</span> de <span className="font-bold">{jurados.length}</span> selecionados
                  </div>
                  <button 
                    onClick={() => setSelectedJurados(selectedJurados.length === jurados.length ? [] : jurados.map(j => j.id))}
                    className="text-emerald-600 font-medium hover:underline"
                  >
                    {selectedJurados.length === jurados.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
                  </button>
                </div>
              </section>

              <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
                <h2 className="text-lg font-bold mb-6">Dados do Processo (Aplicar a todos)</h2>
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº do Processo Original</label>
                    <div className="relative">
                      <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                      <input type="text" name="numeroProcesso" value={batchData.numeroProcesso} onChange={handleBatchInputChange} placeholder="0000000-00.0000.0.00.0000" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Data da Audiência</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="dataAudiencia" value={batchData.dataAudiencia} onChange={handleBatchInputChange} placeholder="DD/MM/AAAA" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Hora</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                        <input type="text" name="horaAudiencia" value={batchData.horaAudiencia} onChange={handleBatchInputChange} placeholder="HH:MM" className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm" />
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

        </div>

        {/* =====================================================
            COLUNA DIREITA: PREVIEW
            ===================================================== */}
        <div className="lg:sticky lg:top-28 h-fit print:static print:p-0">
          <div className="mb-4 flex items-center justify-between print:hidden">
            <h2 className="text-sm font-bold text-stone-500 uppercase tracking-widest">
              {activeTab === 'lote' && selectedJurados.length > 0 
                ? `Preview (Exibindo 1 de ${selectedJurados.length})` 
                : 'Visualização Prévia'
              }
            </h2>
            <span className="text-[10px] bg-stone-200 px-2 py-1 rounded text-stone-600 font-bold">A4 FORMAT</span>
          </div>
          <div className="origin-top scale-[0.6] sm:scale-[0.8] lg:scale-100 transition-transform print:scale-100">
            {activeTab === 'individual' ? (
              <CertificatePreview data={data} mode="individual" />
            ) : (
              // Modo lote: exibe o preview do primeiro selecionado, ou vazio se nenhum
              <CertificatePreview 
                mode="lote"
                data={
                  selectedJurados.length > 0 
                  ? {
                      nome: jurados.find(j => j.id === selectedJurados[0])?.nome || '',
                      cpf: jurados.find(j => j.id === selectedJurados[0])?.cpf || '',
                      numeroProcesso: batchData.numeroProcesso,
                      dataAudiencia: batchData.dataAudiencia,
                      horaAudiencia: batchData.horaAudiencia,
                      dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
                    }
                  : {
                      nome: 'João das Neves',
                      cpf: '000.000.000-00',
                      numeroProcesso: batchData.numeroProcesso || 'Aguardando seleção...',
                      dataAudiencia: batchData.dataAudiencia,
                      horaAudiencia: batchData.horaAudiencia,
                      dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
                  }
                } 
              />
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 border-t border-stone-200 text-center text-stone-400 text-xs print:hidden">
        <p>© 2026 CertificaJus - Sistema Auxiliar Judiciário</p>
      </footer>

      {/* Print Styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          main { display: block !important; padding: 0 !important; margin: 0 !important; max-width: none !important; }
          #certificate-content { 
            box-shadow: none !important; 
            margin: 0 !important; 
            padding: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}} />

    </div>
  );
}
