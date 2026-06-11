const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      margin-bottom: 0.9rem;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.25rem;
    }
    input, textarea {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #c7ccd3;
      border-radius: 8px;
      background: #fff;
    }
  </style>
  <label id="label" for="control"></label>
  <input id="control" />
  <validation-message id="error"></validation-message>
`;

class ProfileField extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.labelEl = this.shadowRoot.getElementById('label');
    this.control = this.shadowRoot.getElementById('control');
    this.error = this.shadowRoot.getElementById('error');
    this.control.addEventListener('input', () => {
      this.dispatchEvent(
        new CustomEvent('field-change', {
          detail: { name: this.name, value: this.value },
          bubbles: true,
          composed: true,
        }),
      );
    });
  }

  static get observedAttributes() {
    return ['name', 'label', 'type', 'value', 'error', 'multiline', 'disabled'];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  get name() {
    return this.getAttribute('name') || '';
  }

  get value() {
    return this.control.value;
  }

  render() {
    const multiline = this.hasAttribute('multiline');
    const disabled = this.hasAttribute('disabled');
    const controlId = `field-${this.name}`;

    if (multiline && this.control.tagName !== 'TEXTAREA') {
      const textarea = document.createElement('textarea');
      textarea.id = 'control';
      textarea.rows = 3;
      this.control.replaceWith(textarea);
      this.control = textarea;
      this.control.addEventListener('input', () => {
        this.dispatchEvent(
          new CustomEvent('field-change', {
            detail: { name: this.name, value: this.value },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }

    if (!multiline && this.control.tagName !== 'INPUT') {
      const input = document.createElement('input');
      input.id = 'control';
      this.control.replaceWith(input);
      this.control = input;
      this.control.addEventListener('input', () => {
        this.dispatchEvent(
          new CustomEvent('field-change', {
            detail: { name: this.name, value: this.value },
            bubbles: true,
            composed: true,
          }),
        );
      });
    }

    this.control.id = controlId;
    this.labelEl.setAttribute('for', controlId);
    this.labelEl.textContent = this.getAttribute('label') || this.name;

    if (this.control.tagName === 'INPUT') {
      this.control.type = this.getAttribute('type') || 'text';
    }
    this.control.value = this.getAttribute('value') || '';
    this.control.disabled = disabled;
    this.error.setAttribute('message', this.getAttribute('error') || '');
  }
}

customElements.define('profile-field', ProfileField);
