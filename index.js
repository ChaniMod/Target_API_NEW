const express = require('express');
const path = require('path')
// const history = require('connect-history-api-fallback')
const app = express();
// const appConfig = require('./config/app');
const PORT = process.env.PORT || 3000
var oracledb = require('oracledb');
var mypw = "tech"


app.get('/target_l1', function (req, res) { getAllTargetL1(req, res); })
app.get('/target_l1_OOBA', function (req, res) { getAllTargetL1_ooba(req, res); })
app.get('/target_l4', function (req, res) { getAllTargetL4(req, res); })
app.get('/target_l4_OOBA', function (req, res) { getAllTargetL4_ooba(req, res); })
app.get('/target_l3', function (req, res) { getAllTargetL3(req, res); })
app.get('/target_l3_OOBA', function (req, res) { getAllTargetL3_ooba(req, res); })


async function getAllTargetL1(req, res) {
  // let connection;
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      `select replace(f.process_name,'-TH','') as "Station", target_qty as "Target", out_qty as "Output", chayi_qty as "Diff.Qty",
            to_char(round(out_qty / target_qty, 4) * 100, 'FM9999999999999999.00') || '%' as "Ach.%",
            yiled || '%' as "Yiled%"
      from   (select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
              pass_qty - fail_qty - target_qty chayi_qty,
              to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
            from   (select a.pdline_id, c.process_id, c.show_seq, sajet.f_get_target('day', a.pdline_id, 10000006) target_qty
                from   sajet.g_pdline_shift_qty a, sajet.g_pdline_shift_status b, sajet.g_pdline_shift_process c
                where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                    a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                    a.shift_id = 10000006 * sajet.f_get_dayfep('day') and a.pdline_id = 10118
                group  by a.pdline_id, c.process_id, c.show_seq) a1,
              (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                from   g_sn_count d,
                    (select distinct a.pdline_id, c.process_id
                      from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                      where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                        a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                        a.shift_id = 10000006 * sajet.f_get_dayfep('day')) a3
                where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                    d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10118
                                and (d.pass_qty<>0 or d.fail_qty<>0)
                group  by d.pdline_id, d.process_id) b1
            where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)
            union all
            select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
              pass_qty-fail_qty-target_qty chayi_qty,
              to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
            from   (select a.pdline_id, c.process_id, show_seq, sajet.f_get_target('night', a.pdline_id, 10000007) target_qty
                from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                    a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                    a.shift_id = 10000007 * sajet.f_get_dayfep('night') and a.pdline_id = 10118
                group  by a.pdline_id, c.process_id, show_seq) a1,
              (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                from   g_sn_count d,
                    (select distinct a.pdline_id, c.process_id
                      from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                      where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                        a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                        a.shift_id = 10000007 * sajet.f_get_dayfep('night')) a3
                where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                    d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10118
                                and (d.pass_qty<>0 or d.fail_qty<>0)
                group  by d.pdline_id, d.process_id) b1
            where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)) e, sys_process f, sys_pdline g
      where  e.process_id = f.process_id and e.pdline_id = g.pdline_id
      order  by show_seq`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    // console.log(result)
    if (result.rows.length == 0) {
      // console.log('mod1')
      return res.send('query send no rows');
    } else {
      //เข้าเงื่อนไขนี้
      console.log('mod')
      return res.send(result.rows);
      
    }
  }
}
async function getAllTargetL1_ooba(req, res) {
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      `select c1.process_name as"Station", nvl(qc_lotno_qty,0) as "#Lots", nvl(lot_size,0) as "Lot Qty", nvl(pass_qty,'0.00%') as  "Pass%",
      nvl(edppm,0) as "E/DPPM",     nvl(cdppm,0) as "C/DPPM"
     from   (select process_id, decode(a.process_name,'QC-TH','OOBA') process_name from sajet.sys_process a where a.process_id = '10000418') c1,    
          (select a.process_id, count(a.qc_lotno) as qc_lotno_qty, sum(a.lot_size) lot_size
          from   sajet.g_qc_lot a
          where  a.end_time is not null
              and a.process_id = '10000418'
              and  pdline_id=10118
              and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
          group  by process_id) c2,     
          (select process_id, nvl(to_char(round(NVL(pass,0) / (NVL(pass,0) + NVL(fail,0)) * 100, 2), 'FM9999999999999999.00'),'0.00') || '%' as Pass_qty
          from   (select *
               from   (select process_id, decode(a.qc_result, '1', 'Fail', 'PASS') qc_result,
                       count(decode(a.qc_result, '1', 'Fail', 'PASS')) cnt
                    from   sajet.g_qc_lot a
                    where  a.end_time is not null
                                 and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                                and a.process_id=10000418
                                and  pdline_id=10118
                    group  by process_id, decode(a.qc_result, '1', 'Fail', 'PASS'))
               pivot(max(cnt)
               for    qc_result in('PASS' as pass, 'Fail' as fail)))) c3,  
          (select a1.process_id, round(electrical / pass_qty * 1000000, 0) as "EDPPM",
             round(visual / pass_qty * 1000000, 0) as "CDPPM"
          from   (select a.process_id, sum(A.SAMPLING_SIZE) pass_qty
               from   sajet.g_qc_lot a
               where  a.end_time is not null
                        and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                       and a.process_id = '10000418'
                       and  pdline_id=10118
               group  by process_id) a1,
             (select process_id, nvl(visual, 0) visual, nvl(electrical, 0) electrical
               from   (select a.process_id, c.defect_desc2, count(c.defect_desc2) cnt
                    from   sajet.g_qc_sn_defect b, sajet.g_qc_lot a, sajet.sys_defect c
                    where  a.qc_lotno = b.qc_lotno and a.end_time is not null and b.defect_id = c.defect_id
                    and c.defect_desc2 in ('Visual','Electrical')
                                and a.process_id = '10000418'
                                and  a.pdline_id=10118
                                 and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                    group  by a.process_id, a.qc_lotno, c.defect_desc2)
               pivot(max(cnt)
               for    defect_desc2 in('Visual' as visual, 'Electrical' as electrical))) a2
          where  a1.process_id = a2.process_id(+)) c4
     where  c1.process_id = c2.process_id(+) and c1.process_id = c3.process_id(+) and c1.process_id = c4.process_id(+)`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    if (result.rows.length == 0) {
      return res.send('query send no rows');
    } else {
      return res.send(result.rows);
    }
  }
}
async function getAllTargetL4(req, res) {
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      // `SELECT shipping_id, dn, customer_po FROM cus_shipping_no_info WHERE shipping_id = '800692888'`
      `select replace(f.process_name,'-TH','') as "Station", target_qty as "Target", out_qty as "Output", chayi_qty as "Diff.Qty",
              to_char(round(out_qty / target_qty, 4) * 100, 'FM9999999999999999.00') || '%' as "Ach.%",
              yiled || '%' as "Yiled%"
        from   (select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
                pass_qty - fail_qty - target_qty chayi_qty,
                to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
              from   (select a.pdline_id, c.process_id, c.show_seq, sajet.f_get_target('day', a.pdline_id, 10000006) target_qty
                  from   sajet.g_pdline_shift_qty a, sajet.g_pdline_shift_status b, sajet.g_pdline_shift_process c
                  where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                      a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                      a.shift_id = 10000006 * sajet.f_get_dayfep('day') and a.pdline_id = 10200
                  group  by a.pdline_id, c.process_id, c.show_seq) a1,
                (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                  from   g_sn_count d,
                      (select distinct a.pdline_id, c.process_id
                        from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                        where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                          a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                          a.shift_id = 10000006 * sajet.f_get_dayfep('day')) a3
                  where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                      d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10200
                                  and (d.pass_qty<>0 or d.fail_qty<>0)
                  group  by d.pdline_id, d.process_id) b1
              where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)
              union all
              select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
                pass_qty-fail_qty-target_qty chayi_qty,
                to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
              from   (select a.pdline_id, c.process_id, show_seq, sajet.f_get_target('night', a.pdline_id, 10000007) target_qty
                  from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                  where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                      a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                      a.shift_id = 10000007 * sajet.f_get_dayfep('night') and a.pdline_id = 10200
                  group  by a.pdline_id, c.process_id, show_seq) a1,
                (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                  from   g_sn_count d,
                      (select distinct a.pdline_id, c.process_id
                        from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                        where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                          a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                          a.shift_id = 10000007 * sajet.f_get_dayfep('night')) a3
                  where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                      d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10200
                                  and (d.pass_qty<>0 or d.fail_qty<>0)
                  group  by d.pdline_id, d.process_id) b1
              where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)) e, sys_process f, sys_pdline g
        where  e.process_id = f.process_id and e.pdline_id = g.pdline_id
        order  by show_seq`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    if (result.rows.length == 0) {
      return res.send('query send no rows');
    } else {
      return res.send(result.rows);
    }
  }
}
async function getAllTargetL4_ooba(req, res) {
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      `select c1.process_name as"Station", nvl(qc_lotno_qty,0) as "#Lots", nvl(lot_size,0) as "Lot Qty", nvl(pass_qty,'0.00%') as  "Pass%",
      nvl(edppm,0) as "E/DPPM",     nvl(cdppm,0) as "C/DPPM"
     from   (select process_id, decode(a.process_name,'QC-TH','OOBA') process_name from sajet.sys_process a where a.process_id = '10000418') c1,    
          (select a.process_id, count(a.qc_lotno) as qc_lotno_qty, sum(a.lot_size) lot_size
          from   sajet.g_qc_lot a
          where  a.end_time is not null
              and a.process_id = '10000418'
              and  pdline_id=10200
              and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
          group  by process_id) c2,     
          (select process_id, nvl(to_char(round(NVL(pass,0) / (NVL(pass,0) + NVL(fail,0)) * 100, 2), 'FM9999999999999999.00'),'0.00') || '%' as Pass_qty
          from   (select *
               from   (select process_id, decode(a.qc_result, '1', 'Fail', 'PASS') qc_result,
                       count(decode(a.qc_result, '1', 'Fail', 'PASS')) cnt
                    from   sajet.g_qc_lot a
                    where  a.end_time is not null
                                 and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                                and a.process_id=10000418
                                and  pdline_id=10200
                    group  by process_id, decode(a.qc_result, '1', 'Fail', 'PASS'))
               pivot(max(cnt)
               for    qc_result in('PASS' as pass, 'Fail' as fail)))) c3,  
          (select a1.process_id, round(electrical / pass_qty * 1000000, 0) as "EDPPM",
             round(visual / pass_qty * 1000000, 0) as "CDPPM"
          from   (select a.process_id, sum(A.SAMPLING_SIZE) pass_qty
               from   sajet.g_qc_lot a
               where  a.end_time is not null
                        and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                       and a.process_id = '10000418'
                       and  pdline_id=10200
               group  by process_id) a1,
             (select process_id, nvl(visual, 0) visual, nvl(electrical, 0) electrical
               from   (select a.process_id, c.defect_desc2, count(c.defect_desc2) cnt
                    from   sajet.g_qc_sn_defect b, sajet.g_qc_lot a, sajet.sys_defect c
                    where  a.qc_lotno = b.qc_lotno and a.end_time is not null and b.defect_id = c.defect_id
                    and c.defect_desc2 in ('Visual','Electrical')
                                and a.process_id = '10000418'
                                and  a.pdline_id=10200
                                 and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                    group  by a.process_id, a.qc_lotno, c.defect_desc2)
               pivot(max(cnt)
               for    defect_desc2 in('Visual' as visual, 'Electrical' as electrical))) a2
          where  a1.process_id = a2.process_id(+)) c4
     where  c1.process_id = c2.process_id(+) and c1.process_id = c3.process_id(+) and c1.process_id = c4.process_id(+)`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    if (result.rows.length == 0) {
      return res.send('query send no rows');
    } else {
      return res.send(result.rows);
    }
  }
}
async function getAllTargetL3(req, res) {
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      `select replace(f.process_name,'-TH','') as "Station", target_qty as "Target", out_qty as "Output", chayi_qty as "Diff.Qty",
              to_char(round(out_qty / target_qty, 4) * 100, 'FM9999999999999999.00') || '%' as "Ach.%",
              yiled || '%' as "Yiled%"
        from   (select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
                pass_qty - fail_qty - target_qty chayi_qty,
                to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
              from   (select a.pdline_id, c.process_id, c.show_seq, sajet.f_get_target('day', a.pdline_id, 10000006) target_qty
                  from   sajet.g_pdline_shift_qty a, sajet.g_pdline_shift_status b, sajet.g_pdline_shift_process c
                  where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                      a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                      a.shift_id = 10000006 * sajet.f_get_dayfep('day') and a.pdline_id = 10188
                  group  by a.pdline_id, c.process_id, c.show_seq) a1,
                (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                  from   g_sn_count d,
                      (select distinct a.pdline_id, c.process_id
                        from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                        where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                          a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                          a.shift_id = 10000006 * sajet.f_get_dayfep('day')) a3
                  where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                      d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10188
                                  and (d.pass_qty<>0 or d.fail_qty<>0)
                  group  by d.pdline_id, d.process_id) b1
              where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)
              union all
              select a1.pdline_id, a1.process_id, target_qty, pass_qty + fail_qty out_qty,
                pass_qty-fail_qty-target_qty chayi_qty,
                to_char(round(pass_qty / (pass_qty + fail_qty), 4) * 100, 'FM9999999999999999.00') yiled, show_seq
              from   (select a.pdline_id, c.process_id, show_seq, sajet.f_get_target('night', a.pdline_id, 10000007) target_qty
                  from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                  where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                      a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                      a.shift_id = 10000007 * sajet.f_get_dayfep('night') and a.pdline_id = 10188
                  group  by a.pdline_id, c.process_id, show_seq) a1,
                (select d.pdline_id, d.process_id, nvl(sum(pass_qty), 0) pass_qty, nvl(sum(fail_qty), 0) fail_qty
                  from   g_sn_count d,
                      (select distinct a.pdline_id, c.process_id
                        from   g_pdline_shift_qty a, g_pdline_shift_status b, g_pdline_shift_process c
                        where  a.enabled = 'Y' and b.enabled = 'Y' and c.enabled = 'Y' and a.pdline_id = b.pdline_id and
                          a.pdline_id = c.pdline_id and a.shift_id = b.shift_id and a.shift_id = c.shift_id and
                          a.shift_id = 10000007 * sajet.f_get_dayfep('night')) a3
                  where  create_time between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 and
                      d.pdline_id = a3.pdline_id and d.process_id = a3.process_id and d.pdline_id = 10188
                                  and (d.pass_qty<>0 or d.fail_qty<>0)
                  group  by d.pdline_id, d.process_id) b1
              where  a1.pdline_id = b1.pdline_id(+) and a1.process_id = b1.process_id(+)) e, sys_process f, sys_pdline g
        where  e.process_id = f.process_id and e.pdline_id = g.pdline_id
        order  by show_seq`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    if (result.rows.length == 0) {
      return res.send('query send no rows');
    } else {
      return res.send(result.rows);
    }
  }
}
async function getAllTargetL3_ooba(req, res) {
  try {
    connection = await oracledb.getConnection({
      user          : "sajet",
      password      : mypw,
      connectString : "10.80.10.18/mesdb"
    });
    result = await connection.execute(
      `select c1.process_name as"Station", nvl(qc_lotno_qty,0) as "#Lots", nvl(lot_size,0) as "Lot Qty", nvl(pass_qty,'0.00%') as  "Pass%",
          nvl(edppm,0) as "E/DPPM",     nvl(cdppm,0) as "C/DPPM"
        from   (select process_id, decode(a.process_name,'QC-TH','OOBA') process_name from sajet.sys_process a where a.process_id = '10000418') c1,    
              (select a.process_id, count(a.qc_lotno) as qc_lotno_qty, sum(a.lot_size) lot_size
              from   sajet.g_qc_lot a
              where  a.end_time is not null
                  and a.process_id = '10000418'
                  and  pdline_id=10188
                  and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
              group  by process_id) c2,     
              (select process_id, nvl(to_char(round(NVL(pass,0) / (NVL(pass,0) + NVL(fail,0)) * 100, 2), 'FM9999999999999999.00'),'0.00') || '%' as Pass_qty
              from   (select *
                  from   (select process_id, decode(a.qc_result, '1', 'Fail', 'PASS') qc_result,
                          count(decode(a.qc_result, '1', 'Fail', 'PASS')) cnt
                        from   sajet.g_qc_lot a
                        where  a.end_time is not null
                                    and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                                    and a.process_id=10000418
                                    and  pdline_id=10188
                        group  by process_id, decode(a.qc_result, '1', 'Fail', 'PASS'))
                  pivot(max(cnt)
                  for    qc_result in('PASS' as pass, 'Fail' as fail)))) c3,  
              (select a1.process_id, round(electrical / pass_qty * 1000000, 0) as "EDPPM",
                round(visual / pass_qty * 1000000, 0) as "CDPPM"
              from   (select a.process_id, sum(A.SAMPLING_SIZE) pass_qty
                  from   sajet.g_qc_lot a
                  where  a.end_time is not null
                            and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                          and a.process_id = '10000418'
                          and  pdline_id=10188
                  group  by process_id) a1,
                (select process_id, nvl(visual, 0) visual, nvl(electrical, 0) electrical
                  from   (select a.process_id, c.defect_desc2, count(c.defect_desc2) cnt
                        from   sajet.g_qc_sn_defect b, sajet.g_qc_lot a, sajet.sys_defect c
                        where  a.qc_lotno = b.qc_lotno and a.end_time is not null and b.defect_id = c.defect_id
                        and c.defect_desc2 in ('Visual','Electrical')
                                    and a.process_id = '10000418'
                                    and  a.pdline_id=10188
                                    and a.end_time  between sajet.f_get_timefep(null) and sajet.f_get_timefep(null) + 1 / 2 
                        group  by a.process_id, a.qc_lotno, c.defect_desc2)
                  pivot(max(cnt)
                  for    defect_desc2 in('Visual' as visual, 'Electrical' as electrical))) a2
              where  a1.process_id = a2.process_id(+)) c4
        where  c1.process_id = c2.process_id(+) and c1.process_id = c3.process_id(+) and c1.process_id = c4.process_id(+)`
    );
  } catch (err) {
    return res.send(err.message);
  } finally {
    if (connection) {
      try {
        await connection.close(); 
      } catch (err) {
        return console.error(err.message);
      }
    }
    if (result.rows.length == 0) {
      return res.send('query send no rows');
    } else {
      return res.send(result.rows);
    }
  }
}





app.listen(PORT, ()=>{
  console.log(`Server is runing. ${PORT}`)
})

// getAllTargetL1();
// getAllTargetL1_ooba();
// getAllTargetL4();
// getAllTargetL4_ooba();
// getAllTargetL3();
// getAllTargetL3_ooba();

