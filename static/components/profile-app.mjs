const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
    }
    header {
      background: #0f172a;
      color: #fff;
      padding: 0.85rem 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    a {
      color: #93c5fd;
    }
    main {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1rem;
    }
    .error {
      color: #b42318;
      padding: 1rem;
      background: #fff;
      border: 1px solid #f1c0be;
      border-radius: 12px;
    }
  </style>
  <header>
    <strong>Professional Profiles</strong>
    <a href="/" id="homeLink">Directory</a>
  </header>
  <main id="main"></main>
`;

class ProfileApp extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(template.content.cloneNode(true));
    this.main = this.shadowRoot.getElementById('main');
    this.homeLink = this.shadowRoot.getElementById('homeLink');
  }

  connectedCallback() {
    this.homeLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.go('/');
    });

    this.shadowRoot.addEventListener('navigate-profile', (event) => {
      this.go(event.detail.path);
    });

    if ('navigation' in window && window.navigation) {
      window.navigation.addEventListener('navigate', (event) => {
        const url = new URL(event.destination.url);
        if (url.origin !== window.location.origin) return;
        event.intercept({
          handler: async () => {
            this.renderRoute(url.pathname);
          },
        });
      });
    }

    window.addEventListener('popstate', () =>
      this.renderRoute(window.location.pathname),
    );
    this.renderRoute(window.location.pathname);
  }

  go(path) {
    if ('navigation' in window && window.navigation?.navigate) {
      window.navigation.navigate(path);
      return;
    }
    window.history.pushState({}, '', path);
    this.renderRoute(path);
  }

  async renderRoute(pathname) {
    while (this.main.firstChild) this.main.removeChild(this.main.firstChild);

    if (pathname === '/') {
      const directory = document.createElement('profile-directory');
      this.main.append(directory);
      return;
    }

    if (pathname.startsWith('/profile/')) {
      const username = pathname.slice('/profile/'.length);
      await this.renderProfile(username);
      return;
    }

    const message = document.createElement('div');
    message.className = 'error';
    message.textContent = 'Route not found';
    this.main.append(message);
  }

  async renderProfile(username) {
    const res = await fetch(`/profile/${encodeURIComponent(username)}`, {
      headers: { Accept: 'application/json' },
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || !body.ok) {
      const message = document.createElement('div');
      message.className = 'error';
      message.textContent = 'Profile not found';
      this.main.append(message);
      return;
    }
    const form = document.createElement('profile-form');
    form.state = body;
    this.main.append(form);
  }
}

customElements.define('profile-app', ProfileApp);
