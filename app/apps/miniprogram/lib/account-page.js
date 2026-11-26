const { passwordRules } = require('./access-feedback');
const emptySecrets = { password: '', confirmation: '', oldPassword: '' };
const emptyFeedback = { rules: passwordRules(''), showRuleStatus: false, confirmationStatus: '', confirmationMatches: false, fieldErrors: {}, focusField: '' };

function createAccountPage({ api, catalogue, newRequestId }) {
  return {
    data: {
      mode: 'register', ...emptySecrets, ...emptyFeedback, loginName: '', name: '', contact: '', syntheticOnly: false,
      ready: false, busy: false, allowed: false, unknown: false, error: '', notice: '', complete: false,
    },
    onLoad(options) {
      this._version = 0;
      this.setData({ mode: options.mode === 'password' ? 'password' : 'register' });
    },
    async onShow() {
      if (this.data.complete) return;
      const version = ++this._version;
      this.setData({ ready: false, error: '' });
      try {
        const options = await catalogue().promise;
        if (version !== this._version) return;
        const allowed = this.data.mode === 'register' ? options.patientRegistrationEnabled === true : options.experience === 'teacher-demo';
        if (allowed && this.data.mode === 'password') await api.session();
        if (version === this._version) this.setData({ allowed, ready: true });
      } catch (error) {
        if (version === this._version) this.setData({ ready: true, allowed: false, error: error.message });
      }
    },
    onHide() {
      this._version++;
      this._pending = null;
      const lost = this.data.busy || this.data.unknown;
      this.setData({ ...emptySecrets, ...emptyFeedback, busy: false, unknown: false,
        ...(lost ? { complete: true, notice: '提交结果尚未确认，请返回登录核实。' } : {}) });
    },
    onUnload() { this._version++; this._pending = null; },
    input(e) {
      const field = e.currentTarget.dataset.field;
      if (this.data.busy || this.data.unknown || !['loginName', 'password', 'confirmation', 'name', 'contact', 'oldPassword'].includes(field)) return;
      const value = e.detail.value;
      const fieldErrors = { ...this.data.fieldErrors };
      delete fieldErrors[field];
      const update = { [field]: value, fieldErrors, error: '', focusField: '' };
      if (field === 'password' || field === 'confirmation') {
        const password = field === 'password' ? value : this.data.password;
        const confirmation = field === 'confirmation' ? value : this.data.confirmation;
        update.rules = passwordRules(password);
        update.showRuleStatus = password.length > 0;
        update.confirmationMatches = confirmation.length > 0 && confirmation === password;
        update.confirmationStatus = confirmation ? (update.confirmationMatches ? '两次密码一致。' : '两次密码不一致。') : '';
        delete fieldErrors.confirmation;
      }
      this.setData(update);
    },
    consent(e) {
      if (this.data.busy || this.data.unknown) return;
      const fieldErrors = { ...this.data.fieldErrors };
      delete fieldErrors.syntheticOnly;
      this.setData({ syntheticOnly: e.detail.value.includes('yes'), fieldErrors });
    },
    async submit() {
      const { mode, ready, allowed, busy, complete, loginName, name, contact, syntheticOnly, password, confirmation, oldPassword } = this.data;
      if (!ready || !allowed || busy || complete) return;
      if (!this._pending) {
        const rules = passwordRules(password), fieldErrors = {};
        if (mode === 'register') {
          if (!/^[a-z][a-z0-9_]{3,31}$/i.test(loginName.trim())) fieldErrors.loginName = '账号须以英文字母开头，使用4—32位英文字母、数字或下划线（_）。';
        } else if (!oldPassword || oldPassword === password) {
          fieldErrors.oldPassword = '请填写原密码，并设置不同的新密码。';
        }
        if (rules.some(rule => !rule.met) || /[\u0000-\u001f]/.test(password)) fieldErrors.password = rules.every(rule => rule.met) ? '请删除密码中无法显示的字符。' : '请满足下方全部密码要求。';
        if (!confirmation || confirmation !== password) fieldErrors.confirmation = '请再次输入相同的密码。';
        if (mode === 'register') {
          if (!name.trim() || name.trim().length > 40 || /[\u0000-\u001f]/.test(name)) fieldErrors.name = '请填写预约姓名，最多40字。';
          if (!/^\+?[0-9 ()-]{6,40}$/.test(contact.trim())) fieldErrors.contact = '请填写有效的预约联系电话，演示请使用合成号码。';
          if (!syntheticOnly) fieldErrors.syntheticOnly = '请勾选确认，仅使用合成资料。';
        }
        const first = Object.keys(fieldErrors)[0];
        if (first) {
          this.setData({ fieldErrors, rules, showRuleStatus: true, error: '', focusField: first });
          return;
        }
      }
      const version = this._version;
      this.setData({ busy: true, error: '', ...emptySecrets, ...emptyFeedback });
      try {
        if (mode === 'register') {
          if (!this._pending) {
            const requestId = await newRequestId();
            if (version !== this._version) return;
            this._pending = { requestId, loginName: loginName.trim(), name: name.trim(), contact: contact.trim(), password, syntheticOnly: true };
          }
          const result = await api.register(this._pending);
          if (version !== this._version) return;
          if (!result || result.registered !== true || result.loginName !== this._pending.loginName.toLowerCase()) throw Error('尚未确认注册结果。');
        } else {
          await api.changePassword({ oldPassword, newPassword: password });
          if (version !== this._version) return;
        }
        this._pending = null;
        this.setData({ unknown: false, complete: true, notice: mode === 'register' ? '注册成功。请使用刚设置的账号和密码登录。' : '密码已修改，请使用新密码重新登录。' });
      } catch (error) {
        if (version !== this._version) return;
        if (mode === 'register' && this._pending && (!error.definite || this.data.unknown)) {
          this.setData({ unknown: true, error: '尚未确认注册结果。可重试同一请求，或返回尝试登录。' });
        } else if (mode === 'password' && !error.definite) {
          api.forget();
          this.setData({ complete: true, notice: '密码修改结果尚未确认。请返回登录，先尝试新密码。' });
        } else {
          this._pending = null;
          this.setData({ error: error.message });
        }
      } finally { if (version === this._version) this.setData({ busy: false }); }
    },
  };
}

module.exports = { createAccountPage };
