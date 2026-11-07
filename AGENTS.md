<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep blank journey slots as client-side presentation data separate from saved memories, so empty cards never create fabricated records in the private album.
- Calculate journey depth in card-index space, so every card remains reachable regardless of album size.
- Use DOM perspective transforms for the scrollable memory gallery, preserving accessible card controls and readable text without a WebGL canvas.
- Memory journey is a magazine: page 0 is the cover; on large screens later pages render as a two-page spread (photo left, info+globe right) with a right-half leaf turning on the spine; flip layering for single pages lives in the pure pageFlip helper.
- Load the R3F globe lazily behind ClientOnly; saved optional coordinates share a tested conversion helper, and marker navigation resolves the saved memory ID rather than display order.
- Control email login presentation through the shared auth-settings flag and keep it aligned with Cloud Auth provider settings, so temporary pauses preserve the login flow.
- Keep the small-screen world map a docked, non-modal sheet with its own close control, so opening the map never blocks the memory cards; lift the active card while it is open instead of covering it.
