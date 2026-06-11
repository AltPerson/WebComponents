const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      margin-bottom: 0.75rem;
    }
    .row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem;
    }
    input {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #c7ccd3;
      border-radius: 8px;
      background: #fff;
    }
  </style>
  <div class="row">
    <input id="name" placeholder="Search by name..." />
    <input id="email" placeholder="Search by email..." />
  </div>
`;

class ProfileSearch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.nameInput = this.shadowRoot.getElementById('name');
    this.emailInput = this.shadowRoot.getElementById('email');
    this.timer = null;
  }

  connectedCallback() {
    const emit = () => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.dispatchEvent(
          new CustomEvent('search-change', {
            detail: {
              name: this.nameInput.value,
              email: this.emailInput.value,
            },
            bubbles: true,
            composed: true,
          }),
        );
      }, 250);
    };
    this.nameInput.addEventListener('input', emit);
    this.emailInput.addEventListener('input', emit);
  }
}

customElements.define('profile-search', ProfileSearch);
