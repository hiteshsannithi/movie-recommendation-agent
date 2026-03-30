# Skill: Movie Recommendation Strategy

Use this skill whenever recommending movies. It overrides generic behaviour with Reel-specific strategy.

---

## Mood → Genre Mapping

When a user describes how they feel, map it to these TMDB genres:

| User Says                          | Search With                          |
|------------------------------------|--------------------------------------|
| scary, horror, creepy              | horror, thriller                     |
| feel-good, happy, uplifting        | comedy, romance                      |
| action, adventure, exciting        | action, adventure                    |
| something light, chill, easy       | comedy, romcom                       |
| mind-bending, trippy, thought-provoking | sci-fi, psychological thriller  |
| with family, with kids             | family, animation                    |
| emotional, want to cry, sad        | drama, romance                       |
| can't sleep, bored, need a grip    | thriller, mystery, crime             |
| with parents, something safe       | family-safe drama, comedy            |
| romantic, date night               | romance, romantic comedy             |
| motivational, inspiring            | biography, drama, sports             |
| funny, laugh out loud              | comedy                               |
| classic, old school                | use broader query + year range       |

---

## The 3-Movie Strategy

Always structure recommendations like this:

1. **Hidden gem first** — something they probably haven't seen but will love
   - Avoid the obvious choice (not Baahubali if they ask for Telugu action — go deeper)
   - This is your chance to introduce them to something new

2. **Well-known pick second** — the film most people recommend for this mood
   - Safe bet, but don't lead with it — let the gem surprise them first

3. **Wildcard third** — from a different country, format, or genre edge
   - E.g. if they asked for Hindi horror, the wildcard could be a Korean thriller
   - Or if they asked for drama, go for an animated drama or a documentary

---

## Connecting the Recommendation to the Mood

Always explain **why this specific movie fits what they described**. Don't just list films.

Bad: "Here's a good movie: Andhadhun"
Good: "**Andhadhun** (2018) — for when you want twists that keep flipping — it never goes where you expect"

Make the connection between the movie's traits and what the user said:
- They said "can't sleep" → mention the film's pacing and tension
- They said "with parents" → mention it's clean, family-friendly, has a good message
- They said "something emotional" → tell them which scene will hit them

---

## Indian Language Films

When recommending Indian cinema:
- Always mention if the film is available in **multiple languages** (e.g. dubbed in Hindi)
- Note the original language: *Originally in Tamil, Hindi dub available on Netflix*
- For South Indian films especially — many viewers prefer dubbed versions

## Streaming Priority for India

When listing where to watch, use this priority order:
Netflix → Prime Video → Disney+ Hotstar → JioCinema → SonyLIV → ZEE5 → Theatres

If `get_streaming_info` returns no data for India, say:
*"Streaming info wasn't available — check Netflix, Hotstar or JioCinema"*

---

## Search Strategy

- Keep search queries **short and genre-focused** — e.g. `"psychological thriller"` not `"mind-bending movies that make you think"`
- For Indian languages, always pass the `language` code to `search_movies`
- If first search has no good results → broaden the query (remove year filter, try genre alone)
- Never show a movie with a rating below 6.0 unless specifically asked for "so bad it's good"
