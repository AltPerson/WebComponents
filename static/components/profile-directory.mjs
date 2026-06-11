const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      max-width: 900px;
      margin: 1.5rem auto;
      padding: 0 1rem;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }
    .panel {
      background: #fff;
      border: 1px solid #dce2ea;
      border-radius: 12px;
      padding: 1rem;
    }
  </style>
  <div class="header">
    <h2>Profile Directory</h2>
    <button id="create" type="button">Create Profile</button>
  </div>
  <div class="panel">
    <profile-search id="search"></profile-search>
    <profile-list id="list"></profile-list>
  </div>
  <profile-create-dialog id="createDialog"></profile-create-dialog>
`;

class ProfileDirectory extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.search = this.shadowRoot.getElementById('search');
    this.list = this.shadowRoot.getElementById('list');
    this.createBtn = this.shadowRoot.getElementById('create');
    this.createDialog = this.shadowRoot.getElementById('createDialog');
    this.query = { name: '', email: '' };
  }

  connectedCallback() {
    this.load();
    this.search.addEventListener('search-change', (event) => {
      this.query = event.detail;
      this.load();
    });
    this.list.addEventListener('open-profile', (event) => {
      this.dispatchEvent(
        new CustomEvent('navigate-profile', {
          detail: { path: `/profile/${event.detail.id}` },
          bubbles: true,
          composed: true,
        }),
      );
    });
    this.list.addEventListener('delete-profile', (event) =>
      this.removeProfile(event.detail.id),
    );
    this.createBtn.addEventListener('click', () => this.createDialog.open());
    this.createDialog.addEventListener('profile-created', (event) => {
      this.load();
      this.dispatchEvent(
        new CustomEvent('navigate-profile', {
          detail: { path: `/profile/${event.detail.id}` },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  async load() {
    const params = new URLSearchParams();
    if (this.query.name) params.set('name', this.query.name);
    if (this.query.email) params.set('email', this.query.email);
    const query = params.toString();
    const url = query ? `/profile?${query}` : '/profile';
    const res = await fetch(url);
    const body = await res.json().catch(() => ({ ok: false, items: [] }));
    this.list.items = body.items || [];
  }

  async removeProfile(id) {
    const ok = window.confirm(`Delete profile "${id}"?`);
    if (!ok) return;
    const res = await fetch(`/profile/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (res.ok) this.load();
  }
}

customElements.define('profile-directory', ProfileDirectory);
