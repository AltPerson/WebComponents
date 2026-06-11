import { buildProfileState } from '/shared/profile-domain.mjs';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    dialog {
      border: none;
      border-radius: 12px;
      min-width: 420px;
      max-width: 680px;
    }
    .actions {
      display: flex;
      gap: 0.5rem;
      justify-content: flex-end;
      margin-top: 0.75rem;
    }
  </style>
  <dialog id="dialog">
    <h3>Create profile</h3>
    <profile-form id="form" mode="create"></profile-form>
    <div class="actions">
      <button type="button" id="cancel">Cancel</button>
      <button type="button" id="create">Create</button>
    </div>
  </dialog>
`;

class ProfileCreateDialog extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.dialog = this.shadowRoot.getElementById('dialog');
    this.form = this.shadowRoot.getElementById('form');
    this.cancelBtn = this.shadowRoot.getElementById('cancel');
    this.createBtn = this.shadowRoot.getElementById('create');
    this.state = buildProfileState({});
  }

  connectedCallback() {
    this.form.state = this.state;
    this.form.editableId = true;
    this.form.addEventListener('profile-state-change', (event) => {
      this.state = event.detail.state;
      this.createBtn.disabled = !this.state.valid;
    });
    this.cancelBtn.addEventListener('click', () => this.close());
    this.createBtn.addEventListener('click', () => this.submit());
  }

  open() {
    this.state = buildProfileState({});
    this.form.state = this.state;
    this.createBtn.disabled = !this.state.valid;
    this.dialog.showModal();
  }

  close() {
    this.dialog.close();
  }

  async submit() {
    if (!this.state.valid) return;
    const res = await fetch('/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.state.profile),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.ok) {
      if (body && body.errors) {
        this.form.serverErrors = body.errors;
      } else if (body && body.error) {
        this.form.serverErrors = { id: body.error };
      }
      return;
    }
    this.dispatchEvent(
      new CustomEvent('profile-created', {
        detail: { id: body.profile.id },
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }
}

customElements.define('profile-create-dialog', ProfileCreateDialog);
