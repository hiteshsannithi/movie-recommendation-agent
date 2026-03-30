# Skill: Movie Recommendation

## Purpose
Guide the agent through a complete movie recommendation flow: understand user preferences, search TMDB, present results, and optionally save to the watchlist.

## Trigger Phrases
- "What should I watch?"
- "Recommend me a movie"
- "I'm in the mood for [genre/vibe]"
- "What's good on [platform]?" *(Note: streaming availability not yet implemented)*
- "Something like [movie title]"

## Steps

### 1. Clarify Preferences (if needed)
If the user's request is vague, ask **one** question to narrow it down:
- Genre preference? (action, comedy, drama, horror, sci-fi, etc.)
- Mood? (uplifting, tense, mind-bending, feel-good)
- Recent or classic? Any year range?
- Solo watch or with family/friends?

### 2. Search for Movies
Call `search_movies` with a relevant query based on the user's preferences.
- For genre + mood: e.g., `query: "mind-bending sci-fi thriller"`
- For "something like X": use the original title as the query

### 3. Fetch Details (optional)
For the top 2–3 results, call `get_movie_details` to get:
- Full overview
- Cast and director
- Runtime and rating

### 4. Present Recommendations
Use the standard format from the system prompt. Include:
- Title, year, rating
- 1–2 sentence pitch tailored to what the user asked for
- Optionally: notable cast member or director

### 5. Offer Watchlist Save
After presenting recommendations, ask: *"Want me to add any of these to your watchlist?"*
If yes, call `add_to_watchlist` for each selected movie and confirm.

## Example Flow

> User: "I want something like Inception but not too long."

1. Call `search_movies("mind-bending thriller mystery")`
2. Call `get_movie_details` on top 3 results
3. Filter results with runtime < 130 min
4. Present 3 recommendations with pitch
5. Offer watchlist save

## Notes
- Never recommend the same movie the user just mentioned as "already seen"
- If search returns no results, try a broader query or suggest trending movies
- Watchlist requires `user_id` — it's always available from the request context
