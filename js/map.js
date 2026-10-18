const DUONG_DAN_BAN_DO = "assets/ban-do-thanh-pho.svg";

const BUOC_NHAY_ZOOM_NUT = 1.3;
const BUOC_NHAY_ZOOM_LAN_CHUOT = 1.2;
const ZOOM_KHI_MO_TRANG = 1.6;
const ZOOM_MIN = 1;
const ZOOM_MAX = 8;
const HANH_VI_CHUOT = 6;
const BAN_KINH_CHON_DIEM = 24;
const BAN_KINH_VUNG_BAT_CHUOT = 40;
const BIEN_KEO_TOI_DA = 80;
const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

let banDoSvg = null;
let mucZoom = 1;
let lechX = 0;
let lechY = 0;
let luotKeo = null;
let daGanSuKien = false;
let cheDoHienTai = "chonDiem";

const chonDiem = new Set();
const diemDangHien = new Set();
const trangThaiCanh = new Map();

const oBando = document.getElementById("banDo");
const khungChua = document.getElementById("mapZoom");
const nutphongto = document.getElementById("phongto");
const nutthunho = document.getElementById("thunho");
const nutvekho =
    document.getElementById("vekho") ||
    document.getElementById("veKho");

if (!oBando) {
    throw new Error("Không tìm thấy phần tử #banDo");
}

if (!khungChua) {
    throw new Error("Không tìm thấy phần tử #mapZoom");
}

function laydulieubando() {
    if (!window.BAN_DO) {
        throw new Error("Không tìm thấy dữ liệu BAN_DO");
    }

    if (!Array.isArray(BAN_DO.nodes)) {
        throw new Error("BAN_DO.nodes không phải là một mảng");
    }

    return BAN_DO;
}

function timdulieukho() {
    const dulieu = laydulieubando();

    for (const node of dulieu.nodes) {
        if (node.type === "kho") {
            return node;
        }
    }

    throw new Error('Không tìm thấy node có type = "kho"');
}

function timPhanTuNode(id) {
    if (!banDoSvg) {
        return null;
    }

    return banDoSvg.querySelector(
        '[data-gid="' + id + '"]'
    );
}

async function napBanDo() {
    try {
        const phanhoi = await fetch(DUONG_DAN_BAN_DO);

        if (!phanhoi.ok) {
            throw new Error("Không tải được SVG: HTTP " + phanhoi.status);
        }

        const noidungsvg = await phanhoi.text();
        khungChua.innerHTML = noidungsvg;
        banDoSvg = khungChua.querySelector("svg");

        if (!banDoSvg) {
            throw new Error("File tải về không chứa thẻ SVG");
        }

        const dulieukho = timdulieukho();
        const phanTuKho = timPhanTuNode(dulieukho.id);

        if (!phanTuKho) {
            throw new Error(
                "Không tìm thấy node " + dulieukho.id + " trong SVG"
            );
        }

        phanTuKho.classList.add("kho");
        anTatCaDiem();

        if (!daGanSuKien) {
            ganSuKien();
            daGanSuKien = true;
        }

        requestAnimationFrame(function () {
            dungvaokho();
        });
    } catch (loi) {
        khungChua.textContent =
            "Không tải được bản đồ: " + loi.message;
    }
}

function taoVungBatChuot() {
    const vungBatChuot = document.createElementNS(
        SVG_NAMESPACE,
        "circle"
    );

    vungBatChuot.setAttribute("cx", "0");
    vungBatChuot.setAttribute("cy", "0");
    vungBatChuot.setAttribute(
        "r",
        BAN_KINH_VUNG_BAT_CHUOT
    );
    vungBatChuot.setAttribute("fill", "transparent");
    vungBatChuot.setAttribute("class", "vung-bat-chuot");

    return vungBatChuot;
}

function taoDauCong() {
    const dauCong = document.createElementNS(
        SVG_NAMESPACE,
        "text"
    );

    dauCong.setAttribute("x", "0");
    dauCong.setAttribute("y", "8");
    dauCong.setAttribute("text-anchor", "middle");
    dauCong.setAttribute("class", "dau-cong");
    dauCong.textContent = "+";

    return dauCong;
}

