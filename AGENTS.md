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
