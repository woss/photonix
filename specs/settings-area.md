# Spec: Settings Area (libraries, users, accounts)

**Status:** Implemented on branch `settings-area` (all four phases in one pass; see §10 note below)
**Date:** 2026-07-19
**Source:** Damian — "a larger, more planned settings interface": library management (create/edit/add), user management (password, account, admin adds users, invites to libraries, email, avatar), library settings (watching, classification), streamlined dropdown menu.
**Effort estimate:** Medium–High overall, but phased — each phase is independently shippable (see §10).
**Depends on:** Nothing hard for Phase 1. Phases touching classification toggles should land **after `ml-improvement` merges** (it adds `classification_event_enabled`/`classification_clip_enabled` and a semantic-search toggle to the current SettingsModal — see §11).
**Blocks:** Roadmap Tier 2 #6 (shared albums / partner sharing) builds directly on the membership + invitation layer specced here.

**Implementation notes (deviations from this spec, branch `settings-area`):**
- Built from master *before* `ml-improvement` merged (per Damian's request), so the
  Analysis section has the 5 master classifiers only. Merging `ml-improvement`
  will conflict on the deleted `SettingsModal.tsx` (its semantic-search toggle
  must be re-added as a row in `LibraryDetailPage.tsx`'s Analysis card and as
  fields on `updateLibrary`/`LibraryUpdateInput`).
- DEMO guards are user-aware (`demo_user_locked` in `photonix/web/utils.py`):
  only the shared `demo` account is locked in demo mode, not the whole
  instance — keeps the public demo undefaceable while invited/admin-created
  accounts (and the e2e users on the DEMO dev stack) work normally. Signup
  gating likewise skips demo instances so first-run onboarding e2e keeps
  passing there.
- `createLibrary` stayed one mutation with `user_id` now optional (onboarding
  sends it, settings doesn't) instead of a second mutation name.

---

## 1. Goal

Replace the two small modals (SettingsModal, AccountModal) with a routed,
full-page settings area at `/settings/*`, and streamline the header dropdown.
The area covers three domains:

1. **Account** — profile (name, email, avatar), change password.
2. **Users** (site-admin only) — list users, add users, deactivate users.
3. **Libraries** — list + create libraries; per-library pages for General
   (rename), Storage & Import (source folder, watch toggle, import path),
   Image Analysis (classifier toggles), and Members (add/remove members,
   invite links, owner flag).

Comparable prior art: Immich's admin/user settings split and library-level
"partner sharing", PhotoPrism's Settings → Library/Account tabs. The invite
mechanism follows Photonix's existing capability-URL philosophy (unguessable
token links, like tile/download URLs) rather than requiring email.

## 2. Non-goals (out of scope)

- **Email infrastructure.** There is no SMTP config anywhere and nothing sends
  mail. Invitations are shareable links; email change is unverified informational
  data. Email delivery (invites, password reset) is a separate future spec.
- **Role granularity beyond the existing `owner` boolean.** Owner = can manage
  the library's settings and members; member = can view/edit photos. An
  editor/viewer tier is a future migration, not this spec (§12 Q1).
- **Deleting libraries or users.** Destructive; deactivate (users) and "remove
  member" cover the practical cases. Deletion gets its own spec with data
  retention decisions.
- **S3 storage backend UI.** The model fields exist but S3 is unimplemented in
  the import pipeline (no boto anywhere); the create-library form keeps S3
  hidden, matching onboarding step 3 today.
- **2FA, sessions management, API tokens.**
- **Theming/appearance settings** — nothing to configure yet.

## 3. Existing architecture this builds on

| Piece | Where | Relevance |
|---|---|---|
| `User` extends `AbstractUser` + UUID pk; own fields are only 4 onboarding flags. `email`/`first_name`/`is_staff` inherited but unused | `photonix/accounts/models.py:7-11` | Profile editing writes inherited fields; `is_staff` becomes the site-admin flag (§5.1). No avatar field exists |
| `LibraryUser(library, user, owner)` — the entire permission model | `photonix/photos/models.py:93-102` | Members panel is CRUD over this table; `owner` gates settings/members management |
| `LibraryPath` — `type` (St/Im/Th), `backend_type` (Lo/S3), `path`, `watch_for_changes`, `delete_after_import` | `photonix/photos/models.py:75-90` | Storage & Import page edits these |
| Owner-gated settings ops: `librarySetting` query + 7 single-field `update*` mutations (all filter `users__owner=True`) | `photonix/photos/schema.py:625,686-890` | Kept working during migration, superseded by one consolidated `updateLibrary` (§6.2) |
| Onboarding mutations: `create_library`, `PhotoImporting`, `imageAnalysis` (all via `get_onboarding_user`, write `has_*` flags) | `photonix/photos/schema.py:893-1054` | Form/zod schemas and copy are reused; the mutations themselves stay onboarding-only (they flip signup flags) — settings gets its own `createLibrary` (§6.2) |
| `changePassword` mutation (DEMO-guarded) | `photonix/accounts/schema.py:139-155` | Moves into the Account page unchanged |
| `environment` query drives first-run routing; `create_user` is the public signup mutation | `photonix/accounts/schema.py:22-57,87-129` | §5.1 backfills the first user as admin; §8 gates `create_user` |
| `for_user()` scoping pattern (`library__users__user=user`), "never look up by bare pk" | `photonix/photos/models.py:22-33` | Every new resolver/mutation follows it |
| Frontend routes: `_authenticated` guard layout; `photo/$id` is the precedent for a full-screen routed section outside the `_browse` chrome | `ui/src/routes/_authenticated.tsx`, `_authenticated/photo/$id.tsx` | `/settings/*` sits the same way (§7.1) |
| Header dropdown (profile label, library switcher, Account, Settings, Logout) with `openModalDeferred` | `ui/src/components/header/Header.tsx:110-188` | Streamlined in §7.5 |
| `SettingsModal` (6 toggles, optimistic overrides) + `AccountModal` (password, TanStack Form + zod) via `ModalRoot`/`useUIStore.activeModal` | `ui/src/components/settings/SettingsModal.tsx`, `ui/src/components/account/AccountModal.tsx`, `ui/src/components/ModalRoot.tsx` | Content migrates into pages; `ModalRoot` + `activeModal` retire |
| Onboarding step 3/4/5 forms (create library, importing, image analysis) with zod schemas | `ui/src/routes/onboarding/step{3,4,5}.tsx`, `ui/src/lib/onboarding/graphql.ts` | Field lists, validation, and copy reused for the settings pages |
| `useLibrariesStore` (persisted `activeLibraryId`), `GET_ALL_LIBRARIES`, toasts, `Switch`/`Input`/`Select`/`Button` primitives, testid discipline, `window.showSettings()` mobile hook | `ui/src/lib/libraries/store.ts`, `ui/src/lib/ui/store.ts`, `ui/src/components/ui/*`, `ui/src/lib/mobile-app.ts:61-63` | All kept; `showSettings` re-pointed at the route (§7.6) |
| Capability-URL design for unauthenticated UUID-keyed endpoints (tiles, downloads) | `photonix/photos/views.py`, `photonix/web/urls.py` | Invite links (§6.3) and the avatar endpoint (§6.4) follow the same deliberate pattern |
| e2e harness: `login`/`setupTestUser`/`runDjangoCommand` helpers; `library-switching.spec.ts` is the menu-driving model | `ui/e2e/test-utils.ts`, `ui/e2e/library-switching.spec.ts` | Settings specs reuse these (§9) |

### Known warts to fix in passing

1. **`UserType` exposes `fields="__all__"`** (`photonix/accounts/schema.py:16`) —
   leaks the password hash and internal flags to any query selecting them.
   Narrow to an explicit field list in Phase 1 (security fix).
2. **`updateSourceFolder` returns `ok=False` even on success**
   (`photonix/photos/schema.py:863`). Fixed when the consolidated mutation lands.
3. **The watch daemon ignores `watch_for_changes`** —
   `watch_photos.py` watches every `St`/`Lo` path regardless of the flag the
   settings toggle writes. Fix: filter `watch_for_changes=True` in
   `get_libraries()`; the existing ~5s poll loop then makes the toggle live.
4. **`create_user` is unauthenticated public signup** — anyone who can reach
   the instance can create an account today. Once invites exist, gate it (§8.1).

---

## 4. Information architecture

```
/settings                        → redirect to /settings/account
├── /settings/account            Profile (avatar, name, email) + Change password
├── /settings/users              Site admin only: user list, add user, deactivate
├── /settings/libraries          Library list (all memberships) + "New library"
└── /settings/libraries/$libraryId    (owner-only sections marked ◆)
      #general                   ◆ Rename library
      #storage                   ◆ Source folder, watch toggle, import path,
                                   delete-after-import
      #analysis                  ◆ Classifier toggles (color/location/style/
                                   object/face — plus event + semantic/CLIP
                                   after ml-improvement merges)
      #members                   List members (any member can view);
                                 ◆ add by username, invite links, remove,
                                   toggle owner
```

- Left sidebar (desktop) / stacked list-then-detail (mobile): **Account**,
  **Users** (rendered only when `profile.isStaff`), **Libraries**.
- The library detail page renders the four sections as one scrollable page with
  anchor sub-nav (matches the one-page-per-concern feel of Immich; avoids a
  second nav level). Non-owners see only Members (read-only) and a notice.
- A `←` back control returns to the app (`router.history.back()` with `/`
  fallback), mirroring the photo-detail pattern.

## 5. Data model changes

### 5.1 Site admin = `is_staff` (no new field)

- `create_admin_from_env` and onboarding `create_user` (first-run path only)
  set `is_staff=True`.
- Data migration `photonix/accounts/migrations/0006_backfill_site_admin.py`:
  set `is_staff=True` on the earliest-created active user — matches the
  `environment` query's existing single-primary-user assumption
  (`accounts/schema.py:87-129`). Multi-user instances that predate this get one
  admin, others promotable via `manage.py` (document in README).

### 5.2 Avatar

```python
# photonix/accounts/models.py
class User(...):
    avatar_updated_at = models.DateTimeField(null=True, blank=True)
```

The image itself is a server-side file, not a DB blob: uploads are re-encoded
to a 256×256 JPEG at `{settings.DATA_DIR}/avatars/{user.id}.jpg` (Pillow is
already a dependency). `avatar_updated_at` doubles as the existence flag and
the cache-buster (`?v=<timestamp>` in the URL). Migration
`accounts/0007_user_avatar_updated_at.py` (or fold into 0006).

### 5.3 `LibraryInvitation`

```python
# photonix/photos/models.py
class LibraryInvitation(UUIDModel, VersionedModel):
    library      = models.ForeignKey(Library, related_name='invitations', on_delete=models.CASCADE)
    created_by   = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='invitations_sent', on_delete=models.CASCADE)
    expires_at   = models.DateTimeField()
    revoked      = models.BooleanField(default=False)
    accepted_by  = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name='invitations_accepted', on_delete=models.SET_NULL)
    accepted_at  = models.DateTimeField(null=True, blank=True)
```

- The UUID pk **is** the capability token (same trust model as tile URLs).
- Single-use: `accepted_by` set ⇒ spent. Owners create as many as they need.
- Validity = not revoked ∧ not accepted ∧ `expires_at` in future (default 14 days).
- Migration in `photonix/photos/migrations/` — number at build time
  (`0020`/`0021` are reserved by the share-links and people-page specs, and
  `ml-improvement` carries its own; renumber against whatever has landed).

## 6. Backend — GraphQL API

All new resolvers/mutations are `@login_required` (except the two public
invite operations, §6.3) and scoped via membership filters per the existing
pattern. DEMO mode blocks every mutation in this section (extending the
existing `change_password` guard).

### 6.1 Accounts (`photonix/accounts/schema.py`)

| Op | Signature | Rules |
|---|---|---|
| `profile` (extend) | add `firstName`, `lastName`, `isStaff`, `avatarUrl` to the narrowed `UserType` | `avatarUrl` = `/avatar/<uuid>.jpg?v=<ts>` or null |
| `allUsers` query | `→ [UserType]` (id, username, email, isActive, isStaff, dateJoined) | `is_staff` only |
| `updateProfile` | `(email, firstName, lastName) → { ok, profile }` | self only; Django email validation; unverified (§2) |
| `setAvatar` | `(imageBase64: String!) → { ok, avatarUrl }` | self only; ≤2MB decoded; server re-encodes 256px JPEG; rejects non-images |
| `clearAvatar` | `→ { ok }` | deletes file, nulls timestamp |
| `adminCreateUser` | `(username, password, email) → { ok, user }` | `is_staff` only; same validation as signup (unique, len≥8) |
| `adminSetUserActive` | `(userId, isActive) → { ok }` | `is_staff` only; cannot deactivate self |

### 6.2 Libraries (`photonix/photos/schema.py`)

| Op | Signature | Rules |
|---|---|---|
| `createLibrary` | `(name, path) → { ok, library }` | any authenticated user; creates `Library` + `St`/`Lo` `LibraryPath` + `LibraryUser(owner=True)`. Distinct from the onboarding `CreateLibrary` (no `user_id` arg, no `has_created_library` writes) |
| `updateLibrary` | `(libraryId, name, sourceFolder, watchPhotos, importPath, deleteAfterImport, classificationColorEnabled, …FaceEnabled [, …EventEnabled, …ClipEnabled post-merge]) → { ok, librarySetting }` | owner-gated; **all fields optional/partial** — one mutation replaces the 7 single-field ones. Empty `importPath` removes the `Im` path |
| `libraryUsers` query | `(libraryId) → [LibraryUserType]` (user id/username/avatarUrl, owner, createdAt) | any member may view |
| `addLibraryUser` | `(libraryId, username) → { ok }` | owner-gated; **exact** username match only (no search/enumeration endpoint, §8.2); no-op if already a member |
| `removeLibraryUser` | `(libraryId, userId) → { ok }` | owner-gated; refuses to remove the last owner; members may remove **themselves** (leave library) even as non-owner |
| `setLibraryUserOwner` | `(libraryId, userId, owner) → { ok }` | owner-gated; refuses to demote the last owner |

The existing `librarySetting` query gains `name` + `importPath` +
`deleteAfterImport`. The 7 `update*` mutations stay for one release
(notifications pause/resume uses `update*Enabled` —
`ui/src/components/notifications/`), then are removed once all callers use
`updateLibrary`.

### 6.3 Invitations

| Op | Signature | Rules |
|---|---|---|
| `createLibraryInvitation` | `(libraryId, expiresDays = 14) → { ok, invitation { id, url, expiresAt } }` | owner-gated |
| `libraryInvitations` query | `(libraryId) → [LibraryInvitationType]` (pending only: id, createdBy, expiresAt) | owner-gated |
| `revokeLibraryInvitation` | `(invitationId) → { ok }` | owner-gated via the invitation's library |
| `invitationInfo` query | `(token) → { libraryName, invitedBy, valid }` | **public** (capability token is the auth); invalid/expired ⇒ `valid: false`, no other data |
| `acceptLibraryInvitation` | `(token) → { ok, libraryId }` | authenticated; validates, creates `LibraryUser(owner=False)`, stamps `accepted_by/at`. Idempotent if already a member |
| `createUserViaInvitation` | `(token, username, password) → { ok }` | **public**; signup gated on a *valid* token — validates token first, creates user (`has_set_personal_info=True`, all other onboarding flags True so login skips onboarding), accepts the invitation, logs in |

### 6.4 Avatar endpoint (REST)

`GET /avatar/<uuid:user_id>.jpg` in `photonix/web/urls.py` →
`photonix/accounts/views.py:user_avatar`. Unauthenticated, UUID-keyed,
long `Cache-Control` — deliberately the same capability-URL design as tiles
(user UUIDs already circulate among library members via GraphQL; avatars are
low-sensitivity). 404 when no avatar.

## 7. Frontend

### 7.1 Routes & shell

```
ui/src/routes/_authenticated/settings.tsx            layout: sidebar + <Outlet/>
ui/src/routes/_authenticated/settings/index.tsx      redirect → ./account
ui/src/routes/_authenticated/settings/account.tsx
ui/src/routes/_authenticated/settings/users.tsx      beforeLoad guard: isStaff, else redirect
ui/src/routes/_authenticated/settings/libraries/index.tsx
ui/src/routes/_authenticated/settings/libraries/$libraryId.tsx
ui/src/routes/invite/$token.tsx                      public (outside _authenticated)
```

Sits under `_authenticated` (inherits the auth guard) but outside `_browse`
(no timeline header/tabs), exactly like `photo/$id.tsx`. New shared components
in `ui/src/components/settings/`: `SettingsShell` (sidebar/nav + back button),
`SettingsCard` (generalize `OnboardingCard`'s `rounded-xl bg-neutral-800 p-8
shadow-xl` — there is no Card primitive today), `SettingRow` (label +
description + control, the shape SettingsModal's toggle rows already have).

### 7.2 Account page

- **Profile card:** avatar (current image or initials-on-color-hash fallback
  derived from username), file-picker upload (client-side crop-to-square +
  downscale before base64 → `setAvatar`), remove button; name + email fields →
  `updateProfile`. TanStack Form + zod, per existing convention.
- **Password card:** the current AccountModal form moved verbatim
  (`CHANGE_PASSWORD`, same testids so `auth.spec.ts` needs only navigation
  changes).

### 7.3 Users page (admin)

Table of users (avatar/initials, username, email, active, admin badge, joined).
Actions: **Add user** (username/password/email form → `adminCreateUser`),
activate/deactivate toggle (`adminSetUserActive`, self-row disabled). Sidebar
hides the entry for non-staff; the route's `beforeLoad` also guards direct URLs.

### 7.4 Libraries pages

- **List:** card per membership from `GET_ALL_LIBRARIES` (extend with
  `photosCount`? — cheap annotate; nice but optional) with an "owner" badge and
  a **New library** button → inline form (name + base path; zod schema reused
  from onboarding step 3, S3 stays hidden) → `createLibrary`, then refetch
  `GetAllLibraries` and navigate to the new library's page.
- **Detail (`$libraryId`):** four anchored sections per §4. General/Storage/
  Analysis are forms over `librarySetting` + `updateLibrary` — toggles keep
  SettingsModal's optimistic-override + revert-on-error pattern; text fields
  commit on save. Analysis section reuses onboarding step 5's richer
  label/description copy (single source in `ui/src/lib/settings/`).
  **Members:** list via `libraryUsers`; owner controls per §6.2/§6.3 — add by
  exact username, invite-link generator (creates, then shows a copy-to-clipboard
  URL + pending-invites list with revoke), remove member (confirm dialog;
  "leave library" for self), owner toggle. Last-owner errors surface as toasts.

### 7.5 Streamlined header dropdown

Current: profile label / library switcher / Account / Settings / Logout.
New (`Header.tsx`):

1. **Trigger:** avatar (or initials fallback) replaces the `MoreVertical` icon —
   keeps testid `header-menu-button`.
2. **Profile block** (label): avatar + username + email — unchanged testids.
3. **Library switcher** — unchanged (it's the highest-frequency action).
4. **Settings** — single `<Link to="/settings">` item (testid
   `settings-menu-item`). The separate **Account item is removed** (folded into
   Settings → Account).
5. **Log out** — unchanged.

`openModalDeferred` and its Radix focus-race workaround become unnecessary for
these items (plain `Link`s, like Logout already is).

### 7.6 Retirements & compatibility

- Delete `SettingsModal`, `AccountModal`, `ModalRoot`; drop `activeModal`/
  `openModal`/`closeModal` from `useUIStore` (toasts stay). The generic
  `Modal.tsx` primitive stays (confirm dialogs, invite-link display).
- `window.showSettings()` (`ui/src/lib/mobile-app.ts:61-63`) now does
  `router.navigate({ to: '/settings' })` — the mobile wrapper contract is
  navigation-agnostic, so this is transparent to `photonix-mobile`.
- Notifications pause/resume keeps using `update*Enabled` until Phase 2 swaps
  it to `updateLibrary`, after which the legacy mutations are removed.

### 7.7 Invite acceptance page (`/invite/$token`)

Public route: fetch `invitationInfo`. Invalid → friendly dead-link page. Valid →
"«inviter» invited you to «library»" with: **Accept** (if session exists, via
`acceptLibraryInvitation` → toast → switch `activeLibraryId` → `/`), **Log in**
(→ `/login?next=/invite/<token>`), or **Create account** (username/password
form → `createUserViaInvitation` → auto-login → `/`).

## 8. Security considerations

1. **Gate public signup.** With invites available, `create_user` succeeds only
   when `User.objects.exists()` is False (first run) — otherwise accounts come
   from `adminCreateUser` or `createUserViaInvitation`. Closes the
   anyone-can-register hole (§3 wart 4).
2. **No user enumeration.** No username-search query; `addLibraryUser` takes an
   exact username, and its failure message doesn't distinguish "no such user"
   from other failures. `allUsers` is staff-only.
3. **Capability tokens.** Invitation pk is an unguessable UUIDv4, single-use,
   expiring, revocable; `invitationInfo` returns nothing but `valid: false` for
   bad tokens. Consistent with the tile/download design (do not "harden" those
   here either — deliberate, see FRONTEND_REWRITE.md P0.3).
4. **Authorization tests for every mutation** — non-owner, non-member,
   anonymous, and staff/non-staff paths (red/green style, like
   `test_cannot_read_another_users_photos_around`).
5. **Last-owner invariants** on remove/demote prevent orphaned libraries.
6. **DEMO mode** blocks all mutations in §6 (profile, avatar, users, library
   writes, invites) so the public demo can't be defaced.
7. **Avatar upload hygiene:** size cap before decode, Pillow re-encode (strips
   metadata/polyglots), fixed output path derived from the authenticated
   user's id only.
8. **`UserType` field narrowing** (§3 wart 1) ships in Phase 1.

## 9. Test plan

**Backend (pytest, `tests/`):** per-mutation happy path + authz denials (§8.4);
invitation lifecycle (create → info → accept → spent; expiry; revoke;
signup-via-invite gating both sides of `User.objects.exists()`); last-owner
guards; consolidated `updateLibrary` partial updates incl. import-path
add/remove; avatar encode/reject; watcher honors `watch_for_changes`
(unit-test `get_libraries()` filtering).

**e2e (Playwright, `ui/e2e/`):**
- `settings-navigation.spec.ts` — dropdown → /settings, sidebar sections,
  staff-only Users visibility, back-to-app.
- `settings-account.spec.ts` — profile edit, avatar upload → header avatar
  updates, password change (port assertions from the modal test).
- `settings-library.spec.ts` — create library (appears in switcher), rename,
  toggle watch/classifiers (persist across reload), import path.
- `settings-members.spec.ts` — two browser contexts: owner invites via link,
  second user signs up through `/invite/<token>`, sees the library; remove +
  last-owner refusal.
- Update `library-switching.spec.ts` + `auth.spec.ts`/`onboarding.spec.ts` for
  the new menu contents and modal removal.

## 10. Implementation order

Each phase is releasable on its own.

1. **Shell + migration of existing surface.** `/settings` routes + `SettingsShell`/
   `SettingsCard`; move password form and library toggles into pages; streamline
   dropdown; retire modals; re-point `window.showSettings`; narrow `UserType`;
   fix watcher `watch_for_changes`. *(Frontend-heavy; backend changes are two
   small fixes.)*
2. **Library management.** `createLibrary` + consolidated `updateLibrary`
   (+ `librarySetting` extensions); General/Storage sections; libraries list +
   create; migrate notifications pause/resume; deprecate single-field mutations.
3. **Profile & avatar.** `updateProfile`/`setAvatar`/`clearAvatar` + avatar
   endpoint + `avatar_updated_at`; Account profile card; avatar in header
   trigger/dropdown.
4. **Users, members & invitations.** `is_staff` backfill + admin ops + Users
   page; `LibraryInvitation` model + member/invite ops; Members section;
   `/invite/$token` page; gate `create_user`.

## 11. Coordination with in-flight work

- **`ml-improvement` (23 local commits, unpushed):** adds `classification_event_enabled`,
  `classification_clip_enabled`, a semantic-search settings toggle in
  SettingsModal, and its own migrations. **Merge it before starting Phase 1**,
  otherwise the modal→page migration and the branch's SettingsModal changes
  conflict, and the Analysis section must be built twice. Post-merge the
  Analysis section includes Events + Semantic search (CLIP) toggles and
  `updateLibrary` carries both fields.
- **Migration numbers** clash across specs (share-links reserves `0020`,
  people-page `0021`, ml-improvement carries its own): assign at build time.
- **specs/upload-api.md:** if a general upload endpoint lands first, avatar
  upload (§6.1) could ride it instead of base64-over-GraphQL — base64 is the
  default because it needs zero new plumbing for a ≤2MB payload.

## 12. Open questions (resolve before or during the relevant phase)

1. **Roles:** is `owner`/member enough for the members panel, or introduce a
   `role` enum (owner/editor/viewer) now while touching `LibraryUser` anyway?
   Spec assumes the boolean; a `role` CharField with a data migration mapping
   `owner→owner, else→editor` is the forward path if wanted.
2. **Multi-use invite links?** Spec says single-use (auditable, revocable).
   A household onboarding several people would prefer one link with N uses —
   `max_uses`/`use_count` fields are a small delta if desired.
3. **Library switcher in the dropdown vs. settings-only?** Spec keeps the
   switcher in the dropdown (frequency argument). Alternative: dropdown shows
   only the active library, switching moves to `/settings/libraries`.
4. **Should `adminCreateUser` optionally attach the new user to a library**
   (admin picks from their own libraries) to save the two-step dance?
5. **`photosCount` on the libraries list** — worth the annotate, or keep the
   first version minimal?
