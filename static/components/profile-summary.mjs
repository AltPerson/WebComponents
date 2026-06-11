const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      padding: 0.75rem;
      border-radius: 10px;
      background: #f8fafc;
      border: 1px solid #dce2ea;
      margin: 0.75rem 0;
    }
    .row {
      margin: 0.25rem 0;
      font-size: 0.95rem;
    }
    .label {
      font-weight: 600;
      margin-right: 0.25rem;
    }
  </style>
  <div class="row"><span class="label">Display:</span><span id="displayName"></span></div>
  <div class="row"><span class="label">Age:</span><span id="age"></span></div>
  <div class="row"><span class="label">Seniority:</span><span id="seniorityLevel"></span></div>
  <div class="row"><span class="label">Monthly Capacity:</span><span id="monthlyCapacityHours"></span></div>
  <div class="row"><span class="label">Monthly Income:</span><span id="estimatedMonthlyIncome"></span></div>
  <div class="row"><span class="label">Completeness:</span><span id="profileCompleteness"></span></div>
  <div class="row"><span class="label">Public Slug:</span><span id="publicSlug"></span></div>
`;

class ProfileSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.ids = {};
    for (const id of [
      'displayName',
      'age',
      'seniorityLevel',
      'monthlyCapacityHours',
      'estimatedMonthlyIncome',
      'profileCompleteness',
      'publicSlug',
    ]) {
      this.ids[id] = this.shadowRoot.getElementById(id);
    }
  }

  set data(value) {
    this._data = value || {};
    this.render();
  }

  connectedCallback() {
    this.upgradeProperty('data');
    this.render();
  }

  upgradeProperty(prop) {
    if (!Object.prototype.hasOwnProperty.call(this, prop)) return;
    const value = this[prop];
    delete this[prop];
    this[prop] = value;
  }

  render() {
    const data = this._data || {};
    this.ids.displayName.textContent = data.displayName || '-';
    this.ids.age.textContent =
      data.age === null || data.age === undefined ? '-' : String(data.age);
    this.ids.seniorityLevel.textContent = data.seniorityLevel || '-';
    this.ids.monthlyCapacityHours.textContent =
      data.monthlyCapacityHours === null ||
      data.monthlyCapacityHours === undefined
        ? '-'
        : String(data.monthlyCapacityHours);
    this.ids.estimatedMonthlyIncome.textContent =
      data.estimatedMonthlyIncome === null ||
      data.estimatedMonthlyIncome === undefined
        ? '-'
        : String(data.estimatedMonthlyIncome);
    this.ids.profileCompleteness.textContent =
      data.profileCompleteness === null ||
      data.profileCompleteness === undefined
        ? '-'
        : `${data.profileCompleteness}%`;
    this.ids.publicSlug.textContent = data.publicSlug || '-';
  }
}

customElements.define('profile-summary', ProfileSummary);
