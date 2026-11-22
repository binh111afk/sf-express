const LopGraph = window.Graph;

function DuongDi(dinhTruoc, dinhDich) {
    const duong = [];
    let dinh = dinhDich;
    let dem = 0;
    while (dinh !== -1 && dem <= dinhTruoc.length) {
        duong.push(dinh);
        dinh = dinhTruoc[dinh];
        dem++;
    }
    return duong.reverse();
}

function dijkstra(graph, dinhNguon, tuyChon) {
    tuyChon = tuyChon || {};

    const sodinh = graph.sodinh;
    const matranke = graph.matranke;
    const khoangCach = new Array(sodinh).fill(Infinity);
    const daChot = new Array(sodinh).fill(false);
    const dinhTruoc = new Array(sodinh).fill(-1);
    const cacBuoc = [];

    khoangCach[dinhNguon] = 0;

    for (let buoc = 0; buoc < sodinh; buoc++) {
        let u = -1;
        let nhoNhat = Infinity;

        for (let v = 0; v < sodinh; v++) {
            if (!daChot[v] && khoangCach[v] < nhoNhat) {
                nhoNhat = khoangCach[v];
                u = v;
            }
        }

        if (u === -1) {
            break;
        }

        daChot[u] = true;

        for (let v = 0; v < sodinh; v++) {
            if (daChot[v] || matranke[u][v] <= 0) {
                continue;
            }

            const khoangCachMoi = khoangCach[u] + matranke[u][v];

            if (khoangCachMoi < khoangCach[v]) {
                khoangCach[v] = khoangCachMoi;
                dinhTruoc[v] = u;
            }
        }

        if (tuyChon.ghiBuoc) {
            cacBuoc.push({
                buoc: buoc + 1,
                u: u,
                daChot: daChot.slice(),
                khoangCach: khoangCach.slice()
            });
        }
    }

    if (tuyChon.inKetQua !== false) {
        for (let i = 0; i < sodinh; i++) {
            const duong = DuongDi(dinhTruoc, i);
            const loTrinh = khoangCach[i] === Infinity ? "Khong co duong di" : duong.join("->");
            console.log("Den dinh " + i + ", khoang cach: " + khoangCach[i] + ", lo trinh: " + loTrinh);
        }
    }

    return {
        khoangCach: khoangCach,
        dinhTruoc: dinhTruoc,
        cacBuoc: cacBuoc
    };
}

function taoDoThi(duLieu, tuyChon) {
    tuyChon = tuyChon || {};
    const canhBiChan = tuyChon.canhBiChan || new Set();

    const chiSo = new Map();
    duLieu.nodes.forEach(function (nut, i) {
        chiSo.set(nut.id, i);
    });

    const graph = new LopGraph(duLieu.nodes.length);

    duLieu.edges.forEach(function (canh) {
        if (canhBiChan.has(canh.id)) {
            return;
        }

        const u = chiSo.get(canh.a);
        const v = chiSo.get(canh.b);

        if (u === undefined || v === undefined) {
            return;
        }

        graph.addCanh(u, v, canh.km);
    });

    return {
        graph: graph,
        chiSo: chiSo,
        duLieu: duLieu
    };
}

function timDuongNgan(duLieu, nguonId, dichId, tuyChon) {
    const doThi = taoDoThi(duLieu, tuyChon);
    const u = doThi.chiSo.get(nguonId);
    const v = doThi.chiSo.get(dichId);

    if (u === undefined || v === undefined) {
        return {
            ok: false,
            loi: "Mã nút không có trong dữ liệu: " + nguonId + " → " + dichId
        };
    }

    const kq = dijkstra(doThi.graph, u, { inKetQua: false });

    if (!isFinite(kq.khoangCach[v])) {
        return {
            ok: false,
            loi: "Không còn đường tới " + dichId
        };
    }

    const duong = DuongDi(kq.dinhTruoc, v).map(function (i) {
        return duLieu.nodes[i].id;
    });

    return {
        ok: true,
        duong: duong,
        km: kq.khoangCach[v]
    };
}

function timLoTrinh(duLieu, khoId, cacDich, tuyChon) {
    const doThi = taoDoThi(duLieu, tuyChon);
    const chiSo = doThi.chiSo;
    const graph = doThi.graph;

    const danhSachDich = Array.isArray(cacDich) ? cacDich.slice() : [];
    const conLai = new Set(danhSachDich.filter(function (id) {
        return id !== khoId;
    }));

    if (conLai.size === 0) {
        return {
            ok: false,
            loi: "Chưa chọn điểm giao hàng nào.",
            khuc: [],
            tongKm: 0,
            khongToiDuoc: []
        };
    }

    const uBatDau = chiSo.get(khoId);

    if (uBatDau === undefined) {
        return {
            ok: false,
            loi: "Không tìm thấy Kho trong dữ liệu.",
            khuc: [],
            tongKm: 0,
            khongToiDuoc: Array.from(conLai)
        };
    }

    const khuc = [];
    const khongToiDuoc = [];
    let tongKm = 0;
    let u = uBatDau;

    while (conLai.size > 0) {
        const kq = dijkstra(graph, u, { inKetQua: false });

        let ganNhat = -1;
        let kmNhoNhat = Infinity;

        conLai.forEach(function (id) {
            const v = chiSo.get(id);

            if (v !== undefined && kq.khoangCach[v] < kmNhoNhat) {
                kmNhoNhat = kq.khoangCach[v];
                ganNhat = v;
            }
        });

        if (ganNhat === -1 || !isFinite(kmNhoNhat)) {
            conLai.forEach(function (id) {
                khongToiDuoc.push(id);
            });
            break;
        }

        const duong = DuongDi(kq.dinhTruoc, ganNhat).map(function (i) {
            return duLieu.nodes[i].id;
        });
        const den = duLieu.nodes[ganNhat].id;

        khuc.push({
            tu: duLieu.nodes[u].id,
            den: den,
            duong: duong,
            km: kmNhoNhat
        });

        tongKm += kmNhoNhat;
        conLai.delete(den);
        u = ganNhat;
    }

    if (khuc.length === 0) {
        return {
            ok: false,
            loi: "Không còn đường tới điểm giao hàng nào.",
            khuc: [],
            tongKm: 0,
            khongToiDuoc: khongToiDuoc
        };
    }

    return {
        ok: true,
        khuc: khuc,
        tongKm: tongKm,
        khongToiDuoc: khongToiDuoc
    };
}

window.Thuattoan = {
    DuongDi: DuongDi,
    dijkstra: dijkstra,
    taoDoThi: taoDoThi,
    timDuongNgan: timDuongNgan,
    timLoTrinh: timLoTrinh
};