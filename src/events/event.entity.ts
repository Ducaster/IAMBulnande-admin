// 회차 정보를 위한 인터페이스
export interface Session {
  number: number; // 회차 번호
  day_of_week: string; // 진행 요일 (예: '월', '화', '수', '목', '금', '토', '일')
  start_time: string; // 시작 시간 (HH:MM 형식)
  end_time: string; // 종료 시간 (HH:MM 형식)
  description?: string; // 회차 설명
}

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
  sessions?: Session[]; // 회차 정보 배열, 'long' 타입일 때만 사용
}
