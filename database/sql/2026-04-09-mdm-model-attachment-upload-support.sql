-- MDM 附件上传支持
-- 说明：
-- 1. 模型字段新增 is_multiple，支持单附件/多附件
-- 2. 继续使用 attachment 作为字段类型
-- 3. 前端上传到 Supabase Storage 后，单附件存 text URL，多附件存 text[]/jsonb 之前请先统一方案
-- 当前前端实现：
--   单附件 -> 存单个 URL
--   多附件 -> 存 URL 数组（建议动态表字段改成 jsonb，若当前是 text 请改为 jsonb）

alter table public.mdm_model_fields
  add column if not exists is_multiple boolean not null default false;
