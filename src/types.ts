import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

type ProfileRow = Tables<"profiles">;
type GameRow = Tables<"games">;
type UserGameRow = Tables<"user_games">;
type UserGameInsert = TablesInsert<"user_games">;
type UserGameUpdate = TablesUpdate<"user_games">;
export type GamePlayStatus = Enums<"game_play_status">;

type SuggestionWeightsBase = Extract<ProfileRow["suggestion_weights"], Record<string, unknown>>;

/**
 * Normalized suggestion weight object stored in `profiles.suggestion_weights`.
 * Intersects with the JSON column type to retain linkage to the database model.
 */
export type SuggestionWeightsDTO = SuggestionWeightsBase & {
  priority: number;
  genre: number;
  playtime: number;
  freshness: number;
};

export interface ProfileDTO {
  userId: ProfileRow["user_id"];
  steamId: ProfileRow["steam_id"];
  steamDisplayName: ProfileRow["steam_display_name"];
  suggestionWeights: SuggestionWeightsDTO;
  onboardedAt: ProfileRow["onboarded_at"];
  createdAt: ProfileRow["created_at"];
  updatedAt: ProfileRow["updated_at"];
}

type ProfileUpdateFields = Pick<TablesUpdate<"profiles">, "steam_display_name" | "suggestion_weights">;

export interface UpdateProfileCommand {
  steamDisplayName?: ProfileUpdateFields["steam_display_name"];
  suggestionWeights?: SuggestionWeightsDTO;
}

export interface SteamLinkProof {
  nonce: string;
  signature: string;
}

export interface SteamLinkCommand {
  steamId: NonNullable<ProfileRow["steam_id"]>;
  displayName: NonNullable<ProfileRow["steam_display_name"]>;
  proof: SteamLinkProof;
}

export interface SteamLinkDTO {
  steamId: NonNullable<ProfileRow["steam_id"]>;
  linked: boolean;
  updatedAt: ProfileRow["updated_at"];
}

export interface PaginatedResponseDTO<T> {
  page: number;
  pageSize: number;
  total: number;
  results: readonly T[];
}

export interface GameSummaryDTO {
  steamAppId: GameRow["steam_app_id"];
  title: GameRow["title"];
  slug: GameRow["slug"];
  genres: GameRow["genres"];
  releaseDate: GameRow["release_date"];
  popularityScore: GameRow["popularity_score"];
  artworkUrl: GameRow["artwork_url"];
  achievementsTotal: GameRow["achievements_total"];
}

export type GamesListDTO = PaginatedResponseDTO<GameSummaryDTO>;

export interface UserGameDTO {
  gameId: UserGameRow["game_id"];
  title: GameRow["title"];
  status: GamePlayStatus;
  inProgressPosition: UserGameRow["in_progress_position"];
  achievementsUnlocked: UserGameRow["achievements_unlocked"];
  completedAt: UserGameRow["completed_at"];
  importedAt: UserGameRow["imported_at"];
  updatedAt: UserGameRow["updated_at"];
  removedAt: UserGameRow["removed_at"];
  popularityScore: GameRow["popularity_score"];
  slug: GameRow["slug"];
}

export type UserGamesListDTO = PaginatedResponseDTO<UserGameDTO>;

export interface CreateUserGameCommand {
  steamAppId: UserGameInsert["game_id"];
  status: UserGameInsert["status"];
  inProgressPosition: UserGameInsert["in_progress_position"];
}

/**
 * Partial update payload for a single user game.
 * At least one field must be provided at runtime by the validator.
 */
export type UpdateUserGameCommand = Partial<{
  status: UserGameUpdate["status"];
  inProgressPosition: UserGameUpdate["in_progress_position"];
  achievementsUnlocked: UserGameUpdate["achievements_unlocked"];
}>;

export interface ReorderInProgressCommand {
  items: readonly {
    steamAppId: UserGameRow["game_id"];
    position: NonNullable<UserGameRow["in_progress_position"]>;
  }[];
}

/**
 * Mirrors the `{ "updated": number }` API contract and represents how many
 * `user_games` rows were touched by the reorder operation.
 */
export interface ReorderInProgressResultDTO {
  updated: number;
}

export interface CompleteUserGameCommand {
  achievementsUnlocked?: UserGameUpdate["achievements_unlocked"];
}

export interface AuthUserDTO {
  id: string;
  email: string | null;
}

export interface SignupCommand {
  email: string;
  password: string;
}

export interface LoginCommand {
  email: string;
  password: string;
}

export interface PasswordResetRequestCommand {
  email: string;
}

export interface PasswordResetTokens {
  accessToken: string;
  refreshToken: string;
  type?: string | null;
}

export type PasswordResetConfirmCommand = PasswordResetTokens & {
  password: string;
};
