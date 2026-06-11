const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    .item {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
      align-items: center;
      padding: 0.6rem;
      border-radius: 8px;
      border: 1px solid #d8dee6;
      background: #fff;
      margin-bottom: 0.5rem;
    }
    .name {
      font-weight: 600;
    }
    .email {
      color: #4d5761;
      font-size: 0.9rem;
    }
    .actions {
      display: flex;
      gap: 0.4rem;
    }
  </style>
  <div class="item">
    <div>
      <div class="name" id="name"></div>
      <div class="email" id="email"></div>
    </div>
    <div class="actions">
      <button id="open" type="button">Open</button>
      <button id="delete" type="button">Delete</button>
    </div>
  </div>
`;

class ProfileItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.nameEl = this.shadowRoot.getElementById('name');
    this.emailEl = this.shadowRoot.getElementById('email');
    this.openBtn = this.shadowRoot.getElementById('open');
    this.deleteBtn = this.shadowRoot.getElementById('delete');
  }

  connectedCallback() {
    this.render();
    this.openBtn.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('open-profile', {
          detail: { id: this.getAttribute('profile-id') || '' },
          bubbles: true,
          composed: true,
        }),
      );
    });
    this.deleteBtn.addEventListener('click', () => {
      this.dispatchEvent(
        new CustomEvent('delete-profile', {
          detail: { id: this.getAttribute('profile-id') || '' },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  static get observedAttributes() {
    return ['display-name', 'email'];
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    this.nameEl.textContent = this.getAttribute('display-name') || '';
    this.emailEl.textContent = this.getAttribute('email') || '';
  }
}

customElements.define('profile-item', ProfileItem);
