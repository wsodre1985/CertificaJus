import React from 'react';
import { CertificateData } from '../types';

interface Props {
  data: CertificateData;
  mode?: 'individual' | 'lote';
}

export const CertificatePreview: React.FC<Props> = ({ data, mode = 'individual' }) => {
  return (
    <div 
      id="certificate-to-print"
      className="p-12 shadow-lg max-w-[210mm] min-h-[297mm] mx-auto leading-relaxed print:shadow-none print:p-0"
      style={{ 
        fontFamily: "'Times New Roman', Times, serif",
        backgroundColor: "#ffffff",
        color: "#1f2937"
      }}
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <img 
            src="https://portal.tjce.jus.br/uploads/2025/09/cropped-logo-tjce-2025-horizontal-padrao-azul-OFICIAL-scaled-1.png" 
            alt="Logo TJCE" 
            className="h-20 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-lg font-bold uppercase" style={{ color: "#111827" }}>Estado do Ceará</h1>
        <h2 className="text-lg font-bold uppercase" style={{ color: "#111827" }}>Poder Judiciário</h2>
        <h3 className="text-md font-bold uppercase" style={{ color: "#111827" }}>1ª Vara da Comarca de Itaitinga</h3>
        <p className="text-sm" style={{ color: "#374151" }}>Av. Cel. Virgílio Távora, 1206, Centro, tel. 3377.1299, Itaitinga/CE</p>
      </div>

      {/* Title */}
      <div className="text-center mb-12">
        <h2 className="text-xl font-bold tracking-[0.3em] uppercase underline underline-offset-8" style={{ color: "#111827" }}>Certidão</h2>
      </div>

      {/* Body */}
      <div className="text-justify space-y-8 text-lg">
        <p style={{ color: "#1f2937" }}>
          Andressa Nobre da Silva, Diretora de Secretaria da 1ª Vara da Comarca de Itaitinga, Estado do Ceará, por nomeação legal, etc.
        </p>

        <p style={{ color: "#1f2937" }}>
          <span className="font-bold">CERTIFICO</span>, para os devidos fins, que <span className="font-bold uppercase">{data.nome || "____________________"}</span>, CPF n.º <span className="font-bold">{data.cpf || "____________________"}</span>, compareceu, na presente data, a esta Unidade Judiciária para {mode === 'lote' ? 'Sessão Plenária do Tribunal do Júri' : 'a Audiência de Instrução e Julgamento'} em <span className="font-bold">{data.dataAudiencia || "___/___/_____"}</span>, {mode === 'lote' ? 'com início às' : 'às'} <span className="font-bold">{data.horaAudiencia || "___:___"}</span> referente ao processo n.º <span className="font-bold">{data.numeroProcesso || "____________________"}</span>.
        </p>

        <p style={{ color: "#1f2937" }}>O referido é verdade. Dou fé.</p>
      </div>

      {/* Footer */}
      <div className="mt-16">
        <p className="text-lg" style={{ color: "#1f2937" }}>Itaitinga/CE, {data.dataGeracao}.</p>
        
        <div className="mt-24 text-center">
          <div className="w-64 mx-auto mb-2" style={{ borderTop: "1px solid #9ca3af" }}></div>
          <p className="font-bold text-lg" style={{ color: "#111827" }}>Andressa Nobre da Silva</p>
          <p className="text-md" style={{ color: "#4b5563" }}>Diretora de Secretaria</p>
        </div>
      </div>
    </div>
  );
};
