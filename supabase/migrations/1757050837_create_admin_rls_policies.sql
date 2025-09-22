-- Migration: create_admin_rls_policies
-- Created at: 1757050837

-- Personas policies (Soul layer - Super Admin only)
CREATE POLICY "Super admins can manage personas" ON personas
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view personas" ON personas
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Persona prompts policies (Soul layer - Super Admin only)
CREATE POLICY "Super admins can manage persona prompts" ON persona_prompts
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view persona prompts" ON persona_prompts
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Guardrails policies (Soul layer - Super Admin only)
CREATE POLICY "Super admins can manage guardrails" ON guardrails
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

CREATE POLICY "Admins can view guardrails" ON guardrails
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Datasets policies (Skill layer - Admin and Super Admin)
CREATE POLICY "Admins can manage datasets" ON datasets
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Start phrases policies (Skill layer - Admin and Super Admin)  
CREATE POLICY "Admins can manage start phrases" ON start_phrases
  FOR ALL USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Audit login events policies (Performance layer - Admin view only)
CREATE POLICY "Admins can view audit logs" ON audit_login_events
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- System service role policies for all tables
CREATE POLICY "Service role full access" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON user_identities FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON user_profiles FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON audit_login_events FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON messages FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON memory_summaries FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON user_persona_prefs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON scheduled_nudges FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON nudges_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON nudge_prefs FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON personas FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON persona_prompts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON guardrails FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON datasets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access" ON start_phrases FOR ALL USING (auth.role() = 'service_role');;