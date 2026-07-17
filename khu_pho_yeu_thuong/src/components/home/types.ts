export interface CounterData {
  signs_installed: number;
  issues_waiting: number;
  contributors: number;
  neighborhoods_joined: number;
}

export interface IssueCard {
  id: string;
  category: string;
  location_text: string;
  description: string | null;
  status: "waiting" | "voting" | "signed";
  neighborhood_id: string;
  neighborhood_name: string;
  suggestion_count: number;
  top_votes: number;
}

export interface MapNeighborhood {
  id: string;
  name: string;
  slug: string;
  certified_4n: boolean;
  certified_at: string | null;
  map_url: string | null;
  photo_url: string | null;
}

export interface MapPin {
  id: string;
  neighborhood_id: string;
  category: string;
  location_text: string;
  status: "waiting" | "voting" | "signed";
  pin_x: number;
  pin_y: number;
}

export interface MapData {
  neighborhoods: MapNeighborhood[];
  pins: MapPin[];
}

export interface Me {
  display_name: string;
  share_slug: string;
  neighborhood_id: string | null;
  neighborhood_name?: string | null;
  score?: number;
}

export interface Ambassador {
  user_id: string;
  display_name: string;
  share_slug: string;
  neighborhood_name: string | null;
  score: number;
  signs_installed: number;
  votes_received: number;
}

export interface NeighborhoodOfMonth {
  name: string;
  slug: string;
  new_signs: number;
  votes: number;
}

export interface SuggestionItem {
  id: string;
  content: string;
  status: string;
  author_name: string;
  is_mine: boolean;
  votes: number;
  voted: boolean;
  sign_photo_url: string | null;
}

export interface IssueDetail {
  id: string;
  category: string;
  location_text: string;
  description: string | null;
  status: string;
  photo_url: string | null;
  neighborhood_id: string;
  neighborhood_name: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  ref_id: string;
  payload: { location_text?: string; content?: string };
  created_at: string;
}

export interface HomeData {
  counters: CounterData;
  issues: IssueCard[];
  map: MapData;
  ambassadors: Ambassador[];
  neighborhoodOfMonth: NeighborhoodOfMonth | null;
}
