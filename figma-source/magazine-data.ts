// Magazine data structure
export interface MagazinePage {
  id: string;
  pageNumber: number;
  imageUrl?: string;
  alt: string;
  type: 'image' | 'layout';
  layoutId?: string;
}

export interface TOCEntry {
  id: string;
  title: string;
  pageNumber: number;
  pageRange?: string;
  level?: number;
}

export interface MagazineData {
  issueTitle: string;
  coverImageUrl: string;
  totalPages: number;
  pages: MagazinePage[];
  toc: TOCEntry[];
  // Publication metadata for cover display
  spineText?: string;           // Custom spine text (defaults to issueTitle)
  backCoverImageUrl?: string;   // Optional back cover image
  backCoverText?: string;       // Optional back cover text
  publisher?: string;           // Publisher name
  issueNumber?: string;         // Issue number (e.g., "Vol. 5 No. 2")
  publicationDate?: string;     // Publication date (e.g., "Winter 2026")
}
