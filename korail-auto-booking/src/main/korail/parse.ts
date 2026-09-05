import type { Reservation, Train } from '../../shared/types'
import { SEAT_AVAILABLE, WAITING_LIST_AVAILABLE } from './constants'

type Raw = Record<string, unknown>

function str(raw: Raw, key: string, fallback = ''): string {
  const v = raw[key]
  if (v === undefined || v === null) return fallback
  return String(v)
}

function int(raw: Raw, key: string, fallback = 0): number {
  const n = parseInt(str(raw, key), 10)
  return Number.isFinite(n) ? n : fallback
}

export function trainKey(t: Pick<Train, 'runDate' | 'trainNo' | 'depCode' | 'arrCode'>): string {
  return `${t.runDate}-${t.trainNo}-${t.depCode}-${t.arrCode}`
}

/** Convert a `trn_info` entry of ScheduleView into a Train. */
export function parseTrain(raw: Raw): Train {
  const generalSeat = str(raw, 'h_gen_rsv_cd')
  const specialSeat = str(raw, 'h_spe_rsv_cd')
  const waitRaw = str(raw, 'h_wait_rsv_flg')
  const waitReserveFlag = waitRaw === '' ? null : parseInt(waitRaw, 10)
  const base = {
    trainType: str(raw, 'h_trn_clsf_cd'),
    trainTypeName: str(raw, 'h_trn_clsf_nm'),
    trainGroup: str(raw, 'h_trn_gp_cd'),
    trainNo: str(raw, 'h_trn_no'),
    depName: str(raw, 'h_dpt_rs_stn_nm'),
    depCode: str(raw, 'h_dpt_rs_stn_cd'),
    depDate: str(raw, 'h_dpt_dt'),
    depTime: str(raw, 'h_dpt_tm'),
    arrName: str(raw, 'h_arv_rs_stn_nm'),
    arrCode: str(raw, 'h_arv_rs_stn_cd'),
    arrDate: str(raw, 'h_arv_dt'),
    arrTime: str(raw, 'h_arv_tm'),
    runDate: str(raw, 'h_run_dt'),
    depConsOrder: str(raw, 'h_dpt_stn_cons_ordr'),
    depRunOrder: str(raw, 'h_dpt_stn_run_ordr'),
    arrConsOrder: str(raw, 'h_arv_stn_cons_ordr'),
    arrRunOrder: str(raw, 'h_arv_stn_run_ordr'),
    reservePossible: str(raw, 'h_rsv_psb_flg') === 'Y',
    reservePossibleName: str(raw, 'h_rsv_psb_nm').replace(/\s+/g, ' ').trim(),
    generalSeat,
    specialSeat,
    waitReserveFlag: waitReserveFlag !== null && Number.isFinite(waitReserveFlag) ? waitReserveFlag : null,
    hasGeneralSeat: generalSeat === SEAT_AVAILABLE,
    hasSpecialSeat: specialSeat === SEAT_AVAILABLE,
    hasWaitingList: waitReserveFlag === WAITING_LIST_AVAILABLE,
  }
  return { ...base, key: trainKey(base) }
}

/** Convert a `train_info` entry of ReservationView into a Reservation. */
export function parseReservation(raw: Raw): Reservation {
  return {
    rsvId: str(raw, 'h_pnr_no'),
    journeyNo: str(raw, 'txtJrnySqno', '001'),
    journeyCnt: str(raw, 'txtJrnyCnt', '01'),
    rsvChgNo: str(raw, 'hidRsvChgNo', '00000'),
    trainType: str(raw, 'h_trn_clsf_cd'),
    trainTypeName: str(raw, 'h_trn_clsf_nm'),
    trainNo: str(raw, 'h_trn_no'),
    depName: str(raw, 'h_dpt_rs_stn_nm'),
    depCode: str(raw, 'h_dpt_rs_stn_cd'),
    arrName: str(raw, 'h_arv_rs_stn_nm'),
    arrCode: str(raw, 'h_arv_rs_stn_cd'),
    runDate: str(raw, 'h_run_dt'),
    depTime: str(raw, 'h_dpt_tm'),
    arrTime: str(raw, 'h_arv_tm'),
    seatCount: int(raw, 'h_tot_seat_cnt', 0),
    buyLimitDate: str(raw, 'h_ntisu_lmt_dt'),
    buyLimitTime: str(raw, 'h_ntisu_lmt_tm'),
    price: int(raw, 'h_rsv_amt', 0),
    waiting: false,
  }
}

/** Pull the train array out of a ScheduleView response, tolerating missing keys. */
export function extractTrainInfos(json: Raw): Raw[] {
  const infos = (json?.trn_infos as Raw | undefined)?.trn_info
  if (!infos) return []
  return Array.isArray(infos) ? (infos as Raw[]) : [infos as Raw]
}

/** Pull reservation entries out of a ReservationView response. */
export function extractReservationInfos(json: Raw): Raw[] {
  const journeys = (json?.jrny_infos as Raw | undefined)?.jrny_info
  if (!journeys) return []
  const list = Array.isArray(journeys) ? (journeys as Raw[]) : [journeys as Raw]
  const out: Raw[] = []
  for (const j of list) {
    const infos = (j?.train_infos as Raw | undefined)?.train_info
    if (!infos) continue
    if (Array.isArray(infos)) out.push(...(infos as Raw[]))
    else out.push(infos as Raw)
  }
  return out
}
