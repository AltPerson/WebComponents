class ProfileList extends HTMLElement {
  set items(value) {
    this._items = Array.isArray(value) ? value : [];
    this.render();
  }

  get items() {
    return this._items || [];
  }

  connectedCallback() {
    this.render();
  }

  render() {
    while (this.firstChild) this.removeChild(this.firstChild);
    if (this.items.length === 0) {
      const empty = document.createElement('p');
      empty.textContent = 'No profiles found.';
      this.append(empty);
      return;
    }
    for (const item of this.items) {
      const el = document.createElement('profile-item');
      el.setAttribute('profile-id', item.id);
      el.setAttribute('display-name', item.displayName || item.id);
      el.setAttribute('email', item.email || '');
      this.append(el);
    }
  }
}

customElements.define('profile-list', ProfileList);
