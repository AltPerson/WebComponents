import {
  PROFILE_FIELDS_METADATA,
  buildProfileState,
} from '/shared/profile-domain.mjs';

const FIELD_LABEL_OVERRIDES = {
  id: 'Username',
  secondarySkills: 'Secondary Skills (comma separated)',
};

const FIELD_TYPE_OVERRIDES = {
  birthDate: 'date',
  email: 'email',
};

const toFieldLabel = (name) => {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const toInputType = (name, metadata) => {
  if (FIELD_TYPE_OVERRIDES[name]) return FIELD_TYPE_OVERRIDES[name];
  if (metadata.type === 'number' || metadata.type === 'integer') return 'number';
  return 'text';
};

const FIELDS = Object.entries(PROFILE_FIELDS_METADATA).map(([name, metadata]) => ({
  name,
  label: FIELD_LABEL_OVERRIDES[name] || toFieldLabel(name),
  type: toInputType(name, metadata),
  metadata,
}));

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    form {
      background: #fff;
      border: 1px solid #dce2ea;
      border-radius: 12px;
      padding: 1rem;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    #status {
      color: #067647;
      font-size: 0.9rem;
    }
  </style>
  <form id="form">
    <h3 id="title">Profile</h3>
    <div id="fields"></div>
    <profile-summary id="summary"></profile-summary>
    <div class="actions">
      <button id="save" type="submit">Save</button>
      <span id="status"></span>
    </div>
  </form>
`;

class ProfileForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.formEl = this.shadowRoot.getElementById('form');
    this.fieldsEl = this.shadowRoot.getElementById('fields');
    this.summaryEl = this.shadowRoot.getElementById('summary');
    this.saveBtn = this.shadowRoot.getElementById('save');
    this.statusEl = this.shadowRoot.getElementById('status');
    this.fieldEls = new Map();
    this._state = buildProfileState({});
    this._serverErrors = {};
    this._editableId = false;
  }

  connectedCallback() {
    this.renderFields();
    this.formEl.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSave();
    });
    this.formEl.addEventListener('field-change', (event) => {
      this.updateField(event.detail.name, event.detail.value);
    });
    this.render();
  }

  set state(value) {
    this._state = value;
    this._serverErrors = {};
    this.render();
  }

  get state() {
    return this._state;
  }

  set serverErrors(value) {
    this._serverErrors = value || {};
    this.render();
  }

  set editableId(value) {
    this._editableId = Boolean(value);
    this.render();
  }

  renderFields() {
    while (this.fieldsEl.firstChild) { this.fieldsEl.removeChild(this.fieldsEl.firstChild); }
    for (const { name, label, type } of FIELDS) {
      const field = document.createElement('profile-field');
      field.setAttribute('name', name);
      field.setAttribute('label', label);
      field.setAttribute('type', type);
      if (name === 'bio') field.setAttribute('multiline', '');
      this.fieldsEl.append(field);
      this.fieldEls.set(name, field);
    }
  }

  updateField(name, value) {
    const next = { ...this.state.profile };
    if (name === 'secondarySkills') {
      next[name] = value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (
      PROFILE_FIELDS_METADATA[name]?.type === 'number' ||
      PROFILE_FIELDS_METADATA[name]?.type === 'integer'
    ) {
      next[name] = value === '' ? 0 : Number(value);
    } else {
      next[name] = value;
    }

    this._state = buildProfileState(next);
    this._serverErrors = {};
    this.dispatchEvent(
      new CustomEvent('profile-state-change', {
        detail: { state: this._state },
        bubbles: true,
        composed: true,
      }),
    );
    this.render();
  }

  async handleSave() {
    if (this.getAttribute('mode') === 'create') return;
    if (!this.state.valid) return;
    const username = this.state.profile.id;
    const response = await fetch(`/profile/${encodeURIComponent(username)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.state.profile),
    });
    const body = await response.json().catch(() => ({}));

    if (!response.ok || !body.ok) {
      this.serverErrors = body.errors || { general: 'Save failed' };
      this.statusEl.textContent = '';
      return;
    }
    this._state = body;
    this.statusEl.textContent = 'Saved';
    setTimeout(() => {
      if (this.statusEl.textContent === 'Saved') this.statusEl.textContent = '';
    }, 1500);
    this.dispatchEvent(
      new CustomEvent('profile-saved', {
        detail: { state: this._state },
        bubbles: true,
        composed: true,
      }),
    );
    this.render();
  }

  render() {
    if (!this.isConnected) return;
    const profile = this.state?.profile || {};
    const errors = {
      ...this.state?.errors || {},
      ...this._serverErrors || {},
    };

    for (const { name } of FIELDS) {
      const field = this.fieldEls.get(name);
      if (!field) continue;
      if (name === 'secondarySkills') {
        field.setAttribute(
          'value',
          Array.isArray(profile[name]) ? profile[name].join(', ') : '',
        );
      } else {
        field.setAttribute(
          'value',
          profile[name] === undefined || profile[name] === null
            ? ''
            : String(profile[name]),
        );
      }
      field.setAttribute('error', errors[name] || '');
      if (name === 'id' && !this._editableId) { field.setAttribute('disabled', ''); }
      if (name !== 'id' || this._editableId) field.removeAttribute('disabled');
    }

    this.saveBtn.disabled =
      !this.state.valid || this.getAttribute('mode') === 'create';
    this.summaryEl.data = this.state.computed || {};
  }
}

customElements.define('profile-form', ProfileForm);
