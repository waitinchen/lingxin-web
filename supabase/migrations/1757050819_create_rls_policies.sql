-- Migration: create_rls_policies
-- Created at: 1757050819

-- Users table policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Super admins can manage users" ON users
  FOR ALL USING (get_user_role(auth.uid()) = 'super_admin');

-- User identities policies  
CREATE POLICY "Users can view own identities" ON user_identities
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own identities" ON user_identities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User profiles policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies (user's own messages)
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

-- Memory summaries policies
CREATE POLICY "Users can view own memory summaries" ON memory_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage memory summaries" ON memory_summaries
  FOR ALL USING (auth.role() = 'service_role');

-- User persona prefs policies  
CREATE POLICY "Users can view own persona prefs" ON user_persona_prefs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own persona prefs" ON user_persona_prefs
  FOR ALL USING (auth.uid() = user_id);

-- Scheduled nudges policies
CREATE POLICY "Users can view own scheduled nudges" ON scheduled_nudges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own scheduled nudges" ON scheduled_nudges
  FOR ALL USING (auth.uid() = user_id);

-- Nudges log policies
CREATE POLICY "Users can view own nudge logs" ON nudges_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage nudge logs" ON nudges_log
  FOR ALL USING (auth.role() = 'service_role');

-- Nudge preferences policies
CREATE POLICY "Users can manage own nudge prefs" ON nudge_prefs
  FOR ALL USING (auth.uid() = user_id);;