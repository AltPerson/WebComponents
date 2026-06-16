# WebComponents

Native full-stack demo app "Profile editor" built with plain Node.js, browser ES modules, Web Components, Shadow DOM, templates, and shared domain logic.

Technical specification and reference for a small application that browses, searches, creates, edits, and deletes professional profiles. The application demonstrates a frontend without frameworks, bundlers, client-side template fetching, or duplicated business rules.

The main idea is to keep application behavior in a shared domain module and run the same rules on both sides. The application is not a simple CRUD form.

It supports:

- profile directory
- profile search
- profile creation
- profile editing
- profile deletion
- client-side validation
- server-side validation
- computed profile fields
- shared domain logic for browser and server

## Design constraints

- The project avoids direct fetch calls from components
- Use only native APIs
- Do not use runtime npm dependencies
- Use plain Node.js on the server
- Use browser ES modules on the client
- Use Web Components, Template API, and Navigation API on the client
- Use `<template>` for UI fragments and Web Components with Shadow DOM where appropriate

Development tools (ESLint, Prettier) are optional and used only at design time.

## Run

Install development dependencies:

```bash
npm install
```

Start the server:

```bash
node server.js
```

Open:

```text
http://127.0.0.1:8000/
```

Example profile page:

```text
http://127.0.0.1:8000/profile/marcus
```

## Scripts

```bash
npm run lint
npm run fix
```

## Domain model

Each profile is identified by a username. The username in the URL must match the profile file name under `./data/profile/` without the `.json` extension. For example, `/profile/marcus` reads and writes `./data/profile/marcus.json`.

Example profile:

```json
{
  "id": "marcus",
  "firstName": "Marcus",
  "lastName": "Aurelius",
  "email": "marcus@example.com",
  "country": "Roman Empire",
  "city": "Rome",
  "birthDate": "121-04-26",
  "experienceYears": 12,
  "primarySkill": "Architecture",
  "secondarySkills": ["Node.js", "Distributed Systems"],
  "weeklyAvailabilityHours": 24,
  "hourlyRate": 80,
  "currency": "EUR",
  "bio": "Software architect and fullstack developer"
}
```

### Computed fields

The domain layer calculates:

```text
displayName = firstName + " " + lastName
age = calculated from birthDate
seniorityLevel = Junior | Middle | Senior | Principal (from experienceYears)
monthlyCapacityHours = weeklyAvailabilityHours * 4
estimatedMonthlyIncome = monthlyCapacityHours * hourlyRate
profileCompleteness = percentage based on required fields
publicSlug = normalized public name slug derived from firstName and lastName
```

### Validation

Validation runs in the browser while editing and on the server before saving.

Rules:

```text
id is required
id must match safe username pattern
firstName is required
lastName is required
email must contain "@"
birthDate must be valid and in the past
experienceYears must be an integer from 0 to 60
weeklyAvailabilityHours must be an integer from 0 to 80
hourlyRate must be a number from 0 to 1000
secondarySkills must be an array of non-empty strings
currency is normalized to uppercase
email is normalized to lowercase
```

The server never trusts browser validation.

## Shared domain logic

The domain model lives in `shared/profile.js`.

It exports: `schema`, `normalize`, `validate`, `calculate`, `buildState`.

The same module is imported by:

```text
static/components/profile-form.js
routes/profile.js
routes/search.js
```

This keeps browser behavior and server behavior consistent.

## Project structure

```text
.
├── config.js
├── server.js
├── data/
│   └── profile/
├── lib/
│   ├── channel.js
│   └── router.js
├── routes/
│   ├── profile.js
│   ├── search.js
│   └── static.js
├── shared/
│   ├── profile.js
│   └── utils.js
└── static/
    ├── api.js, app.js
    ├── index.html, styles.css
    └── components/
        ├── <component-name.html>
        └── <component-name.js>
```

## Server architecture

The server:

