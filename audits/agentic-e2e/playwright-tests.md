# P1 regression checks

## STYLL-E2E-001 - legal info link reachable on public surfaces

1. Open a public tenant page with the cookie banner visible.
2. Click `Scopri di più`.
3. Expected:
   - navigation succeeds;
   - the cookie/legal page loads without 404 on tenant hosts and in path-mode dev.

## STYLL-E2E-002 - signup shows privacy and terms notice

1. Open `/{tenant}/accesso` or the booking auth modal with a new email.
2. Continue until the profile-data step for a new user.
3. Expected:
   - a visible privacy/terms notice is shown before submitting;
   - `Privacy Policy` opens the tenant privacy page;
   - `Termini e condizioni` opens the root terms page.

## STYLL-E2E-003 - trial CTA never sends anonymous users to login

1. Open the public marketing landing as an anonymous user.
2. Click a `Prova gratis` CTA.
3. Expected:
   - navigation lands on `/register?intent=trial`;
   - the user must not be redirected to `/login`;
   - all visible trial CTA links on the landing point to `/register?intent=trial`.

## STYLL-E2E-007 - booking success page not readable with appointment UUID only

1. Open `/prenota/successo?appointment={uuid}` without auth and without token.
2. Expected:
   - the response is 404 or 410;
   - the page does not confirm the booking;
   - no appointment date, staff, services, total, or other booking details are shown;
   - only a neutral access-limited message is displayed.

3. Open `/prenota/successo?appointment={uuid}&token={validToken}`.
4. Expected:
   - the full booking summary is visible.

5. Open `/prenota/successo?appointment={uuid}&token={wrongToken}`.
6. Expected:
   - the response is 404 or 410;
   - no booking data is shown.

7. Open `/prenota/successo?appointment={uuid}&token={expiredToken}`.
8. Expected:
   - the response is 404 or 410;
   - no booking data is shown.

9. Open `/prenota/successo?appointment={otherUuid}&token={validToken}`.
10. Expected:
    - the response is 404 or 410;
    - no booking data is shown.

11. Open `/tenant/app/{otherSlug}/prenota/successo?appointment={uuid}&token={validToken}`.
12. Expected:
    - the response is 404 or 410;
    - no booking data is shown.

## STYLL-E2E-009 - unknown tenant must not leak other tenant data

1. Open a tenant PWA route with a slug that does not exist.
2. Expected:
   - the response is 404;
   - a generic not-found screen is rendered;
   - no business name, booking summary, or other data from an existing tenant is shown.
