-- ============================================
-- items 테이블 RLS 정책 설정
-- ============================================

-- 기존 정책 삭제 (필요시)
DROP POLICY IF EXISTS "Users can select items" ON public.items;
DROP POLICY IF EXISTS "Users can insert their own items" ON public.items;
DROP POLICY IF EXISTS "Users can update their own items" ON public.items;
DROP POLICY IF EXISTS "Admins can update any item" ON public.items;
DROP POLICY IF EXISTS "Users can delete their own items" ON public.items;
DROP POLICY IF EXISTS "Admins can delete any item" ON public.items;

-- 1. SELECT 정책: 모든 사용자가 아이템을 조회할 수 있음
CREATE POLICY "Users can select items"
ON public.items
FOR SELECT
USING (true);

-- 2. INSERT 정책: 로그인한 사용자가 자신의 아이템을 생성할 수 있음
CREATE POLICY "Users can insert their own items"
ON public.items
FOR INSERT
WITH CHECK (auth.uid() = seller_id);

-- 3. UPDATE 정책: 작성자가 자신의 아이템을 수정할 수 있음
CREATE POLICY "Users can update their own items"
ON public.items
FOR UPDATE
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

-- 4. UPDATE 정책: 관리자가 모든 아이템을 수정할 수 있음
CREATE POLICY "Admins can update any item"
ON public.items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.is_admin = true
  )
);

-- 5. DELETE 정책: 작성자가 자신의 아이템을 삭제할 수 있음
CREATE POLICY "Users can delete their own items"
ON public.items
FOR DELETE
USING (auth.uid() = seller_id);

-- 6. DELETE 정책: 관리자가 모든 아이템을 삭제할 수 있음
CREATE POLICY "Admins can delete any item"
ON public.items
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE users.id = auth.uid()
      AND users.is_admin = true
  )
);