- serves the main page (`index.html` with assembled templates) at `/` and `/index.html`
- serves static files from `./static` at URL root (`/app.js`, `/styles.css`, `/components/*`, and so on)
- serves shared domain files from `./shared` under `/shared/*`
- serves profile JSON from `./data/profile/{username}.json`
- serves `GET /profile/{username}` with `Accept: text/html` as the main page for browser navigation
- supports profile search with partial matching by display name and email
- supports `GET /profile/{username}` with `Accept: application/json` — read profile JSON
- supports `POST /profile/{username}` — update
- supports `PUT /profile` — create
- supports `DELETE /profile/{username}` — delete
- supports `GET /search?name={value}&email={value}`
- accepts only safe username values
- returns correct `Content-Type`
- returns `404` for unknown routes and missing profile files
- returns `405` for unsupported methods
- returns `400` for invalid JSON
- returns `201` for successful profile creation
- returns `409` for create requests when username already exists
- returns `422` for domain validation errors
- returns `500` only for unexpected server errors
- does not expose files outside the project directory
- prevents path traversal

### Server routing

The request dispatcher is implemented as a **collection of route handlers**, not as a chain of `if/else` or `switch` statements.

At startup the server scans `routes/` and builds a routing table that maps the **first URL path segment** to a route module. The dispatcher looks up that segment and delegates the request.

Route modules are plain `.js` files. Each module exports a default object of HTTP method handlers: `{ GET, POST, PUT, DELETE }`. The router maps the **first URL path segment** to a module file (`search.js` to `/search`, `profile.js` to `/profile/...`). Handler arity defines the expected path shape: a handler `(channel)` serves the mount path (`/search`), a handler `(channel, username)` serves one segment below (`/profile/marcus`).

Example: `routes/profile.js` receives requests whose first segment is `profile`:

```js
export default {
  GET: getProfile,
  POST: updateProfile,
  PUT: createProfile,
  DELETE: removeProfile,
};
```

Example: `routes/search.js` handles profile directory search:

```js
export default {
  GET: searchProfiles,
};
```

The router loads modules dynamically with `readdir`. Segment depth and HTTP method dispatch live in the router; route modules contain only named handlers and the method map. `server.js` contains only bootstrap and dispatch.

## Frontend architecture

The frontend is composed from small custom elements.

- `static/app.js` - application entry point. It imports and registers frontend components.
- `profile-app` — main page: routing, Navigation API, top-level layout
- `profile-directory` — directory page: coordinates search, list, create flow
- `profile-search` — debounced search input, emits `search-change` event
- `profile-list` — renders a list of profile summaries from a data property
- `profile-item` — renders one summary row, emits `open-profile` / `delete-profile`
- `profile-form` — editable profile form driven by state; submits via `api.js`
- `profile-field` — single labeled field with validation message display
- `profile-summary` — displays read-only computed fields
- `validation-message` — displays one error string
- `profile-create-dialog` — modal wrapper for the create flow (present but unused in current flow)

Components do not perform network requests inline. They call the API facade from `api.js` or receive data through properties and events.

### Templates

Each visual component has a separate `.html` file with a single `<template>`, co-located with its `.js` file:

```text
static/components/profile-form.html
static/components/profile-form.js
```

The `.html` file contains one `<template>` element with a matching `id`:

```html
<template id="profile-item">
  <style>
    :host {
      display: block;
    }
    .name {
      font-weight: 600;
    }
  </style>
  <div class="item">
    <div class="name" id="name"></div>
    <div class="email" id="email"></div>
  </div>
</template>
```

**Server-side assembly.** At startup, `routes/static.js` reads `index.html` and all `static/components/*.html` files, concatenates the template fragments, replaces a placeholder comment in `index.html`, and caches the assembled document in memory:

```html
<!-- index.html -->
<body>
  <profile-app></profile-app>
  <script type="module" src="/app.js"></script>
  <!-- {{templates}} -->
</body>
```

