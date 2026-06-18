import type { AniListMediaList } from "@/types";

const ANILIST_API = "https://graphql.anilist.co";

const MEDIA_LIST_QUERY = `
query ($username: String) {
  MediaListCollection(userName: $username, type: ANIME) {
    lists {
      name
      status
      entries {
        mediaId
        status
        score(format: POINT_10_DECIMAL)
        media {
          id
          idMal
          type
          format
          status
          averageScore
          title {
            romaji
            english
          }
          coverImage {
            large
          }
        }
      }
    }
  }
}
`;

export async function fetchAniListUser(username: string): Promise<AniListMediaList[]> {
  const res = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: MEDIA_LIST_QUERY,
      variables: { username },
    }),
  });

  if (!res.ok) {
    throw new Error(`AniList API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();

  if (data.errors) {
    throw new Error(`AniList error: ${data.errors[0]?.message || "Unknown error"}`);
  }

  return data.data.MediaListCollection.lists;
}
