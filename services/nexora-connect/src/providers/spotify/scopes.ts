export const spotifyProviderScopes: Record<string, string> = {
  userReadPrivate: "user-read-private",
  userReadEmail: "user-read-email",
  userTopRead: "user-top-read",
  playlistReadPrivate: "playlist-read-private",
  playlistReadCollaborative: "playlist-read-collaborative",
  playlistModifyPublic: "playlist-modify-public",
  playlistModifyPrivate: "playlist-modify-private",
  userLibraryRead: "user-library-read",
  userLibraryModify: "user-library-modify",
  userFollowRead: "user-follow-read",
  userFollowModify: "user-follow-modify",
  userReadPlaybackState: "user-read-playback-state",
  userReadCurrentlyPlaying: "user-read-currently-playing",
  userReadRecentlyPlayed: "user-read-recently-played",
  userModifyPlaybackState: "user-modify-playback-state",
};

export const spotifyOAuthScopes: string[] = Array.from(new Set(Object.values(spotifyProviderScopes)));
