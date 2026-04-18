import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { CheckCircle2, User, Hash, Loader2 } from 'lucide-react';

export default function CadastroJurado() {
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Mascara simples de CPF
  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // Formatar como 000.000.000-00
    if (value.length > 9) {
      value = value.replace(/(\d{3})(\d{3})(\d{3})(\d{1})/, "$1.$2.$3-$4");
    } else if (value.length > 6) {
      value = value.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
    } else if (value.length > 3) {
      value = value.replace(/(\d{3})(\d{1,3})/, "$1.$2");
    }
    
    setCpf(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || cpf.replace(/\D/g, '').length !== 11) {
      setError('Por favor, preencha o nome completo e um CPF válido.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: sbError } = await supabase
        .from('jurados')
        .insert([{ nome: nome.trim(), cpf: cpf }]);

      if (sbError) throw sbError;
      
      setSuccess(true);
      setNome('');
      setCpf('');
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao enviar seus dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 max-w-md w-full text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-600" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Dados Recebidos!</h1>
          <p className="text-stone-500 mb-8">
            Seu cadastro foi realizado com sucesso. A sua certidão de comparecimento será gerada pelo servidor responsável.
          </p>
          <button 
            onClick={() => setSuccess(false)}
            className="text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
          >
            Cadastrar outra pessoa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-stone-200 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">CertificaJus</h1>
          <p className="text-sm text-stone-500 mt-1">Registro de Comparecimento - Jurados</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">Nome Completo</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">CPF</label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
              <input 
                type="text" 
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all outline-none text-sm"
                required
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
            <span>Registrar Presença</span>
          </button>
        </form>
      </div>
    </div>
  );
}
