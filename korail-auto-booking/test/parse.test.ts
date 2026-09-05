import { describe, expect, it } from 'vitest'
import { extractReservationInfos, extractTrainInfos, parseReservation, parseTrain } from '../src/main/korail/parse'
import { normalizePassengers, reservePassengerParams, searchPassengerParams } from '../src/main/korail/passengers'

const rawTrain = {
  h_trn_clsf_cd: '00',
  h_trn_clsf_nm: 'KTX',
  h_trn_gp_cd: '100',
  h_trn_no: '00101',
  h_dpt_rs_stn_nm: '서울',
  h_dpt_rs_stn_cd: '0001',
  h_dpt_dt: '20260910',
  h_dpt_tm: '080000',
  h_arv_rs_stn_nm: '부산',
  h_arv_rs_stn_cd: '0020',
  h_arv_dt: '20260910',
  h_arv_tm: '103000',
  h_run_dt: '20260910',
  h_rsv_psb_flg: 'Y',
  h_rsv_psb_nm: '예약\n가능',
  h_gen_rsv_cd: '11',
  h_spe_rsv_cd: '13',
  h_wait_rsv_flg: '9',
}

describe('parseTrain', () => {
  it('maps fields and derives availability flags', () => {
    const t = parseTrain(rawTrain)
    expect(t.trainNo).toBe('00101')
    expect(t.depTime).toBe('080000')
    expect(t.hasGeneralSeat).toBe(true)
    expect(t.hasSpecialSeat).toBe(false)
    expect(t.hasWaitingList).toBe(true)
    expect(t.reservePossible).toBe(true)
    expect(t.reservePossibleName).toBe('예약 가능')
    expect(t.key).toBe('20260910-00101-0001-0020')
  })

  it('tolerates missing optional fields', () => {
    const t = parseTrain({ h_trn_no: '1' })
    expect(t.waitReserveFlag).toBeNull()
    expect(t.hasGeneralSeat).toBe(false)
    expect(t.hasWaitingList).toBe(false)
  })
})

describe('extractTrainInfos', () => {
  it('handles arrays, single objects and missing data', () => {
    expect(extractTrainInfos({ trn_infos: { trn_info: [rawTrain, rawTrain] } })).toHaveLength(2)
    expect(extractTrainInfos({ trn_infos: { trn_info: rawTrain } })).toHaveLength(1)
    expect(extractTrainInfos({})).toHaveLength(0)
  })
})

describe('parseReservation', () => {
  it('maps a ReservationView entry', () => {
    const r = parseReservation({
      h_pnr_no: '12345',
      h_tot_seat_cnt: '002',
      h_ntisu_lmt_dt: '20260910',
      h_ntisu_lmt_tm: '123000',
      h_rsv_amt: '00059800',
      h_run_dt: '20260910',
      h_trn_no: '00101',
      h_dpt_tm: '080000',
    })
    expect(r.rsvId).toBe('12345')
    expect(r.seatCount).toBe(2)
    expect(r.price).toBe(59800)
    expect(r.journeyNo).toBe('001')
    expect(r.rsvChgNo).toBe('00000')
  })

  it('flattens journeys', () => {
    const json = { jrny_infos: { jrny_info: [{ train_infos: { train_info: [{ h_pnr_no: 'a' }, { h_pnr_no: 'b' }] } }, { train_infos: { train_info: { h_pnr_no: 'c' } } }] } }
    expect(extractReservationInfos(json).map((r) => r.h_pnr_no)).toEqual(['a', 'b', 'c'])
  })
})

describe('passengers', () => {
  it('defaults to one adult and clamps', () => {
    expect(normalizePassengers(undefined)).toEqual({ adult: 1, child: 0, toddler: 0, senior: 0 })
    expect(normalizePassengers({ adult: 0, child: 0 })).toEqual({ adult: 1, child: 0, toddler: 0, senior: 0 })
    expect(normalizePassengers({ adult: 99, child: -1 })).toEqual({ adult: 9, child: 0, toddler: 0, senior: 0 })
  })

  it('builds the five search flags (유아 rides in the child slot)', () => {
    expect(searchPassengerParams({ adult: 2, child: 1, toddler: 1, senior: 1 })).toEqual({
      txtPsgFlg_1: '2',
      txtPsgFlg_2: '2',
      txtPsgFlg_3: '1',
      txtPsgFlg_4: '0',
      txtPsgFlg_5: '0',
    })
  })

  it('builds all eight reservation rows in wire order', () => {
    const p = reservePassengerParams({ adult: 2, child: 0, toddler: 0, senior: 1 })
    expect(p.txtTotPsgCnt).toBe('3')
    // row 1 = 어른
    expect(p.txtPsgTpCd1).toBe('1')
    expect(p.txtDiscKndCd1).toBe('000')
    expect(p.txtCompaCnt1).toBe('2')
    // row 5 = 경로
    expect(p.txtPsgTpCd5).toBe('1')
    expect(p.txtDiscKndCd5).toBe('131')
    expect(p.txtCompaCnt5).toBe('1')
    // all eight rows are always present, unused ones at 0
    expect(p.txtCompaCnt2).toBe('0')
    expect(p.txtPsgTpCd8).toBe('1')
    expect(p.txtDiscKndCd8).toBe('173')
    expect(p.txtCompaCnt8).toBe('0')
    expect(p.txtPsgTpCd9).toBeUndefined()
  })
})