function anTatCaDiem() {
    const dulieu = laydulieubando();
    const dulieukho = timdulieukho();

    diemDangHien.clear();

    for (const node of dulieu.nodes) {
        if (node.id === dulieukho.id) {
            continue;
        }

        const phanTuDiem = timPhanTuNode(node.id);

        if (!phanTuDiem) {
            continue;
        }

        phanTuDiem.classList.add("diem-an");

        if (!phanTuDiem.querySelector(".vung-bat-chuot")) {
            phanTuDiem.appendChild(taoVungBatChuot());
        }

        if (!phanTuDiem.querySelector(".dau-cong")) {
            phanTuDiem.appendChild(taoDauCong());
        }
    }
}

function hienDiem(id) {
    const phanTuDiem = timPhanTuNode(id);

    if (!phanTuDiem) {
        return false;
    }

    phanTuDiem.classList.remove("diem-an");
    phanTuDiem.classList.add("diem-hien");
    diemDangHien.add(id);

    const vungBatChuot = phanTuDiem.querySelector(
        ".vung-bat-chuot"
    );

    if (vungBatChuot) {
        vungBatChuot.remove();
    }

    const dauCong = phanTuDiem.querySelector(".dau-cong");

    if (dauCong) {
        dauCong.remove();
    }

    return true;
}

function anDiem(id) {
    const dulieukho = timdulieukho();
    const phanTuDiem = timPhanTuNode(id);

    if (!phanTuDiem || id === dulieukho.id) {
        return false;
    }

    chonDiem.delete(id);
    diemDangHien.delete(id);
    phanTuDiem.classList.remove("diem-chon", "diem-hien");
    phanTuDiem.classList.add("diem-an");

    if (!phanTuDiem.querySelector(".vung-bat-chuot")) {
        phanTuDiem.appendChild(taoVungBatChuot());
    }

    if (!phanTuDiem.querySelector(".dau-cong")) {
        phanTuDiem.appendChild(taoDauCong());
    }

    return true;
}

function veLaiBanDo() {
    khungChua.style.transform =
        "translate(" + lechX + "px, " + lechY + "px) scale(" + mucZoom + ")";
}

function gioihankeochuot(hopbando) {
    const vien = BIEN_KEO_TOI_DA;
    const vitriXtoithieu =
        hopbando.width - hopbando.width * mucZoom - vien;
    const vitriYtoithieu =
        hopbando.height - hopbando.height * mucZoom - vien;

    if (lechX > vien) {
        lechX = vien;
    }

    if (lechX < vitriXtoithieu) {
        lechX = vitriXtoithieu;
    }

    if (lechY > vien) {
        lechY = vien;
    }

    if (lechY < vitriYtoithieu) {
        lechY = vitriYtoithieu;
    }
}

function gioihanZoom(giatri) {
    if (giatri < ZOOM_MIN) {
        return ZOOM_MIN;
    }

    if (giatri > ZOOM_MAX) {
        return ZOOM_MAX;
    }

    return giatri;
}

function zoom(heso, vitrichuotX, vitrichuotY) {
    const hopbando = oBando.getBoundingClientRect();

    if (vitrichuotX === undefined) {
        vitrichuotX = hopbando.left + hopbando.width / 2;
    }

    if (vitrichuotY === undefined) {
        vitrichuotY = hopbando.top + hopbando.height / 2;
    }

    const diembandoX =
        (vitrichuotX - hopbando.left - lechX) / mucZoom;
    const diembandoY =
        (vitrichuotY - hopbando.top - lechY) / mucZoom;

    mucZoom = gioihanZoom(mucZoom * heso);

    lechX =
        vitrichuotX - hopbando.left - diembandoX * mucZoom;
    lechY =
        vitrichuotY - hopbando.top - diembandoY * mucZoom;

    gioihankeochuot(hopbando);
    veLaiBanDo();
}