The browser receives a single document that already contains all `<template>` elements. Components read their template synchronously from the document:

```js
class ProfileItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.append(
      document.getElementById('profile-item').content.cloneNode(true),
    );
  }
}
```

So components do not need: browser-side template fetching, build step, bundler.

### Declarative rendering

Components minimize imperative DOM construction:

- Drive display updates by setting `textContent` or attributes on pre-queried elements rather than rebuilding subtrees.
- For repeated items, `profile-list` creates one `profile-item` element per summary and fills it through attributes.
- For form fields, `profile-form` creates one `profile-field` element per schema entry and updates values and errors from domain state.
- For computed fields, `profile-summary` derives keys from shared metadata:

```js
import { schema } from '/shared/profile.js';

for (const [key, metadata] of Object.entries(schema)) {
  if (!metadata.computed) continue;
  // update pre-declared element by id
}
```

Computed fields are declared in `schema` with `computed: true`.

- Prefer `replaceChildren()` over manual child removal loops.
- `profile-field` declares both `<input>` and `<textarea>` in the template and shows one of them with CSS.
- Do not use `innerHTML` for untrusted data. Use `textContent`, attributes, and DOM methods.

## API client

All frontend network calls are isolated in `static/api.js`.

It exports: `getProfile`, `saveProfile`, `deleteProfile`, `searchProfiles`, `createProfile`.

Each function returns a normalized result object. HTTP error handling, JSON parsing, and status checks happen inside `api.js`, not in components. Components do not call `fetch` directly.

## HTTP API

Profile routes use a dynamic username segment. The username must match the file name in `./data/profile/` without the `.json` extension.

### Search profiles

```http
GET /search?name={value}&email={value}
```

Response:

```json
{
  "ok": true,
  "items": [
    {
      "id": "marcus",
      "displayName": "Marcus Aurelius",
      "email": "marcus@example.com"
    }
  ]
}
```

Notes:

- `name` and `email` are optional
- empty filters return all profiles
- search is case-insensitive
- results are sorted by username
- `name` supports partial matches against computed `displayName`
- `email` supports partial matches against `email`

### Get profile

```http
GET /profile/{username}
Accept: application/json
```

Browser navigation with `Accept: text/html` returns the main page (`index.html`) instead of JSON.

JSON response:

```json
{
  "ok": true,
  "profile": { "...": "normalized profile fields" },
  "computed": { "...": "calculated fields" }
}
```

### Save profile

```http
POST /profile/{username}
Content-Type: application/json
```

Response:

```json
{
  "ok": true,
  "profile": { "...": "normalized profile fields" },
  "computed": { "...": "calculated fields" }
}
```

Validation error (`422`):

```json
{
  "ok": false,
  "profile": { "...": "normalized profile fields" },
  "computed": { "...": "calculated fields" },
  "errors": {
    "email": "Invalid email"
  }
}
```

### Create profile

```http
PUT /profile
Content-Type: application/json
```

Success response (`201`):

```json
{
  "ok": true,
  "profile": { "...": "normalized profile fields" },
  "computed": { "...": "calculated fields" }
}
```

Validation error (`422`):

```json
{
  "ok": false,
  "profile": { "...": "normalized profile fields" },
  "computed": { "...": "calculated fields" },
  "errors": {
    "email": "Invalid email"
  }
}
```

Conflict response (`409`):

```json
{
  "ok": false,
  "errors": {
    "id": "Profile already exists"
  }
}
```

### Delete profile

```http
DELETE /profile/{username}
```

Response:

```json
{
  "ok": true
}
```

## Routes

Client routes handled by `profile-app` with the Navigation API:

```text
/                  profile directory
/new               create profile
/profile/:username edit profile
```

Server routes:

