import React, { useState, useEffect } from 'react';
import { FileText, Upload, Printer, User, Hash, Calendar, Clock, Loader2, CheckCircle2, Download } from 'lucide-react';
import { motion } from 'motion/react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { CertificateData } from './types';
import { extractDataFromImage } from './services/geminiService';
import { CertificatePreview } from './components/CertificatePreview';

export default function App() {
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
              
              // Only update ID fields if at least one was found (to avoid clearing when pasting a warrant)
              if (idResult.nome || idResult.cpf) {
                newData.nome = idResult.nome || '';
                newData.cpf = idResult.cpf || '';
              }
              
              // Only update Warrant fields if at least one was found
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
  }, []);

  const handlePrint = () => {
    window.print();
  };

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

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 font-sans print:bg-white">
      {/* Header - Hidden on Print */}
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
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setData({
              nome: '',
              cpf: '',
              numeroProcesso: '',
              dataAudiencia: '',
              horaAudiencia: '',
              dataGeracao: new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
            })}
            className="text-stone-500 hover:text-stone-800 text-sm font-medium px-4 py-2 transition-colors print:hidden"
          >
            Limpar
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={loading.pdf}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {loading.pdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            <span>Salvar PDF</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-stone-800 transition-all shadow-sm active:scale-95"
          >
            <Printer size={18} />
            <span>Imprimir</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Column: Controls - Hidden on Print */}
        <div className="space-y-8 print:hidden">
          <section className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              <Upload size={20} className="text-emerald-600" />
              Upload de Documentos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ID Upload */}
              <div className="relative">
                <label className="block text-sm font-semibold text-stone-600 mb-2">RG / CPF</label>
                <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    onChange={(e) => handleFileUpload(e, 'id')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {loading.id ? (
                    <div className="flex flex-col items-center py-4">
                      <Loader2 className="animate-spin text-emerald-600 mb-2" size={24} />
                      <span className="text-xs text-stone-500">Analisando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <User className="text-stone-400 group-hover:text-emerald-500 mb-2" size={24} />
                      <span className="text-xs text-stone-500">Clique ou arraste RG ou PDF</span>
                    </div>
                  )}
                </div>
                {status.id && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-0 right-0 text-[10px] text-center font-medium text-emerald-600"
                  >
                    {status.id}
                  </motion.div>
                )}
              </div>

              {/* Warrant Upload */}
              <div className="relative">
                <label className="block text-sm font-semibold text-stone-600 mb-2">Mandado / Intimação</label>
                <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center hover:border-emerald-400 transition-colors relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="image/*,application/pdf" 
                    onChange={(e) => handleFileUpload(e, 'warrant')}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  {loading.warrant ? (
                    <div className="flex flex-col items-center py-4">
                      <Loader2 className="animate-spin text-emerald-600 mb-2" size={24} />
                      <span className="text-xs text-stone-500">Analisando...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-4">
                      <FileText className="text-stone-400 group-hover:text-emerald-500 mb-2" size={24} />
                      <span className="text-xs text-stone-500">Clique ou arraste Mandado ou PDF</span>
                    </div>
                  )}
                </div>
                {status.warrant && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-0 right-0 text-[10px] text-center font-medium text-emerald-600"
                  >
                    {status.warrant}
                  </motion.div>
                )}
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
                    <input 
                      type="text" 
                      name="nome"
                      value={data.nome}
                      onChange={handleInputChange}
                      placeholder="Nome do comparecente"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF</label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      type="text" 
                      name="cpf"
                      value={data.cpf}
                      onChange={handleInputChange}
                      placeholder="000.000.000-00"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nº do Processo</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                  <input 
                    type="text" 
                    name="numeroProcesso"
                    value={data.numeroProcesso}
                    onChange={handleInputChange}
                    placeholder="0000000-00.0000.0.00.0000"
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Data da Audiência</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      type="text" 
                      name="dataAudiencia"
                      value={data.dataAudiencia}
                      onChange={handleInputChange}
                      placeholder="DD/MM/AAAA"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Hora</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                    <input 
                      type="text" 
                      name="horaAudiencia"
                      value={data.horaAudiencia}
                      onChange={handleInputChange}
                      placeholder="HH:MM"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex gap-4">
            <CheckCircle2 className="text-emerald-600 shrink-0" size={24} />
            <div>
              <h3 className="text-sm font-bold text-emerald-900">Dica de Uso</h3>
              <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                Você pode colar um print diretamente (Ctrl+V) ou tirar uma foto dos documentos. A IA extrairá os dados automaticamente para você.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:sticky lg:top-28 h-fit print:static print:p-0">
          <div className="mb-4 flex items-center justify-between print:hidden">
            <h2 className="text-sm font-bold text-stone-500 uppercase tracking-widest">Visualização Prévia</h2>
            <span className="text-[10px] bg-stone-200 px-2 py-1 rounded text-stone-600 font-bold">A4 FORMAT</span>
          </div>
          <div className="origin-top scale-[0.6] sm:scale-[0.8] lg:scale-100 transition-transform print:scale-100">
            <CertificatePreview data={data} />
          </div>
        </div>
      </main>

      {/* Footer - Hidden on Print */}
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
