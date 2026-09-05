/**
 * Korail passenger station names used for autocomplete. The search API takes
 * station *names*, so no codes are needed. The list is not exhaustive — users
 * can type any station name the 코레일톡 app accepts.
 */
export const STATIONS: string[] = [
  // 수도권
  '서울', '용산', '영등포', '광명', '수원', '행신', '청량리', '상봉', '왕십리', '안양', '오산', '평택', '평택지제', '서정리', '성환',
  '덕소', '양평', '용문', '지평', '판교', '부발', '수서',
  // 경부선 / 경부고속선
  '천안아산', '천안', '조치원', '오송', '신탄진', '대전', '서대전', '옥천', '영동', '황간', '추풍령', '김천', '김천구미', '구미', '왜관',
  '대구', '서대구', '동대구', '경산', '청도', '밀양', '삼랑진', '물금', '구포', '부산', '부전',
  // 경전선
  '진영', '창원중앙', '창원', '마산', '함안', '진주', '하동', '광양', '순천',
  // 호남선 / 호남고속선
  '공주', '계룡', '논산', '강경', '함열', '익산', '김제', '신태인', '정읍', '장성', '광주송정', '광주', '나주', '함평', '일로', '목포',
  // 전라선
  '삼례', '전주', '남원', '오수', '임실', '곡성', '구례구', '여천', '여수엑스포',
  // 장항선
  '아산', '온양온천', '신례원', '예산', '홍성', '광천', '대천', '웅천', '서천', '장항', '군산', '대야',
  // 서해선
  '서화성', '향남', '화성시청', '안중', '인주',
  // 중앙선 / 동해선
  '서원주', '원주', '제천', '단양', '풍기', '영주', '안동', '의성', '군위', '영천', '경주', '신경주', '태화강', '울산(통도사)', '울산', '포항', '북울산',
  // 강릉선 / 영동선 / 태백선
  '만종', '횡성', '둔내', '평창', '진부(오대산)', '강릉', '정동진', '묵호', '동해', '삼척', '영월', '민둥산', '태백', '동백산', '도계', '신기',
  // 중부내륙선
  '가남', '감곡장호원', '앙성온천', '충주', '살미', '수안보온천', '연풍', '문경',
  // 경춘선 (ITX-청춘)
  '퇴계원', '사릉', '평내호평', '마석', '청평', '가평', '강촌', '남춘천', '춘천',
  // 경북선 / 기타
  '상주', '점촌', '영덕', '울진', '봉화', '춘양', '분천', '승부', '양원', '철암', '석포',
  '동두천', '소요산', '연천', '전곡', '의정부', '춘천', '경주', '나주', '보성', '벌교', '득량', '예당', '조성', '이양', '능주', '화순', '효천', '서광주',
  '순천', '광양', '진상', '북천', '횡천', '완사', '반성', '군북', '중리',
]

/** Deduplicated, in original order. */
export const STATION_NAMES: string[] = Array.from(new Set(STATIONS))

export function normalizeStationName(input: string): string {
  return input.replace(/\s+/g, '').replace(/역$/, '')
}

export function suggestStations(query: string, limit = 8): string[] {
  const q = normalizeStationName(query)
  if (!q) return STATION_NAMES.slice(0, limit)
  const starts = STATION_NAMES.filter((s) => s.startsWith(q))
  const contains = STATION_NAMES.filter((s) => !s.startsWith(q) && s.includes(q))
  return [...starts, ...contains].slice(0, limit)
}
