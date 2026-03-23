-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
--
-- Kevin, RLS is like giving every row in the database a lock that only opens
-- for the right person. Even if your application code has a bug, the database
-- itself will block unauthorized access. For a financial platform, this is
-- non-negotiable.
--
-- PATTERN:
--   Every org-scoped table checks: "Does the current user belong to this org?"
--   We look up the user's org_id through the org_members table.
--
-- IMPORTANT:
--   ledger_events gets INSERT + SELECT only — NO UPDATE, NO DELETE.
--   This is the core compliance promise: immutable audit trail.
-- ============================================================================

-- Helper function: get the org IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.get_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT org_id FROM org_members WHERE user_id = auth.uid();
$$;

-- ============================================================================
-- 1. ORGS
-- ============================================================================
ALTER TABLE "orgs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs_select" ON "orgs"
  FOR SELECT USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "orgs_insert" ON "orgs"
  FOR INSERT WITH CHECK (true);
  -- Anyone can create an org (they become the first member via onboarding)

CREATE POLICY "orgs_update" ON "orgs"
  FOR UPDATE USING (id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "orgs_delete" ON "orgs"
  FOR DELETE USING (id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 2. USERS
-- ============================================================================
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select" ON "users"
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (
      SELECT user_id FROM org_members
      WHERE org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "users_insert" ON "users"
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_update" ON "users"
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_delete" ON "users"
  FOR DELETE USING (id = auth.uid());

-- ============================================================================
-- 3. ORG_MEMBERS
-- ============================================================================
ALTER TABLE "org_members" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select" ON "org_members"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "org_members_insert" ON "org_members"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "org_members_update" ON "org_members"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "org_members_delete" ON "org_members"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 4. CLIENTS
-- ============================================================================
ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clients_select" ON "clients"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "clients_insert" ON "clients"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "clients_update" ON "clients"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "clients_delete" ON "clients"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 5. ENTITIES (scoped through client → org)
-- ============================================================================
ALTER TABLE "entities" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entities_select" ON "entities"
  FOR SELECT USING (
    client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "entities_insert" ON "entities"
  FOR INSERT WITH CHECK (
    client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "entities_update" ON "entities"
  FOR UPDATE USING (
    client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "entities_delete" ON "entities"
  FOR DELETE USING (
    client_id IN (SELECT id FROM clients WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

-- ============================================================================
-- 6. ASSETS (scoped through entity → client → org)
-- ============================================================================
ALTER TABLE "assets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assets_select" ON "assets"
  FOR SELECT USING (
    entity_id IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "assets_insert" ON "assets"
  FOR INSERT WITH CHECK (
    entity_id IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "assets_update" ON "assets"
  FOR UPDATE USING (
    entity_id IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "assets_delete" ON "assets"
  FOR DELETE USING (
    entity_id IN (
      SELECT e.id FROM entities e
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

-- ============================================================================
-- 7. VALUATIONS (scoped through asset → entity → client → org)
-- ============================================================================
ALTER TABLE "valuations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "valuations_select" ON "valuations"
  FOR SELECT USING (
    asset_id IN (
      SELECT a.id FROM assets a
      JOIN entities e ON a.entity_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "valuations_insert" ON "valuations"
  FOR INSERT WITH CHECK (
    asset_id IN (
      SELECT a.id FROM assets a
      JOIN entities e ON a.entity_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "valuations_update" ON "valuations"
  FOR UPDATE USING (
    asset_id IN (
      SELECT a.id FROM assets a
      JOIN entities e ON a.entity_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

CREATE POLICY "valuations_delete" ON "valuations"
  FOR DELETE USING (
    asset_id IN (
      SELECT a.id FROM assets a
      JOIN entities e ON a.entity_id = e.id
      JOIN clients c ON e.client_id = c.id
      WHERE c.org_id IN (SELECT public.get_user_org_ids())
    )
  );

-- ============================================================================
-- 8. DOCUMENTS
-- ============================================================================
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "documents_select" ON "documents"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "documents_insert" ON "documents"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "documents_update" ON "documents"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "documents_delete" ON "documents"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 9. DOCUMENT_REQUESTS
-- ============================================================================
ALTER TABLE "document_requests" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_requests_select" ON "document_requests"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "document_requests_insert" ON "document_requests"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "document_requests_update" ON "document_requests"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "document_requests_delete" ON "document_requests"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 10. COMPLIANCE_CONTROLS
-- ============================================================================
ALTER TABLE "compliance_controls" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_controls_select" ON "compliance_controls"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "compliance_controls_insert" ON "compliance_controls"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "compliance_controls_update" ON "compliance_controls"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "compliance_controls_delete" ON "compliance_controls"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 11. COMPLIANCE_EVIDENCE (scoped through control → org)
-- ============================================================================
ALTER TABLE "compliance_evidence" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "compliance_evidence_select" ON "compliance_evidence"
  FOR SELECT USING (
    control_id IN (SELECT id FROM compliance_controls WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "compliance_evidence_insert" ON "compliance_evidence"
  FOR INSERT WITH CHECK (
    control_id IN (SELECT id FROM compliance_controls WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "compliance_evidence_update" ON "compliance_evidence"
  FOR UPDATE USING (
    control_id IN (SELECT id FROM compliance_controls WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "compliance_evidence_delete" ON "compliance_evidence"
  FOR DELETE USING (
    control_id IN (SELECT id FROM compliance_controls WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

-- ============================================================================
-- 12. LEDGER_EVENTS — IMMUTABLE: INSERT + SELECT ONLY
-- ============================================================================
ALTER TABLE "ledger_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ledger_events_select" ON "ledger_events"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "ledger_events_insert" ON "ledger_events"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

-- NO UPDATE POLICY — ledger events are immutable
-- NO DELETE POLICY — ledger events can never be deleted

-- ============================================================================
-- 13. REPORTS
-- ============================================================================
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select" ON "reports"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "reports_insert" ON "reports"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "reports_update" ON "reports"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "reports_delete" ON "reports"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 14. REPORT_VERSIONS (scoped through report → org)
-- ============================================================================
ALTER TABLE "report_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_versions_select" ON "report_versions"
  FOR SELECT USING (
    report_id IN (SELECT id FROM reports WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "report_versions_insert" ON "report_versions"
  FOR INSERT WITH CHECK (
    report_id IN (SELECT id FROM reports WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

-- Report versions are immutable — no update or delete
-- (Old versions are preserved forever for compliance)

-- ============================================================================
-- 15. TASKS
-- ============================================================================
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select" ON "tasks"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tasks_insert" ON "tasks"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tasks_update" ON "tasks"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tasks_delete" ON "tasks"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 16. ASSIGNMENTS
-- ============================================================================
ALTER TABLE "assignments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assignments_select" ON "assignments"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "assignments_insert" ON "assignments"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "assignments_update" ON "assignments"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "assignments_delete" ON "assignments"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 17. INTEGRATIONS
-- ============================================================================
ALTER TABLE "integrations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select" ON "integrations"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "integrations_insert" ON "integrations"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "integrations_update" ON "integrations"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "integrations_delete" ON "integrations"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 18. NOTIFICATIONS
-- ============================================================================
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select" ON "notifications"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "notifications_insert" ON "notifications"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "notifications_update" ON "notifications"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "notifications_delete" ON "notifications"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 19. GOALS
-- ============================================================================
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select" ON "goals"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "goals_insert" ON "goals"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "goals_update" ON "goals"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "goals_delete" ON "goals"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 20. DEALS
-- ============================================================================
ALTER TABLE "deals" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_select" ON "deals"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "deals_insert" ON "deals"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "deals_update" ON "deals"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "deals_delete" ON "deals"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 21. CONVERSATIONS
-- ============================================================================
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select" ON "conversations"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "conversations_insert" ON "conversations"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "conversations_update" ON "conversations"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "conversations_delete" ON "conversations"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 22. MESSAGES (scoped through conversation → org)
-- ============================================================================
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages_select" ON "messages"
  FOR SELECT USING (
    conversation_id IN (SELECT id FROM conversations WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "messages_insert" ON "messages"
  FOR INSERT WITH CHECK (
    conversation_id IN (SELECT id FROM conversations WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "messages_update" ON "messages"
  FOR UPDATE USING (
    conversation_id IN (SELECT id FROM conversations WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

CREATE POLICY "messages_delete" ON "messages"
  FOR DELETE USING (
    conversation_id IN (SELECT id FROM conversations WHERE org_id IN (SELECT public.get_user_org_ids()))
  );

-- ============================================================================
-- 23. CALENDAR_EVENTS
-- ============================================================================
ALTER TABLE "calendar_events" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calendar_events_select" ON "calendar_events"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "calendar_events_insert" ON "calendar_events"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "calendar_events_update" ON "calendar_events"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "calendar_events_delete" ON "calendar_events"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 24. INSURANCE_POLICIES
-- ============================================================================
ALTER TABLE "insurance_policies" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insurance_policies_select" ON "insurance_policies"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "insurance_policies_insert" ON "insurance_policies"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "insurance_policies_update" ON "insurance_policies"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "insurance_policies_delete" ON "insurance_policies"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 25. BENCHMARKS
-- ============================================================================
ALTER TABLE "benchmarks" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "benchmarks_select" ON "benchmarks"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "benchmarks_insert" ON "benchmarks"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "benchmarks_update" ON "benchmarks"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "benchmarks_delete" ON "benchmarks"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 26. BILLING_RECORDS
-- ============================================================================
ALTER TABLE "billing_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_records_select" ON "billing_records"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "billing_records_insert" ON "billing_records"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "billing_records_update" ON "billing_records"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "billing_records_delete" ON "billing_records"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));

-- ============================================================================
-- 27. TAX_DEDUCTIONS
-- ============================================================================
ALTER TABLE "tax_deductions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tax_deductions_select" ON "tax_deductions"
  FOR SELECT USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tax_deductions_insert" ON "tax_deductions"
  FOR INSERT WITH CHECK (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tax_deductions_update" ON "tax_deductions"
  FOR UPDATE USING (org_id IN (SELECT public.get_user_org_ids()));

CREATE POLICY "tax_deductions_delete" ON "tax_deductions"
  FOR DELETE USING (org_id IN (SELECT public.get_user_org_ids()));