function dungvaokho(muczoommoi = ZOOM_KHI_MO_TRANG) {
    if (!banDoSvg) {
        return;
    }

    const dulieukho = timdulieukho();
    const hopbando = oBando.getBoundingClientRect();

    khungChua.classList.add("khong-hieu-ung");
    khungChua.style.transform = "none";
    mucZoom = 1;
    lechX = 0;
    lechY = 0;

    const diemKho = banDoSvg.createSVGPoint();
    diemKho.x = dulieukho.x;
    diemKho.y = dulieukho.y;

    const diemKhoTrenManHinh =
        diemKho.matrixTransform(banDoSvg.getScreenCTM());

    const khoX = diemKhoTrenManHinh.x - hopbando.left;
    const khoY = diemKhoTrenManHinh.y - hopbando.top;

    mucZoom = gioihanZoom(muczoommoi);
    lechX = hopbando.width / 2 - khoX * mucZoom;
    lechY = hopbando.height / 2 - khoY * mucZoom;

    gioihankeochuot(hopbando);
    veLaiBanDo();

    requestAnimationFrame(function () {
        khungChua.classList.remove("khong-hieu-ung");
    });
}

function doiSangToaDoSVG(clientX, clientY) {
    const diem = banDoSvg.createSVGPoint();
    diem.x = clientX;
    diem.y = clientY;

    return diem.matrixTransform(
        banDoSvg.getScreenCTM().inverse()
    );
}

function timdiemgannhat(toadoSVG, bankinh) {
    const dulieu = laydulieubando();
    let diemgannhat = null;
    let khoangcachgannhat = bankinh;

    for (const node of dulieu.nodes) {
        const khoangcach = Math.hypot(
            node.x - toadoSVG.x,
            node.y - toadoSVG.y
        );

        if (khoangcach < khoangcachgannhat) {
            khoangcachgannhat = khoangcach;
            diemgannhat = node;
        }
    }

    return diemgannhat;
}

function baothaydoi() {
    if (
        window.BanDo &&
        typeof window.BanDo.khithaydoi === "function"
    ) {
        window.BanDo.khithaydoi();
    }
}

function chondiem(e) {
    const dulieukho = timdulieukho();
    const toadoSVG = doiSangToaDoSVG(e.clientX, e.clientY);
    const bankinhchon = BAN_KINH_CHON_DIEM / mucZoom;
    const diem = timdiemgannhat(toadoSVG, bankinhchon);

    if (!diem || diem.id === dulieukho.id) {
        return;
    }

    const phantudiem = timPhanTuNode(diem.id);

    if (!phantudiem) {
        return;
    }

    if (phantudiem.classList.contains("diem-an")) {
        hienDiem(diem.id);
        baothaydoi();
        return;
    }

    if (chonDiem.has(diem.id)) {
        chonDiem.delete(diem.id);
        phantudiem.classList.remove("diem-chon");
    } else {
        chonDiem.add(diem.id);
        phantudiem.classList.add("diem-chon");
    }

    baothaydoi();
}

function batDauKeo(e) {
    if (!oBando.contains(e.target)) {
        return;
    }

    if (e.pointerType === "mouse" && e.button !== 0) {
        return;
    }

    if (e.target.closest(".dieukhien")) {
        return;
    }

    if (luotKeo !== null) {
        return;
    }

    luotKeo = {
        id: e.pointerId,
        xCu: e.clientX,
        yCu: e.clientY,
        daDiChuyen: 0
    };

    oBando.classList.add("dang-keo");
    khungChua.classList.add("khong-hieu-ung");
}

function dangKeoBanDo(e) {
    if (!luotKeo || e.pointerId !== luotKeo.id) {
        return;
    }

    const dx = e.clientX - luotKeo.xCu;
    const dy = e.clientY - luotKeo.yCu;

    lechX += dx;
    lechY += dy;
    luotKeo.xCu = e.clientX;
    luotKeo.yCu = e.clientY;
    luotKeo.daDiChuyen += Math.abs(dx) + Math.abs(dy);

    gioihankeochuot(oBando.getBoundingClientRect());
    veLaiBanDo();
}

function ketThucKeo(e) {
    if (!luotKeo || e.pointerId !== luotKeo.id) {
        return;
    }

    const daDiChuyen = luotKeo.daDiChuyen;

    luotKeo = null;
    oBando.classList.remove("dang-keo");
    khungChua.classList.remove("khong-hieu-ung");

    if (daDiChuyen < HANH_VI_CHUOT) {
        chondiem(e);
    }
}

function huyKeo() {
    luotKeo = null;
    oBando.classList.remove("dang-keo");
    khungChua.classList.remove("khong-hieu-ung");
}

