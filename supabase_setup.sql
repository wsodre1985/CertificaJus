-- Execute este script no SQL Editor do seu projeto no Supabase

-- Criar a tabela de jurados (fila)
CREATE TABLE public.jurados (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    cpf TEXT NOT NULL,
    processado BOOLEAN DEFAULT false,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.jurados ENABLE ROW LEVEL SECURITY;

-- Política 1: Permitir que QUALQUER pessoa insira dados (afinal o formulário será público)
CREATE POLICY "Permitir insercao publica" 
ON public.jurados FOR INSERT 
TO public
WITH CHECK (true);

-- Política 2: Permitir que QUALQUER pessoa leia os dados (já que o admin não terá auth por enquanto para simplificar)
CREATE POLICY "Permitir leitura publica" 
ON public.jurados FOR SELECT 
TO public
USING (true);

-- Política 3: Permitir que QUALQUER pessoa atualize os dados (para mudar status de processado)
CREATE POLICY "Permitir update publico" 
ON public.jurados FOR UPDATE 
TO public
USING (true);
