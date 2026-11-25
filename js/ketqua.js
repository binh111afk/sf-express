"use strict";

/**
 * KetQua — hiển thị kết quả lộ trình ở vùng .o3.
 *
 * Kết quả nhận từ Thuattoan.timLoTrinh() có dạng:
 * {
 *   ok: true,
 *   khuc: [{ tu, den, duong: [...], km }],
 *   tongKm: 12.3,
 *   khongToiDuoc: ["A1"]
 * }
 */
(function () {

    const o3 = document.querySelector(".o3");

    if (!o3) {
        return;
    }

    const VAN_TOC_KM_H = 30;
    const SVG_NS = "http://www.w3.org/2000/svg";

    /* Bảng tra: cặp mã nút → dãy điểm bám theo tim đường trong SVG. */
    let banDoDuong = null;

    const oQuangDuong = document.getElementById("kqQuangDuong");
    const oThoiGian = document.getElementById("kqThoiGian");
    const oVanToc = document.getElementById("kqVanToc");
    const oThuTu = document.getElementById("kqThuTu");
    const oCanhBao = document.getElementById("kqCanhBao");
    const oTrangThai = document.getElementById("trangThaiKetQua");

    /* ---------- định dạng ---------- */

    function dinhDangKm(km) {
        return (Math.round(km * 10) / 10).toFixed(1).replace(".", ",") + " km";
    }

    function dinhDangThoiGian(phut) {
        if (phut < 1) {
            return "< 1 phút";
        }

        const lamTron = Math.round(phut);

        if (lamTron < 60) {
            return lamTron + " phút";
        }

        const gio = Math.floor(lamTron / 60);
        const conLai = lamTron % 60;

        return conLai === 0 ? gio + " giờ" : gio + " giờ " + conLai + " phút";
    }

    function datTrangThai(chu, loai) {
        if (!oTrangThai) {
            return;
        }

        oTrangThai.textContent = chu;
        oTrangThai.className = "trang-thai" + (loai ? " " + loai : "");
    }

    function xoaNoiDung() {
        if (oQuangDuong) {
            oQuangDuong.textContent = "—";
        }
        if (oThoiGian) {
            oThoiGian.textContent = "—";
        }
        if (oVanToc) {
            oVanToc.textContent = VAN_TOC_KM_H + " km/h";
        }
        if (oCanhBao) {
            oCanhBao.textContent = "";
        }
        if (oThuTu) {
            const ghiChu = document.createElement("p");
            ghiChu.className = "ghi-chu";
            ghiChu.textContent = "Chưa tính lộ trình.";
            oThuTu.replaceChildren(ghiChu);
        }
    }

    function taoODiem(nhan, ma) {
        const o = document.createElement("div");
        o.className = "diem-thu-tu";

        const nhanEl = document.createElement("span");
        nhanEl.className = "nhan";
        nhanEl.textContent = nhan;

        const maEl = document.createElement("span");
        maEl.className = "ma";
        maEl.textContent = ma;

        o.append(nhanEl, maEl);
        return o;
    }

    function taoMuiTen() {
        const muiTen = document.createElement("span");
        muiTen.className = "muiten";
        muiTen.textContent = "→";
        return muiTen;
    }

    /* ---------- vẽ tuyến ---------- */

    function laySvgBanDo() {
        return document.querySelector("#mapZoom svg");
    }

    /**
     * Nối các đỉnh bằng đoạn thẳng.
     * Không bo cong để tuyến bám đúng các đoạn đường của dữ liệu.
     */
    function taoDuongDi(cacDiem) {
        if (cacDiem.length < 2) {
            return "";
        }

        let duong = "M " + cacDiem[0].x + " " + cacDiem[0].y;

        for (let i = 1; i < cacDiem.length; i++) {
            duong += " L " + cacDiem[i].x + " " + cacDiem[i].y;
        }

        return duong;
    }

    /**
     * Độ dày nét tính theo đơn vị SVG để khi phóng to/thu nhỏ
     * nét vẫn giữ đúng độ dày trên màn hình.
     */
    function capNhatDoDayTuyen() {
        const svg = laySvgBanDo();

        if (!svg) {
            return;
        }

        const tiLe = Math.abs(svg.getScreenCTM().a) || 1;
        const cacPath = svg.querySelectorAll("#lopDuongDi path");

        cacPath.forEach(function (path) {
            if (path.classList.contains("tuyen-chinh")) {
                path.style.strokeWidth = (5 / tiLe) + "px";
            } else if (path.classList.contains("tuyen-vien")) {
                path.style.strokeWidth = (10 / tiLe) + "px";
            } else if (path.classList.contains("tuyen-quang")) {
                path.style.strokeWidth = (16 / tiLe) + "px";
            }
        });
    }

    /**
     * Dựng bảng tra cặp nút → đoạn đường thật trong SVG.
     *
     * Mỗi path trong #layerCasing là tim một đoạn đường (có thể cong).
     * Ta lấy mẫu path bằng getPointAtLength(), chiếu các nút giao lên
     * path rồi lưu đoạn giữa hai nút liên tiếp. Nhờ vậy tuyến highlight
     * bám theo độ cong của đường thay vì nối thẳng hai nút.
     */
    function xayDungBanDoDuong() {
        const svg = laySvgBanDo();

        if (!svg || !window.BanDo) {
            return null;
        }

        const duLieu = window.BanDo.layDuLieu();
        const cacPath = Array.from(svg.querySelectorAll("#layerCasing > path"));

        if (cacPath.length === 0) {
            return null;
        }

        const bang = new Map();
        const BUOC_LAY_MAU = 4;   // đơn vị SVG giữa hai điểm lấy mẫu
        const BAN_KINH_NOI = 14;  // nút giao phải nằm trong bán kính này

        cacPath.forEach(function (path) {
            const doDai = path.getTotalLength();

            if (!doDai) {
                return;
            }

            const soDiem = Math.max(2, Math.ceil(doDai / BUOC_LAY_MAU));
            const cacDiem = [];

            for (let i = 0; i <= soDiem; i++) {
                const diem = path.getPointAtLength((doDai * i) / soDiem);
                cacDiem.push({ x: diem.x, y: diem.y });
            }

            /* Chiếu từng nút lên path, giữ các nút nằm đủ gần tim đường. */
            const cacNut = [];

            duLieu.nodes.forEach(function (nut) {
                let nhoNhat = Infinity;
                let chiSo = -1;

                for (let i = 0; i < cacDiem.length; i++) {
                    const khoangCach = Math.hypot(cacDiem[i].x - nut.x, cacDiem[i].y - nut.y);

                    if (khoangCach < nhoNhat) {
                        nhoNhat = khoangCach;
                        chiSo = i;
                    }
                }

                if (nhoNhat <= BAN_KINH_NOI) {
                    cacNut.push({ nut: nut, chiSo: chiSo });
                }
            });

            cacNut.sort(function (a, b) {
                return a.chiSo - b.chiSo;
            });

            /* Hai nút liên tiếp trên cùng một path tạo thành một cạnh. */
            for (let i = 0; i < cacNut.length - 1; i++) {
                const a = cacNut[i];
                const b = cacNut[i + 1];

                if (a.nut.id === b.nut.id || a.chiSo === b.chiSo) {
                    continue;
                }

                const batDau = Math.min(a.chiSo, b.chiSo);
                const ketThuc = Math.max(a.chiSo, b.chiSo);
                const doan = cacDiem.slice(batDau, ketThuc + 1);

                if (doan.length < 2) {
                    continue;
                }

                /* Nối đúng vào tâm nút giao; marker nút sẽ che đoạn nối nhỏ. */
                doan[0] = { x: a.nut.x, y: a.nut.y };
                doan[doan.length - 1] = { x: b.nut.x, y: b.nut.y };

                const key1 = a.nut.id + "|" + b.nut.id;
                const key2 = b.nut.id + "|" + a.nut.id;
                const cu = bang.get(key1);

                if (!cu || cu.length > doan.length) {
                    bang.set(key1, doan);
                    bang.set(key2, doan.slice().reverse());
                }
            }
        });

        return bang;
    }

    function themDiem(danhSach, diem) {
        if (!diem) {
            return;
        }

        const cuoi = danhSach[danhSach.length - 1];

        if (!cuoi || Math.hypot(cuoi.x - diem.x, cuoi.y - diem.y) > 0.5) {
            danhSach.push({ x: diem.x, y: diem.y });
        }
    }

    /**
     * Đổi danh sách mã nút của tuyến thành dãy điểm chi tiết.
     * Cạnh nào có đoạn đường tương ứng thì lấy đoạn cong đó;
     * cạnh nào không khớp thì nối thẳng hai nút.
     */
    function layDiemChiTiet(danhSachId) {
        const duLieu = window.BanDo.layDuLieu();
        const nutTheoId = new Map();

        duLieu.nodes.forEach(function (nut) {
            nutTheoId.set(nut.id, nut);
        });

        if (!banDoDuong) {
            banDoDuong = xayDungBanDoDuong();
        }

        const ketQua = [];

        for (let i = 0; i < danhSachId.length - 1; i++) {
            const idA = danhSachId[i];
            const idB = danhSachId[i + 1];
            const nutA = nutTheoId.get(idA);
            const nutB = nutTheoId.get(idB);

            if (!nutA || !nutB) {
                continue;
            }

            const doan = banDoDuong ? banDoDuong.get(idA + "|" + idB) : null;

            if (doan) {
                doan.forEach(function (diem) {
                    themDiem(ketQua, diem);
                });
            } else {
                themDiem(ketQua, nutA);
                themDiem(ketQua, nutB);
            }
        }

        return ketQua;
    }

    /**
     * Đặt lớp tuyến ngay trước lớp nút giao đầu tiên để Kho và các
     * điểm giao hàng luôn nằm trên tuyến, không bị tuyến che.
     */
    function datLopTuyenDuoiNut(svg, lop) {
        const nutDau = svg.querySelector("g[data-gid]");

        if (!nutDau) {
            svg.appendChild(lop);
            return;
        }

        let moc = nutDau;

        while (moc.parentNode && moc.parentNode !== svg) {
            moc = moc.parentNode;
        }

        if (moc.parentNode === svg) {
            svg.insertBefore(lop, moc);
        } else {
            svg.appendChild(lop);
        }
    }

    function taoPathTuyen(lop, duong, tenLop) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", duong);
        path.setAttribute("class", tenLop);
        path.setAttribute("pathLength", "1");
        lop.appendChild(path);
        return path;
    }

    /**
     * Vẽ tuyến bằng hiệu ứng vẽ dần: quầng xanh, viền trắng, nét xanh chính.
     * Đường được bo góc và dùng stroke không co giãn để luôn sắc nét khi zoom.
     */
    function veTuyenCoHieuUng(danhSachId) {
        const svg = laySvgBanDo();

        if (!svg || !window.BanDo) {
            return;
        }

        const cacDiem = layDiemChiTiet(danhSachId);

        if (cacDiem.length < 2) {
            return;
        }

        let lop = svg.querySelector("#lopDuongDi");

        if (!lop) {
            lop = document.createElementNS(SVG_NS, "g");
            lop.setAttribute("id", "lopDuongDi");
            lop.setAttribute("pointer-events", "none");
            svg.appendChild(lop);
        }

        lop.replaceChildren();
        datLopTuyenDuoiNut(svg, lop);

        const duong = taoDuongDi(cacDiem);

        if (!duong) {
            return;
        }

        const quang = taoPathTuyen(lop, duong, "tuyen-quang");
        const vien = taoPathTuyen(lop, duong, "tuyen-vien");
        const chinh = taoPathTuyen(lop, duong, "tuyen-chinh");

        capNhatDoDayTuyen();

        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            return;
        }

        [quang, vien, chinh].forEach(function (path) {
            path.style.strokeDasharray = "1";
            path.style.strokeDashoffset = "1";
        });

        /* Ép trình duyệt tính lại layout trước khi chạy transition. */
        void chinh.getBoundingClientRect();

        requestAnimationFrame(function () {
            quang.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)";
            vien.style.transition = "stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)";
            chinh.style.transition = "stroke-dashoffset 850ms cubic-bezier(0.22, 0.61, 0.36, 1) 80ms";

            quang.style.strokeDashoffset = "0";
            vien.style.strokeDashoffset = "0";
            chinh.style.strokeDashoffset = "0";
        });
    }

    /* ---------- hiển thị ---------- */

    function hienTuyen(ketQua) {
        if (!ketQua || !ketQua.ok) {
            hienLoi(ketQua && ketQua.loi ? ketQua.loi : "Không có kết quả.");
            return;
        }

        const tongKm = ketQua.tongKm || 0;
        const phut = (tongKm / VAN_TOC_KM_H) * 60;

        if (oQuangDuong) {
            oQuangDuong.textContent = dinhDangKm(tongKm);
        }
        if (oThoiGian) {
            oThoiGian.textContent = dinhDangThoiGian(phut);
        }
        if (oVanToc) {
            oVanToc.textContent = VAN_TOC_KM_H + " km/h";
        }

        /* Thứ tự: Kho → Giao 1 → Giao 2 → ... */
        if (oThuTu) {
            oThuTu.replaceChildren();

            let maKho = "KHO";

            if (window.BanDo) {
                const kho = window.BanDo.layDuLieu().nodes.find(function (nut) {
                    return nut.type === "kho";
                });

                if (kho) {
                    maKho = kho.id;
                }
            }

            oThuTu.appendChild(taoODiem("Kho", maKho));

            ketQua.khuc.forEach(function (chang, i) {
                oThuTu.appendChild(taoMuiTen());
                oThuTu.appendChild(taoODiem("Giao " + (i + 1), chang.den));
            });
        }

        /* Cảnh báo các điểm không còn đường tới. */
        if (oCanhBao) {
            if (ketQua.khongToiDuoc && ketQua.khongToiDuoc.length > 0) {
                oCanhBao.textContent = "Không tới được: " + ketQua.khongToiDuoc.join(", ") +
                    " (do đường bị chặn hoặc đồ thị bị cắt rời).";
            } else {
                oCanhBao.textContent = "";
            }
        }

        /* Vẽ tuyến lên bản đồ. Nối các chặng, bỏ nút trùng ở chỗ nối. */
        if (window.BanDo) {
            const tatCa = [];

            ketQua.khuc.forEach(function (chang) {
                chang.duong.forEach(function (id, i) {
                    if (i === 0 && tatCa[tatCa.length - 1] === id) {
                        return;
                    }
                    tatCa.push(id);
                });
            });

            if (tatCa.length >= 2) {
                veTuyenCoHieuUng(tatCa);
            }

            if (window.ThietLap && typeof window.ThietLap.veLaiSuCo === "function") {
                window.ThietLap.veLaiSuCo();
            }
        }

        datTrangThai("Đã tính xong", "xong");
    }

    function hienLoi(thongBao) {
        xoaNoiDung();

        if (oCanhBao) {
            oCanhBao.textContent = thongBao;
        }

        if (window.BanDo) {
            window.BanDo.xoaDuongDi();
        }

        datTrangThai("Có lỗi", "loi");
    }

    function xoa() {
        xoaNoiDung();
        datTrangThai("Sẵn sàng", "");

        if (window.BanDo) {
            window.BanDo.xoaDuongDi();
        }
    }

    window.addEventListener("resize", capNhatDoDayTuyen);

    const khungZoom = document.getElementById("mapZoom");

    if (khungZoom && typeof MutationObserver === "function") {
        new MutationObserver(capNhatDoDayTuyen).observe(khungZoom, {
            attributes: true,
            attributeFilter: ["style"]
        });
    }

    window.KetQua = {
        hienTuyen: hienTuyen,
        hienLoi: hienLoi,
        xoa: xoa
    };

})();
