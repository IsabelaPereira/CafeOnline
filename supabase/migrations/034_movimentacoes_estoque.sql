-- ============================================================
-- 034: Histórico de movimentações de estoque + multi-categoria
-- ============================================================

-- Tabela de movimentações de estoque
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id    uuid        NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  tipo          text        NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'inventario', 'perda', 'venda')),
  quantidade    integer     NOT NULL,          -- sempre positivo
  estoque_antes integer     NOT NULL,
  estoque_depois integer    NOT NULL,
  observacao    text,
  usuario_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_mov_produto_created ON movimentacoes_estoque(produto_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mov_tipo ON movimentacoes_estoque(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_created ON movimentacoes_estoque(created_at DESC);

-- Multi-categoria: array de UUIDs no próprio produto
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS categoria_ids uuid[] NOT NULL DEFAULT '{}';

-- Backfill: preenche categoria_ids com categoria_id atual (se existir)
UPDATE produtos
SET categoria_ids = ARRAY[categoria_id]
WHERE categoria_id IS NOT NULL AND array_length(categoria_ids, 1) IS NULL;

-- RLS
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Admins e financeiro podem ler e inserir
CREATE POLICY "movimentacoes_admin_all" ON movimentacoes_estoque
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );

CREATE POLICY "movimentacoes_insert" ON movimentacoes_estoque
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'financeiro')
    )
  );
