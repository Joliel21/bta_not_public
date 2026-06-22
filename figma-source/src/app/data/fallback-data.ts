import { MagazineData } from "./magazine-data";
import type { MusicTrack } from "@/app/components/MusicControl";

export const FALLBACK_MAGAZINE_DATA: MagazineData = {
  issueTitle: "",
  coverImageUrl: "",
  backCoverImageUrl: "",
  totalPages: 0,
  spineText: "",
  backCoverText: "",
  publisher: "",
  issueNumber: "",
  publicationDate: "",
  pages: [],
  toc: [],
};

export interface PublishManifest {
  version: string;
  runtime: {
    background: string;
    brandingEnabled: boolean;
    logoLight: string;
    logoDark: string;
  };
  publication: {
    title: string;
    subtitle: string;
    displayTitle: string;
  };
  music: {
    enabled: boolean;
    tracks: MusicTrack[];
  };
}

const WORDPRESS_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "the-mountain-warm-storytelling",
    name: "Warm Storytelling",
    type: "Storytelling",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/the_mountain-warm-storytelling-512283.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "the_mountain",
  },
  {
    id: "the-mountain-instrumental-ambient",
    name: "Instrumental Ambient",
    type: "Ambient",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/the_mountain-instrumental-ambient-443538.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "the_mountain",
  },
  {
    id: "relaxingtime-relaxing-music-vol1",
    name: "Relaxing Music Vol. 1",
    type: "Relaxing",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/relaxingtime-relaxing-music-vol1-124477.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "relaxingtime",
  },
  {
    id: "paulyudin-documentary",
    name: "Documentary",
    type: "Documentary",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/paulyudin-documentary-513010.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "paulyudin",
  },
  {
    id: "leberch-yoga",
    name: "Yoga",
    type: "Calm",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/leberch-yoga-509709.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "leberch",
  },
  {
    id: "leberch-meditation",
    name: "Meditation",
    type: "Meditation",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/leberch-meditation-513747.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "leberch",
  },
  {
    id: "leberch-inspiring",
    name: "Inspiring",
    type: "Inspiring",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/leberch-inspiring-511351.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "leberch",
  },
  {
    id: "joyinsound-ancient-ritual-flame",
    name: "Ancient Ritual Flame",
    type: "Atmospheric",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/joyinsound-ancient-ritual-flame-386048.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "joyinsound",
  },
  {
    id: "innertune-relaxing-birds-and-piano",
    name: "Relaxing Birds and Piano",
    type: "Nature Piano",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/innertune-relaxing-birds-and-piano-music-137153.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "innertune",
  },
  {
    id: "grand-project-soul-of-the-earth",
    name: "Soul of the Earth",
    type: "Ambient",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/grand_project-soul-of-the-earth_15min-391198.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "grand_project",
  },
  {
    id: "atlasaudio-relax",
    name: "Relax",
    type: "Relaxing",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/atlasaudio-relax-511892.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "atlasaudio",
  },
  {
    id: "atlasaudio-emotions",
    name: "Emotions",
    type: "Emotional",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/atlasaudio-emotions-511881.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "atlasaudio",
  },
  {
    id: "alex-morgan-zen-garden-stillness",
    name: "Zen Garden Stillness",
    type: "Meditation",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/alex-morgan-zen-garden-stillness-537457.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "Alex Morgan",
  },
  {
    id: "alex-morgan-no-copyright-music",
    name: "No Copyright Music",
    type: "Ambient",
    url: "https://breathtakingawareness.com/wp-content/uploads/2026/06/alex-morgan-no-copyright-music-528321.mp3",
    license:
      "Verify and retain original license terms before final publication.",
    source: "WordPress Media Library",
    attribution: "Alex Morgan",
  },
];

export const FALLBACK_MANIFEST: PublishManifest = {
  version: "1.0.0",
  runtime: {
    background: "",
    brandingEnabled: true,
    logoLight: "",
    logoDark: "",
  },
  publication: {
    title: "",
    subtitle: "",
    displayTitle: "",
  },
  music: {
    enabled: false,
    tracks: [],
  },
};