```text
GET    /                         main page
GET    /index.html               main page
GET    /profile/:username        JSON profile or main page (depends on Accept)
POST   /profile/:username        update profile
PUT    /profile                  create profile
DELETE /profile/:username        delete profile
GET    /search                   search profiles
GET    /shared/*                 shared domain modules
GET    /app.js, /styles.css, /components/*, and other static files
```

`/new` is a client-side route only. A direct server request to `/new` is not handled and returns `404`. Open the create flow from `/` or navigate in-app after the main page has loaded.

`GET /profile/{username}` serves the main page when the browser sends `Accept: text/html`, which makes full-page navigation to profile URLs work.

## Data storage

Profiles are stored as JSON files:

```text
data/profile/{username}.json
```

The URL username maps to the file name. Only safe usernames are accepted.

Example:

```text
/profile/marcus - data/profile/marcus.json
```

## User flows

### Directory

1. Open `/`.
2. App renders profile directory with search, create, and delete controls.
3. Directory loads profiles through `/search`.
4. User searches by display name or email (partial, case-insensitive).
5. Matching profiles are rendered as list items after each input change (250 ms debounce).

### Edit

1. Open `/profile/marcus`.
2. App loads profile JSON from `GET /profile/marcus`.
3. Form renders editable fields.
4. Each field change rebuilds domain state.
5. Computed values, validation messages, and save button state update immediately.
6. Save sends `POST /profile/marcus`.
7. Server validates with the same domain module.
8. Server saves normalized profile JSON on success.

### Create

1. From `/`, click Create, or navigate in-app to `/new`.
2. App renders `profile-form` in create mode (username field is editable).
3. Domain state is recalculated on every edit; invalid form disables submit.
4. Submit sends `PUT /profile`.
5. Server validates domain rules and username uniqueness.
6. Successful creation navigates to `/profile/{username}`.

### Delete

1. Open `/`.
2. Click delete on a profile item.
3. Browser asks for confirmation.
4. Client sends `DELETE /profile/{username}`.
5. Directory reloads after successful deletion.

## Security

The implementation avoids rendering untrusted data with `innerHTML`. Dynamic values are rendered with `textContent`, attributes, and DOM methods.

The server validates usernames before mapping them to file paths. The router prevents path traversal when serving static and shared files.

## Acceptance criteria

- The app starts with `node server.js`.
- The home route shows a profile directory with search, create, and delete controls.
- Search supports partial input and finds profiles by display name or email.
- Opening `/profile/marcus` loads the profile from the server.
- Editing the form immediately recalculates computed fields and validation errors.
- The save button is disabled when the profile is invalid.
- POST sends JSON to the same endpoint; the server validates with the shared domain module.
- Invalid data is not saved; valid data is normalized and saved to `./data/profile/{username}.json`.
- Creating a profile stores new valid data; deleting removes the profile file.
- Refreshing the page shows the last saved valid data.
- No runtime framework or bundler is used.
- All `fetch` calls are in `static/api.js` only.
- The server routing table maps the first URL segment to a route module from `routes/`.
- Component templates are assembled into `index.html` server-side; components access them synchronously.
- Components contain no inline `fetch` calls.

## Non-goals

- Do not implement authentication.
- Do not implement a database.
- Do not implement server-side rendering.
- Do not implement a design system.
- Do not implement offline mode.
- Do not implement optimistic conflict resolution.

## Implementation notes

`profile-create-dialog` exists in the component directory, but the current app flow renders `profile-form` directly on `/new`.

`routes/static.js` assembles templates into `index.html` at startup and caches loaded static files in memory.

Search currently returns all matching profiles sorted by username.

`profile-form` stores generated field elements in a `Map` and updates them from domain state.

`profile-summary` receives computed data through a serialized `values` attribute.

## Architectural goal

The frontend is not a CRUD form with scattered validation. The important part is the separation between:

```text
UI components
API boundary
shared domain logic
server routes
file storage
```

The browser gives immediate feedback, but the server remains the final authority.
