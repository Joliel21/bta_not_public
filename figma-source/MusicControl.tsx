export interface MusicTrack {
  id: string;
  name: string;
  type: string;
  url: string;
  license?: string;
  source?: string;
  attribution?: string;
}