"use strict";

/**

 * - Bật/tắt chế độ tạo điểm, hủy điểm, đánh dấu giờ cao điểm và ngập lụt.
 * - Gọi các hàm có sẵn của map.js (window.BanDo) để thay đổi bản đồ.
 * - Khi bấm «Tìm lộ trình», gọi Thuattoan.timLoTrinh() để tính tuyến.
 
 */
(function () {

    const o1 = document.getElementById("banDo");
    const o2 = document.querySelector(".o2");

    if (!o1 || !o2) {
        return;
    }

    if (!window.BanDo) {
        o2.textContent = "Cần nạp js/map.js trước js/thietlap.js.";
        return;
    }

    const BanDo = window.BanDo;

    /* Các chế độ bấm trên bản đồ. */
    const CHE_DO = {
        KHONG: "khong",
        TAO_DIEM: "taoDiem",
        HUY_DIEM: "huyDiem",
        CAO_DIEM: "caoDiem",
        NGAP: "ngap"
    };

    const CHE_DO_MAC_DINH = CHE_DO.TAO_DIEM;
    const SVG_NS = "http://www.w3.org/2000/svg";
    const BAN_KINH_CHON_DIEM = 24;
    const BAN_KINH_CHON_CANH = 18;
    const HANH_VI_CHUOT = 6;

    let cheDo = CHE_DO_MAC_DINH;

    const loaiSuCo = new Map();

    let lanBam = null;
    let dangHuyKeo = false;

    /* ---------- phần tử giao diện ---------- */
    const nutTaoDiem = document.getElementById("nutTaoDiem");
    const nutHuyDiem = document.getElementById("nutHuyDiem");
    const nutCaoDiem = document.getElementById("nutCaoDiem");
    const nutNgap = document.getElementById("nutNgap");
    const nutTimDuong = document.getElementById("nutTimDuong");
    const nutDatLai = document.getElementById("nutDatLai");
    const chkQuayVe = document.getElementById("chkQuayVe");
    const oThongBao = document.getElementById("thongBao");
    const oSoLieu = document.getElementById("soLieuThietLap");

    /* =========================================================
       1. TIỆN ÍCH
       ========================================================= */

    function laySvg() {
        return document.querySelector("#mapZoom svg");
    }

    function layDuLieu() {
        return BanDo.layDuLieu();
    }

    function layZoom() {
        return Math.max(1, BanDo.layMucZoom());
    }

    function doiSangToaDoSVG(clientX, clientY) {
        const svg = laySvg();
        const diem = svg.createSVGPoint();
        diem.x = clientX;
        diem.y = clientY;
        return diem.matrixTransform(svg.getScreenCTM().inverse());
    }

    function thongBao(chu, loai) {
        if (!oThongBao) {
            return;
        }

        oThongBao.textContent = chu;
        oThongBao.classList.remove("loi", "ok");

        if (loai) {
            oThongBao.classList.add(loai);
        }
    }

    function laDiemDangHien(id) {
        return BanDo.layDanhSachDiemHien().indexOf(id) !== -1;
    }

    /* Khoảng cách từ điểm p tới đoạn thẳng a–b. */
    function chuKyDiem() {
        /* Chuỗi tóm tắt trạng thái điểm (đã chọn và đang hiện), để so trước/sau một lần bấm. */
        return BanDo.layDanhSachDiemChon().join(",") + "|" + BanDo.layDanhSachDiemHien().join(",");
    }

    function khoangCachToiDoanThang(p, a, b) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const apx = p.x - a.x;
        const apy = p.y - a.y;
        const binhPhuongDoDai = abx * abx + aby * aby;

        if (binhPhuongDoDai === 0) {
            return Math.hypot(apx, apy);
        }

        /* t là vị trí hình chiếu trên đoạn, kẹp trong [0, 1]. */
        let t = (apx * abx + apy * aby) / binhPhuongDoDai;
        t = Math.max(0, Math.min(1, t));

        const x = a.x + t * abx;
        const y = a.y + t * aby;

        return Math.hypot(p.x - x, p.y - y);
    }

    function timNutGanNhat(toaDo, chiLayDiemDangHien) {
        const duLieu = layDuLieu();
        const banKinh = BAN_KINH_CHON_DIEM / layZoom();
        let ganNhat = null;
        let nhoNhat = banKinh;

        duLieu.nodes.forEach(function (nut) {
            if (chiLayDiemDangHien && !laDiemDangHien(nut.id)) {
                return;
            }

            const khoangCach = Math.hypot(nut.x - toaDo.x, nut.y - toaDo.y);

            if (khoangCach < nhoNhat) {
                nhoNhat = khoangCach;
                ganNhat = nut;
            }
        });

        return ganNhat;
    }

    /*  lưu vào map để gọi lại, đỡ phải chạy lại từ dầud  */
    const duongCongCache = new Map();

    function layDuongCong(canh) {
        if (duongCongCache.has(canh.id)) {
            return duongCongCache.get(canh.id);
        }

        const duLieu = layDuLieu();
        const a = duLieu.nodes.find(function (nut) { return nut.id === canh.a; });
        const b = duLieu.nodes.find(function (nut) { return nut.id === canh.b; });
        let diem = null;

        if (window.KetQua && typeof window.KetQua.diemTheoDuong === "function") {
            diem = window.KetQua.diemTheoDuong([canh.a, canh.b]);
        }

        if (!diem || diem.length < 2) {
            diem = [a, b];
        }

        if (laySvg()) {
            duongCongCache.set(canh.id, diem);
        }

        return diem;
    }

    /* Khoảng cách từ điểm p tới đường cong (gồm nhiều đoạn thẳng nối tiếp). */
    function khoangCachToiDuongCong(p, diem) {
        let nhoNhat = Infinity;

        for (let i = 0; i + 1 < diem.length; i++) {
            nhoNhat = Math.min(nhoNhat, khoangCachToiDoanThang(p, diem[i], diem[i + 1]));
        }

        return nhoNhat;
    }

    function timCanhGanNhat(toaDo) {
        const duLieu = layDuLieu();
        const banKinh = BAN_KINH_CHON_CANH / layZoom();
        let ganNhat = null;
        let nhoNhat = banKinh;

        duLieu.edges.forEach(function (canh) {
            const khoangCach = khoangCachToiDuongCong(toaDo, layDuongCong(canh));

            if (khoangCach < nhoNhat) {
                nhoNhat = khoangCach;
                ganNhat = canh;
            }
        });

        return ganNhat;
    }

    /* Rê chuột: tô sáng đoạn đường gần con trỏ (chỉ ở chế độ đánh dấu)*/

    const LOP_RE_ID = "lopRe";
    let canhDangRe = null;

    function laCheDoDanhDauCanh() {
        return cheDo === CHE_DO.CAO_DIEM || cheDo === CHE_DO.NGAP;
    }

    function xoaDuongRe() {
        canhDangRe = null;
        const svg = laySvg();
        const lop = svg && svg.querySelector("#" + LOP_RE_ID);

        if (lop) {
            lop.replaceChildren();
        }
    }

    function veDuongRe(canh) {
        const svg = laySvg();

        if (!svg) {
            return;
        }

        let lop = svg.querySelector("#" + LOP_RE_ID);

        if (!lop) {
            lop = document.createElementNS(SVG_NS, "g");
            lop.setAttribute("id", LOP_RE_ID);
            lop.setAttribute("pointer-events", "none");
            svg.appendChild(lop);
        }

        lop.replaceChildren();

        const duong = document.createElementNS(SVG_NS, "polyline");
        duong.setAttribute("points", layDuongCong(canh).map(function (p) {
            return p.x + "," + p.y;
        }).join(" "));
        duong.setAttribute("class", "duong-re");
        lop.appendChild(duong);

        canhDangRe = canh;
    }

    function capNhatDuongRe(e) {
        if (!laCheDoDanhDauCanh() || !laySvg() ||
            !o1.contains(e.target) || e.target.closest(".dieukhien")) {
            if (canhDangRe) {
                xoaDuongRe();
            }
            return;
        }

        const canh = timCanhGanNhat(doiSangToaDoSVG(e.clientX, e.clientY));

        if (!canh) {
            if (canhDangRe) {
                xoaDuongRe();
            }
            return;
        }

        if (canhDangRe && canhDangRe.id === canh.id) {
            return;
        }

        veDuongRe(canh);
    }

    /* =========================================================
       Rê chuột gần tuyến: hiện quầng xanh nhạt dọc theo tuyến
       ========================================================= */

    /* Khoảng cách (px màn hình) để coi con trỏ là đang gần tuyến. */
    const KHOANG_RE_TUYEN_PX = 14;

    function capNhatQuangTuyen(e) {
        const svg = laySvg();
        const quang = svg && svg.querySelector("#lopDuongDi .tuyen-sang");

        if (!quang) {
            return;
        }

        const diemTuyen = window.KetQua && window.KetQua.layDiemTuyen ? window.KetQua.layDiemTuyen() : null;
        const dangTrenBanDo = e.target && e.target.closest && e.target.closest("#banDo");

        if (!dangTrenBanDo || !diemTuyen || diemTuyen.length < 2) {
            quang.classList.remove("hien");
            return;
        }

        const tiLe = Math.abs(svg.getScreenCTM().a) || 1;
        const toaDo = doiSangToaDoSVG(e.clientX, e.clientY);
        const nguong = KHOANG_RE_TUYEN_PX / tiLe;

        let gan = false;

        for (let i = 0; i + 1 < diemTuyen.length && !gan; i++) {
            if (khoangCachToiDoanThang(toaDo, diemTuyen[i], diemTuyen[i + 1]) <= nguong) {
                gan = true;
            }
        }

        quang.classList.toggle("hien", gan);
    }

    /* =========================================================
       2. ĐỔI CHẾ ĐỘ VÀ CẬP NHẬT GIAO DIỆN
       ========================================================= */

    function datCheDoMoi(cheDoMoi) {
        /* Bấm lại đúng nút đang bật thì tắt chế độ. */
        cheDo = (cheDo === cheDoMoi) ? CHE_DO.KHONG : cheDoMoi;

        /* map.js không đổi hành vi theo chế độ; mọi thao tác thiết lập do file này xử lý. */
        BanDo.datCheDo("chonDiem");

        capNhatGiaoDien();
        thongBaoTheoCheDo();
    }

    function thongBaoTheoCheDo() {
        if (cheDo === CHE_DO.TAO_DIEM) {
            thongBao("Đang bật tạo điểm. Bấm lần 1 để hiện điểm, bấm lần 2 để chọn điểm giao hàng.");
        } else if (cheDo === CHE_DO.HUY_DIEM) {
            thongBao("Đang bật hủy điểm. Bấm vào một điểm đã tạo để ẩn điểm đó.");
        } else if (cheDo === CHE_DO.CAO_DIEM) {
            thongBao("Đang bật giờ cao điểm. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ. Đoạn này sẽ bị tránh khi tính lộ trình.");
        } else if (cheDo === CHE_DO.NGAP) {
            thongBao("Đang bật ngập lụt. Bấm vào đoạn đường để đánh dấu; bấm lại để bỏ. Đoạn ngập sẽ bị tránh hoàn toàn.");
        } else {
            thongBao("Đã tắt chế độ. Bật một nút ở trên rồi thao tác trên bản đồ.");
        }
    }

    function capNhatGiaoDien() {
        const cacNut = [
            [nutTaoDiem, CHE_DO.TAO_DIEM],
            [nutHuyDiem, CHE_DO.HUY_DIEM],
            [nutCaoDiem, CHE_DO.CAO_DIEM],
            [nutNgap, CHE_DO.NGAP]
        ];

        cacNut.forEach(function (cap) {
            const nut = cap[0];
            const ma = cap[1];

            if (!nut) {
                return;
            }

            const dangBat = cheDo === ma;
            nut.classList.toggle("dang-bat", dangBat);
            nut.setAttribute("aria-pressed", dangBat ? "true" : "false");
        });

        if (!laCheDoDanhDauCanh()) {
            xoaDuongRe();
        }

        capNhatSoLieu();
    }

    function capNhatSoLieu() {
        const daChon = BanDo.layDanhSachDiemChon();
        let soCaoDiem = 0;
        let soNgap = 0;

        loaiSuCo.forEach(function (loai) {
            if (loai === CHE_DO.CAO_DIEM) {
                soCaoDiem++;
            } else {
                soNgap++;
            }
        });

        if (oSoLieu) {
            oSoLieu.textContent = "Đã chọn " + daChon.length + " điểm giao hàng · " +
                soCaoDiem + " đoạn cao điểm · " + soNgap + " đoạn ngập.";
        }
    }

    /* =========================================================
       3. XỬ LÝ CÚ BẤM TRÊN BẢN ĐỒ
       ========================================================= */

    function batDauTheoDoi(e) {
        if (!o1.contains(e.target) || e.target.closest(".dieukhien")) {
            lanBam = null;
            return;
        }

        if (e.pointerType === "mouse" && e.button !== 0) {
            lanBam = null;
            return;
        }

        lanBam = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY
        };
    }

    function ketThucTheoDoi(e) {
        if (dangHuyKeo || !lanBam || e.pointerId !== lanBam.id) {
            return;
        }

        const daDiChuyen = Math.abs(e.clientX - lanBam.x) + Math.abs(e.clientY - lanBam.y);
        const laCuBam = daDiChuyen < HANH_VI_CHUOT;
        const ketThucTrongBanDo = o1.contains(e.target) && !e.target.closest(".dieukhien");

        lanBam = null;

        if (!ketThucTrongBanDo || !laCuBam) {
            return;
        }

        /* Chế độ tạo điểm: để map.js tự xử lý như bản gốc. */
        if (cheDo === CHE_DO.TAO_DIEM) {
            /* Chụp trạng thái trước; sau khi map.js chạy xong mới so sánh. */
            const truoc = chuKyDiem();

            setTimeout(function () {
                if (chuKyDiem() !== truoc) {
                    capNhatSauThayDoi();
                } else {
                    capNhatSoLieu();
                }
            }, 0);
            return;
        }

        /*
         * Các chế độ khác: chặn map.js xử lý cú bấm này.
         * map.js đã bắt đầu một lượt kéo ở pointerdown, nên phát pointercancel
         * để nó dọn trạng thái kéo, tránh bản đồ bị kẹt ở trạng thái đang kéo.
         */
        e.stopPropagation();

        dangHuyKeo = true;
        window.dispatchEvent(new PointerEvent("pointercancel", {
            pointerId: e.pointerId,
            bubbles: true
        }));
        dangHuyKeo = false;

        const svg = laySvg();

        if (!svg) {
            return;
        }

        const toaDo = doiSangToaDoSVG(e.clientX, e.clientY);

        if (cheDo === CHE_DO.HUY_DIEM) {
            xuLyHuyDiem(toaDo);
        } else if (cheDo === CHE_DO.CAO_DIEM || cheDo === CHE_DO.NGAP) {
            xuLyDanhDauCanh(toaDo, cheDo);
        } else {
            thongBao("Chưa bật chế độ nào. Bật một nút ở vùng thiết lập trước.");
        }
    }

    function xuLyHuyDiem(toaDo) {
        const nut = timNutGanNhat(toaDo, true);

        if (!nut) {
            thongBao("Không có điểm đã tạo nào gần đây. Bấm sát vào điểm cần hủy.");
            return;
        }

        const kho = layDuLieu().nodes.find(function (item) {
            return item.type === "kho";
        });

        if (kho && nut.id === kho.id) {
            thongBao("Không thể ẩn Kho.");
            return;
        }

        BanDo.anDiem(nut.id);
        thongBao("Đã ẩn điểm " + nut.id + ".", "ok");
        capNhatSauThayDoi();
    }

    /* Đồng bộ trạng thái sự cố sang map.js: cả giờ cao điểm và ngập đều bị tránh. */
    function dongBoTrangThaiMap(idCanh) {
        if (loaiSuCo.has(idCanh)) {
            BanDo.datTrangThaiCanh(idCanh, "ngap");
        } else {
            BanDo.xoaTrangThaiCanh(idCanh);
        }
    }

    function xuLyDanhDauCanh(toaDo, loai) {
        const canh = timCanhGanNhat(toaDo);

        if (!canh) {
            thongBao("Không có đoạn đường nào gần đây. Bấm sát vào đoạn đường cần đánh dấu.");
            return;
        }

        const loaiCu = loaiSuCo.get(canh.id);
        const tenLoai = loai === CHE_DO.NGAP ? "ngập lụt" : "giờ cao điểm";

        if (loaiCu === loai) {
            loaiSuCo.delete(canh.id);
            thongBao("Đã bỏ đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".", "ok");
        } else {
            loaiSuCo.set(canh.id, loai);
            thongBao("Đã đánh dấu " + tenLoai + " cho đoạn " + canh.id + ".", "ok");
        }

        dongBoTrangThaiMap(canh.id);
        veLaiSuCo();
        capNhatSauThayDoi();
    }

    /* =========================================================
       4. VẼ DẤU SỰ CỐ LÊN BẢN ĐỒ
       ========================================================= */

    function veLaiSuCo() {
        const svg = laySvg();

        if (!svg) {
            return;
        }

        let nhom = svg.querySelector("#lopSuCo");

        if (!nhom) {
            nhom = document.createElementNS(SVG_NS, "g");
            nhom.setAttribute("id", "lopSuCo");
            nhom.setAttribute("pointer-events", "none");
            svg.appendChild(nhom);
        }

        nhom.replaceChildren();

        const duLieu = layDuLieu();
        const nutTheoId = new Map();
        const canhTheoId = new Map();

        duLieu.nodes.forEach(function (nut) {
            nutTheoId.set(nut.id, nut);
        });

        duLieu.edges.forEach(function (canh) {
            canhTheoId.set(canh.id, canh);
        });

        loaiSuCo.forEach(function (loai, idCanh) {
            const canh = canhTheoId.get(idCanh);

            if (!canh) {
                return;
            }

            const a = nutTheoId.get(canh.a);
            const b = nutTheoId.get(canh.b);

            if (!a || !b) {
                return;
            }

            /* Vẽ theo đường phố thật (nếu tìm được), không nối thẳng hai nút. */
            const diemDuong = (window.KetQua && window.KetQua.diemTheoDuong)
                ? window.KetQua.diemTheoDuong([canh.a, canh.b])
                : [a, b];

            const duong = document.createElementNS(SVG_NS, "polyline");
            duong.setAttribute("points", diemDuong.map(function (p) {
                return p.x + "," + p.y;
            }).join(" "));
            duong.setAttribute("class", "canh-su-co " +
                (loai === CHE_DO.NGAP ? "canh-ngap" : "canh-cao-diem"));

            nhom.appendChild(duong);
        });

        /* Đưa lớp sự cố lên trên tuyến đường vừa vẽ. */
        svg.appendChild(nhom);
    }

    /* =========================================================
       5. TÌM LỘ TRÌNH VÀ ĐẶT LẠI
       ========================================================= */

    function capNhatSauThayDoi() {
        capNhatSoLieu();

        if (window.KetQua && typeof window.KetQua.xoa === "function") {
            window.KetQua.xoa();
        }

        window.dispatchEvent(new CustomEvent("ban-do-thay-doi"));
    }

     function timDuong() {
        if (!window.Thuattoan) {
            thongBao("Chưa nạp js/thuattoan.js.", "loi");
            return;
        }

        const diemNhan = BanDo.layDanhSachDiemChon();

        if (diemNhan.length === 0) {
            thongBao("Hãy tạo và chọn ít nhất một điểm giao hàng.", "loi");

            if (window.KetQua) {
                window.KetQua.hienLoi("Chưa chọn điểm giao hàng nào.");
            }

            return;
        }

        const duLieu = layDuLieu();
        const kho = duLieu.nodes.find(function (nut) {
            return nut.type === "kho";
        });

        if (!kho) {
            thongBao("Dữ liệu bản đồ không có Kho.", "loi");
            return;
        }

        /* Cả đoạn ngập và đoạn cao điểm đều bị bỏ khỏi đồ thị. */
        const canhBiChan = new Set(loaiSuCo.keys());

        const ketQua = window.Thuattoan.timLoTrinh(duLieu, kho.id, diemNhan, {
            canhBiChan: canhBiChan
        });

        /* Tùy chọn quay về Kho: nối thêm chặng từ điểm cuối về Kho, cũng tránh đoạn bị đánh dấu. */
        let canhBaoVe = null;

        if (ketQua.ok && chkQuayVe && chkQuayVe.checked) {
            const diemCuoi = ketQua.khuc[ketQua.khuc.length - 1].den;
            const ve = window.Thuattoan.timDuongNgan(duLieu, diemCuoi, kho.id, {
                canhBiChan: canhBiChan
            });

            if (ve.ok) {
                ketQua.khuc.push({ tu: diemCuoi, den: kho.id, duong: ve.duong });
                ketQua.tongKm += ve.km;
            } else {
                canhBaoVe = "Không tìm được đường về Kho: " + ve.loi;
            }
        }

        if (window.KetQua) {
            window.KetQua.hienTuyen(ketQua);
        }

        veLaiSuCo();

        if (ketQua.ok) {
            let chu = "Đã tính lộ trình qua " + ketQua.khuc.length + " chặng.";

            if (ketQua.khongToiDuoc.length > 0) {
                chu += " Có " + ketQua.khongToiDuoc.length + " điểm không tới được.";
            }

            if (canhBaoVe) {
                chu += " " + canhBaoVe;
            }

            thongBao(chu, "ok");
        } else {
            thongBao(ketQua.loi, "loi");
        }
    }

    function datLai() {
        /* Ẩn toàn bộ điểm đã tạo (anDiem cũng bỏ điểm khỏi danh sách chọn). */
        BanDo.layDanhSachDiemHien().forEach(function (id) {
            BanDo.anDiem(id);
        });

        /* Xóa toàn bộ đánh dấu đoạn đường. */
        loaiSuCo.forEach(function (loai, idCanh) {
            BanDo.xoaTrangThaiCanh(idCanh);
        });
        loaiSuCo.clear();

        BanDo.xoaDuongDi();

        if (window.KetQua) {
            window.KetQua.xoa();
        }

        cheDo = CHE_DO_MAC_DINH;
        BanDo.datCheDo("chonDiem");
        BanDo.dungVaoKho();

        veLaiSuCo();
        capNhatGiaoDien();
        thongBaoTheoCheDo();
        window.dispatchEvent(new CustomEvent("ban-do-thay-doi"));
    }

    /* =========================================================
       6. GẮN SỰ KIỆN VÀ KHỞI ĐỘNG
       ========================================================= */

    function ganSuKien() {
        if (nutTaoDiem) {
            nutTaoDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.TAO_DIEM);
            });
        }

        if (nutHuyDiem) {
            nutHuyDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.HUY_DIEM);
            });
        }

        if (nutCaoDiem) {
            nutCaoDiem.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.CAO_DIEM);
            });
        }

        if (nutNgap) {
            nutNgap.addEventListener("click", function () {
                datCheDoMoi(CHE_DO.NGAP);
            });
        }

        if (nutTimDuong) {
            nutTimDuong.addEventListener("click", timDuong);
        }

        if (nutDatLai) {
            nutDatLai.addEventListener("click", datLai);
        }

        /*
         * Dùng pha capture để chặn map.js kịp thời ở các chế độ không phải
         * tạo điểm. Ở chế độ tạo điểm, sự kiện vẫn đi tiếp để map.js xử lý.
         */
        window.addEventListener("pointerdown", batDauTheoDoi, true);
        window.addEventListener("pointerup", ketThucTheoDoi, true);
        window.addEventListener("pointermove", capNhatDuongRe);
        window.addEventListener("pointermove", capNhatQuangTuyen);
    }

    function dongBoTrangThaiCu() {
        /* Nếu map.js đã có trạng thái cạnh từ trước, đưa vào bộ nhớ của UI. */
        BanDo.layTrangThaiCanh().forEach(function (loai, idCanh) {
            loaiSuCo.set(idCanh, loai === "ngap" ? CHE_DO.NGAP : CHE_DO.CAO_DIEM);
        });
    }

    function theoDoiBanDoNapXong() {
        const khung = document.getElementById("mapZoom");

        if (!khung) {
            return;
        }

        if (laySvg()) {
            veLaiSuCo();
            return;
        }

        const theoDoi = new MutationObserver(function () {
            if (laySvg()) {
                theoDoi.disconnect();
                veLaiSuCo();
            }
        });

        theoDoi.observe(khung, { childList: true });
    }

    /* API cho ketqua.js dùng lại. */
    window.ThietLap = {
        veLaiSuCo: veLaiSuCo
    };

    dongBoTrangThaiCu();
    ganSuKien();
    capNhatGiaoDien();
    thongBaoTheoCheDo();
    theoDoiBanDoNapXong();

})();