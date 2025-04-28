export class Event {
  uid: string;
  homepage: string;
  title: string;
  start_date: string;
  end_date?: string;
  project_time: string;
  place: string;
  project_category: string;
  duration_type: 'long' | 'short';
  manager?: string;
  staff?: string[];
  speaker?: string[];
  performer?: string[];
  mc?: string[];
  video_url?: string;
  description: string;
  image_urls?: string[];
  created_at: string;
  updated_at: string;
}
