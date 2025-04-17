/**
 * 현재 시간을 KST(한국 표준시)로 변환하여 ISO 문자열로 반환합니다.
 * @returns KST 시간이 반영된 ISO 형식 문자열
 */
export function getCurrentKSTDateISOString(): string {
  // 현재 UTC 시간을 가져옵니다
  const now = new Date();

  // 한국 시간은 UTC+9 이므로 9시간을 더합니다 (9시간 * 60분 * 60초 * 1000밀리초)
  const kstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);

  return kstTime.toISOString();
}
