export interface CertificateData {
  nome: string;
  cpf: string;
  numeroProcesso: string;
  dataAudiencia: string;
  horaAudiencia: string;
  dataGeracao: string;
}

export interface OCRResult {
  nome?: string;
  cpf?: string;
  numeroProcesso?: string;
  dataAudiencia?: string;
  horaAudiencia?: string;
}