function ganSuKien() {
    if (nutphongto) {
        nutphongto.addEventListener("click", function () {
            zoom(BUOC_NHAY_ZOOM_NUT);
        });
    }

    if (nutthunho) {
        nutthunho.addEventListener("click", function () {
            zoom(1 / BUOC_NHAY_ZOOM_NUT);
        });
    }

    if (nutvekho) {
        nutvekho.addEventListener("click", function () {
            dungvaokho();
        });
    }

    oBando.addEventListener("wheel", function (e) {
        if (e.target.closest(".dieukhien")) {
            return;
        }

        e.preventDefault();

        const heso =
            e.deltaY < 0
                ? BUOC_NHAY_ZOOM_LAN_CHUOT
                : 1 / BUOC_NHAY_ZOOM_LAN_CHUOT;

        zoom(heso, e.clientX, e.clientY);
    }, { passive: false });

    window.addEventListener("pointerdown", batDauKeo);
    window.addEventListener("pointermove", dangKeoBanDo);
    window.addEventListener("pointerup", ketThucKeo);
    window.addEventListener("pointercancel", huyKeo);
}

function layDanhSachDiemChon() {
    return Array.from(chonDiem);
}

function layDanhSachDiemHien() {
    return Array.from(diemDangHien);
}

function layDanhSachCanh() {
    const dulieu = laydulieubando();
    return dulieu.edges || [];
}

function datCheDo(cheDoMoi) {
    const cacCheDo = ["chonDiem", "chan", "ngap"];

    if (!cacCheDo.includes(cheDoMoi)) {
        throw new Error("Chế độ không hợp lệ");
    }

    cheDoHienTai = cheDoMoi;
}

function datTrangThaiCanh(idCanh, loai) {
    if (loai !== "chan" && loai !== "ngap") {
        throw new Error("Loại trạng thái cạnh không hợp lệ");
    }

    trangThaiCanh.set(idCanh, loai);
}

function xoaTrangThaiCanh(idCanh) {
    trangThaiCanh.delete(idCanh);
}

function layTrangThaiCanh() {
    return new Map(trangThaiCanh);
}

function veDuongDi(danhSachId) {
    if (!banDoSvg) {
        return;
    }

    let lopDuong = banDoSvg.querySelector("#lopDuongDi");

    if (!lopDuong) {
        lopDuong = document.createElementNS(
            SVG_NAMESPACE,
            "g"
        );
        lopDuong.id = "lopDuongDi";
        banDoSvg.appendChild(lopDuong);
    }

    lopDuong.replaceChildren();

    if (!Array.isArray(danhSachId) || danhSachId.length < 2) {
        return;
    }

    const cacDiem = danhSachId
        .map(function (id) {
            return laydulieubando().nodes.find(function (node) {
                return node.id === id;
            });
        })
        .filter(Boolean);

    if (cacDiem.length < 2) {
        return;
    }

    const duong = document.createElementNS(
        SVG_NAMESPACE,
        "polyline"
    );

    duong.setAttribute(
        "points",
        cacDiem.map(function (diem) {
            return diem.x + "," + diem.y;
        }).join(" ")
    );

    duong.setAttribute("class", "duong-di");
    lopDuong.appendChild(duong);
}

function xoaDuongDi() {
    const lopDuong = banDoSvg && banDoSvg.querySelector(
        "#lopDuongDi"
    );

    if (lopDuong) {
        lopDuong.replaceChildren();
    }
}

window.BanDo = {
    layDanhSachDiem: layDanhSachDiemChon,
    layDanhSachDiemChon: layDanhSachDiemChon,
    layDanhSachDiemHien: layDanhSachDiemHien,
    layDuLieu: laydulieubando,
    layDanhSachCanh: layDanhSachCanh,
    layTrangThaiCanh: layTrangThaiCanh,
    datCheDo: datCheDo,
    datTrangThaiCanh: datTrangThaiCanh,
    xoaTrangThaiCanh: xoaTrangThaiCanh,
    hienDiem: hienDiem,
    anDiem: anDiem,
    dungVaoKho: dungvaokho,
    napBanDo: napBanDo,
    veDuongDi: veDuongDi,
    xoaDuongDi: xoaDuongDi,
    layMucZoom: function () {
        return mucZoom;
    },
    khiThayDoi: null
};

napBanDo();
