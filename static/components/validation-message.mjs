const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      min-height: 1.1rem;
      color: #b42318;
      font-size: 0.85rem;
      margin-top: 0.25rem;
    }
  </style>
  <span id="text"></span>
`;

class ValidationMessage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.textEl = this.shadowRoot.getElementById('text');
  }

  static get observedAttributes() {
    return ['message'];
  }

  attributeChangedCallback() {
    this.render();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const message = this.getAttribute('message') || '';
    this.textEl.textContent = message;
  }
}

customElements.define('validation-message', ValidationMessage);
