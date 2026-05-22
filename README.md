# ParkRadar

ParkRadar is an Expo Router mobile app for crowd-sourced parking discovery. Users can report temporary free parking spots, validate reports from other drivers, earn reward points, manage a parking profile, and receive nearby spot notifications.

## Stack

- Expo 54 with React Native 0.81
- Expo Router for navigation
- Supabase Auth, Postgres, RLS, RPC functions, and migrations
- TypeScript with strict mode

## Features

- Email authentication with password reset
- Live parking reports with confirm, taken, and park-here actions
- Reward points, ranks, badges, and referral invites
- Parking profile with car plate and zone SMS helpers
- Nearby notification preferences
- Legal and account management screens

## Requirements

- Node.js 20+
- npm 10+
- Expo CLI via `npx expo`
- A Supabase project with the required schema and RPCs applied

## Environment

Create a local `.env` file from `.env.example` and fill in the values:

```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GOOGLE_MAPS_API_KEY=your-google-maps-android-key
```

These variables are required at runtime. The app now fails fast if they are missing.

For Android APK builds, the live map also needs a Google Maps API key in EAS/build config. Without it, the native Android map can fail when opened.

## Install

```bash
npm install
```

## Run

```bash
npm run start
```

Other targets:

- `npm run android`
- `npm run ios`
- `npm run web`

## iPhone Dev Build

Expo Go is not a reliable environment for `expo-notifications` on iPhone. Use a development build instead.

This project is configured for EAS development builds with iOS bundle identifier:

```bash
app.parkradar.mobile
```

From Windows, use EAS cloud builds:

```bash
npx eas login
npx eas build --profile development --platform ios
```

After the build is ready:

1. Open the install link from EAS on the iPhone.
2. Install the development build.
3. Start Metro locally with `npx expo start --clear`.
4. Open the installed dev client on the iPhone and connect it to the running project.

If this is the first iOS build for the project, EAS will also walk through Apple signing setup.

## Quality Checks

```bash
npm run lint
npm run typecheck
```

## Database Setup

Supabase SQL migrations live under `supabase/migrations`.

Apply them in order to the target Supabase project before testing the app features that depend on:

- `profiles`
- `parking_reports`
- `notification_preferences`
- `parking_reward_events`
- `friend_invites`
- RPC functions such as `apply_reward_event`, `sync_reward_profile`, `redeem_invite_code`, and `delete_my_account_data`

## Edge Functions

The project uses a Supabase Edge Function for full account deletion:

- `delete-account`

Required Supabase function secret:

```bash
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Deploy the function after setting the secret in Supabase:

```bash
supabase functions deploy delete-account
```

Recommended Supabase dashboard settings for `delete-account`:

- Disable `Verify JWT with legacy secret`
- Keep auth validation inside the function code

## AI Confidence Scoring

The app now supports optional AI-backed parking confidence scores on each report.

Database additions:

- `parking_reports.ai_confidence_score`
- `parking_reports.ai_confidence_reason`
- `parking_reports.ai_score_version`
- `parking_reports.ai_scored_at`
- `public.parking_report_ai_features` view for model training and evaluation

Current behavior:

- If `ai_confidence_score` is present, the app uses it for confidence, ranking, and high-confidence filtering.
- If it is missing, the app falls back to the existing heuristic confidence logic.

Recommended rollout path:

1. Apply the migration that adds AI confidence columns and the feature view.
2. Export data from `parking_report_ai_features` to train a model offline.
3. Run inference in a backend job or function.
4. Write predictions back into `parking_reports.ai_confidence_score` and related metadata.
5. Compare AI score quality against the heuristic baseline before fully relying on it.

## Account Deletion Checklist

Before testing account deletion in a new environment:

1. Confirm the app `.env` points to the same Supabase project where the function is deployed.
2. Confirm the `delete-account` function exists in the Edge Functions dashboard.
3. Set `SUPABASE_SERVICE_ROLE_KEY` in that same project's function secrets.
4. Make sure the database contains the `delete_my_account_data` RPC from `supabase/migrations`.
5. Make sure the function's legacy JWT verification toggle is off.

Recommended verification flow:

1. Create a test account.
2. Add a parking profile or test data.
3. Trigger in-app account deletion.
4. Confirm the user is signed out.
5. Confirm the auth user no longer exists.
6. Confirm related profile/app records are removed.

Service-role key hygiene:

- Rotate `SUPABASE_SERVICE_ROLE_KEY` immediately after any accidental exposure.
- Update the secret only in Supabase secrets, never in app code or `.env`.
- Re-test `delete-account` after rotation.

## Important Product Note

The in-app deletion flow is intended to remove both ParkRadar application data and the underlying authentication account. This depends on the `delete-account` Edge Function being deployed with a valid `SUPABASE_SERVICE_ROLE_KEY` secret.

## Suggested Next Work

- Add automated tests for auth, report lifecycle, and reward flows
- Move multi-step profile/report mutations into transactional backend functions
- Add CI for lint and typecheck
- Add production monitoring and error reporting
