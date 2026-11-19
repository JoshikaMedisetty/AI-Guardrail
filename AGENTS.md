<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
- Guardrail engine lives in `src/lib/guardrail/engine.ts` as pure functions with the trained model in `model.json`; it is a faithful port of the original Python detectors, so keep behavior aligned and covered by `engine.test.ts`.
- Server functions live in `src/lib/*.functions.ts`; server-only helpers in `src/server/*.server.ts` (the `server/` folder is blocked from client imports).
- Telemetry is written as the calling user (RLS `user_id = auth.uid()`); only agent counters and the API-key endpoint use the admin client.
- External agents call `/api/public/v1/guardrail/{check,scan,check-output}` with hashed `grd_live_` API keys.
- Imported legacy accounts are linked by the `link_legacy_user` DB function on verified email; never link on unverified email.
<!-- AGENT-MEMORY:END -->
